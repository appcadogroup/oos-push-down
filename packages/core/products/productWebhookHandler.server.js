import {
  // getLogger,
  CollectionGraphql,
  MerchantService,
  ProductService,
  ProductGraphql,
  SubscriptionController,
} from "@acme/core/server";

import {
  SubscriptionUtils,
  retrieveAdminGraphqlID,
  isNotEmptyStringAndNull,
  convertStringListToArray,
  ProductUtils,
} from "../index.js";
import prisma from "@acme/db";
import {
  JOB_NAMES,
} from "../jobs/constants.js";
import { bulkOperationQueue, hideProductQueue } from "../jobs/queues/index.js";

// const logger = getLogger('webhooks/products');

export class ProductWebhookHandler {
  constructor({ payload, shop, admin }) {
    this.payload = payload;
    this.shop = shop;
    this.admin = admin;

    this.productService = new ProductService();
    this.merchantService = new MerchantService();
    this.productGraphql = new ProductGraphql(admin);
    this.collectionGraphql = new CollectionGraphql(admin);
    this.subscriptionController = new SubscriptionController();
  }

  async handle(topic) {
    switch (topic) {
      case "PRODUCTS_UPDATE":
        return this.handleProductUpdate();
      case "PRODUCTS_CREATE":
        return this.handleProductCreate();
      case "PRODUCTS_DELETE":
        return this.handleProductDelete();
      default:
        throw new Error(`Unhandled topic: ${topic}`);
    }
  }

  async handleProductCreate() {
    const {
      id,
      title,
      handle,
      created_at,
      updated_at,
      status,
      tags,
      published_at,
    } = this.payload;
    const productTags = convertStringListToArray(tags);
    const productData = {
      title: title,
      handle: handle,
      status: status.toUpperCase(),
      createdAt: created_at,
      updatedAt: updated_at,
      publishedAt: published_at,
      tags: productTags,
    };

    await prisma.$transaction(async (tx) => {
      await tx.product.create({
        data: {
          ...productData,
          productID: id.toString(),
          shop: this.shop,
        },
      });
      const productCount = await tx.product.count({
        where: {
          shop: this.shop,
        },
      });
      await tx.merchant.update({
        where: { shop: this.shop },
        data: { productCount: productCount },
      });
    });

    // logger.info(`✅ Sucessfully create product and update product count.`);
  }

  async handleProductDelete() {
    const { id } = this.payload;

    await prisma.$transaction(async (tx) => {
      await tx.product.deleteMany({
        where: { productID: id },
      });
      const productCount = await tx.product.count({
        where: {
          shop: this.shop,
        },
      });
      await tx.merchant.update({
        where: { shop: this.shop },
        data: { productCount: productCount },
      });
    });

    // logger.info(`✅ Sucessfully delete product ${id}.`);
  }

  async handleProductUpdate() {
    const {
      id,
      title,
      handle,
      created_at,
      updated_at,
      published_at,
      status,
      tags,
      variants,
      variant_gids,
    } = this.payload;

    const productTags = convertStringListToArray(tags);
    const variantsCount = variant_gids.length;
    const hasContinueSelling = variants.some(
      (v) => v.inventory_policy === "continue",
    );
    const hasOutOfStockVariants = variants.some(
      (v) => v.inventory_quantity <= 0,
    );
    const allOutOfStockVariants = variants.every(
      (v) => v.inventory_quantity <= 0,
    );

    const productStatus = status.toUpperCase();

    let productRecord = await this.productService.getProduct({
      id,
      useCache: false,
    });

    if (!productRecord) {
      productRecord = await this.productService.upsertProduct(id, {
        title,
        handle,
        updatedAt: updated_at,
        publishedAt: published_at,
        createdAt: created_at,
        status: productStatus,
        tags: productTags,
        variantsCount,
        hasContinueSelling,
        hasOutOfStockVariants,
        shop: this.shop,
      });
    }

    const merchantRecord = await this.merchantService.getMerchant({
      shop: this.shop,
      useCache: false,
    });

    const isOverLimit = SubscriptionUtils.isOverPlanLimit(
      merchantRecord,
      merchantRecord.activePlan,
    );

    let OOS = allOutOfStockVariants
      ? hasContinueSelling
        ? merchantRecord.continueSellingAsOOS
        : true
      : false;

    if (merchantRecord.selectedLocations?.length) {
      const locationInventoryQuery =
        ProductUtils.getLocationsInventoryLevelQuery(
          merchantRecord.selectedLocations,
        );
      const { productVariants } = await this.productGraphql.getProductVariants({
        searchQuery: `product_id:${id}`,
        fields: `
          inventoryItem {
            tracked
            ${locationInventoryQuery}
          }
        `,
      });
      if (productVariants) {
        OOS = ProductUtils.isOOSByLocations(
          productVariants,
          merchantRecord.selectedLocations,
        );
      }
    }

    const productRecordTags =
      (Array.isArray(productRecord?.tags) && productRecord?.tags) || [];
    const isTagsSame =
      productTags.length === productRecordTags.length &&
      productTags.every((tag) => productRecordTags.includes(tag));

    const isUpdated =
      productRecord.status !== productStatus ||
      productRecord.handle !== handle ||
      !isTagsSame ||
      productRecord.OOS !== OOS ||
      productRecord.variantsCount !== variantsCount ||
      productRecord.hasContinueSelling !== hasContinueSelling ||
      productRecord.hasOutOfStockVariants !== hasOutOfStockVariants;

    if (!isUpdated) {
      // logger.debug(`Product ${id} not updated. Skipping...`);
      return;
    }

    let OOSAt = null;
    if (productRecord.OOS !== OOS) {
      OOSAt = OOS ? this.payload.updatedAt : null;
    }

    await this.updateProductRecord({
      id,
      productStatus,
      handle,
      updated_at,
      published_at,
      productTags,
      variantsCount,
      hasContinueSelling,
      hasOutOfStockVariants,
      OOS,
      OOSAt,
    });

    if (productRecord.OOS !== OOS) {
      // logger.info(`Product ${id} OOS status changed to ${OOS}.`);

      if (isOverLimit) {
        // logger.debug(`Product ${id} sorting skipped due to plan limits.`);
        return;
      }

      OOS
        ? await this.handleProductOutOfStock(productTags, productRecord)
        : await this.handleProductInStock(productRecord);
    }
  }

  async updateProductRecord({
    id,
    productStatus,
    handle,
    updated_at,
    published_at,
    productTags,
    variantsCount,
    hasContinueSelling,
    hasOutOfStockVariants,
    OOS,
    OOSAt,
  }) {
    await this.productService.updateProduct(id, {
      status: productStatus,
      handle,
      updatedAt: updated_at,
      publishedAt: published_at,
      tags: productTags,
      variantsCount,
      hasOutOfStockVariants,
      hasContinueSelling,
      OOS: OOS,
      OOSAt: OOSAt,
    });
  }

  async handleProductOutOfStock(productTags, productRecord) {
    const merchant = await this.merchantService.getMerchant({
      shop: this.shop,
      useCache: false,
    });
    const {
      excludePushDown,
      excludePushDownTags,
      tagOOSProduct,
      OOSProductTag,
      enableHiding,
      hidingChannel,
      hideAfterDays,
      excludeHiding,
      excludeHideTags,
    } = merchant;

    // Push down
    if (
      !(
        excludePushDown &&
        productTags.some((tag) => excludePushDownTags.includes(tag))
      )
    ) {
      await this.schedulePushDownJobs(productRecord.productID);
    }

    // Add OOS tag
    if (tagOOSProduct && isNotEmptyStringAndNull(OOSProductTag)) {
      await this.productGraphql.addProductTags({
        id: productRecord.productID,
        tags: OOSProductTag,
      });
    }

    // Hide
    if (
      enableHiding &&
      !(
        excludeHiding &&
        productTags.some((tag) => excludeHideTags.includes(tag))
      )
    ) {
      await this.scheduleHideProductJobs(
        productRecord.productID,
        hideAfterDays,
      );
      // logger.debug(
      //   `Scheduled hiding for product ${productRecord.productID} after ${hideAfterDays} days`,
      // );
    }
  }

  async handleProductInStock(productRecord) {
    const merchant = await this.merchantService.getMerchant({
      shop: this.shop,
      useCache: false,
    });
    const {
      tagOOSProduct,
      tagHiddenProduct,
      hiddenProductTag,
      OOSProductTag,
      republishHidden,
      hidingChannel,
    } = merchant;

    // Remove OOS tag
    if (tagOOSProduct && isNotEmptyStringAndNull(OOSProductTag)) {
      await this.productGraphql.removeProductTags({
        id: productRecord.productID,
        tags: OOSProductTag,
      });
      // logger.info(`Removed OOS tag from product ${productRecord.productID}`);
    }

    if (tagHiddenProduct && isNotEmptyStringAndNull(hiddenProductTag)) {
      const removeTagResult = await this.productGraphql.removeProductTags({
        id: productRecord.productID,
        tags: hiddenProductTag,
      });

      // logger.info(`Removed hidden tag from product`, {
      //   result: removeTagResult,
      // });
    }

    // Re-publish if previously hidden
    if (republishHidden && productRecord.hiddenAt) {
      if (hidingChannel === "ONLINE_STORE") {
        const publication = await this.productService.getFirstPublications({
          where: { shop: this.shop },
        });
        const result = await this.productGraphql.publishProduct({
          id: productRecord.productID,
          productPublications: [
            {
              publicationId: retrieveAdminGraphqlID(
                publication.publicationID,
                "Publication",
              ),
            },
          ],
        });

        // logger.info(
        //   `Republished product ${productRecord.productID} on online store channel`,
        //   { result },
        // );
      } else {
        await this.productGraphql.updateProduct({
          id: productRecord.productID,
          data: { status: "ACTIVE" },
        });
      }
      await this.productService.updateProduct(productRecord.productID, {
        hiddenAt: null,
        scheduledHidden: null,
      });
      // logger.info(`Republished product ${productRecord.productID}`);
    }

    await this.schedulePushDownJobs(productRecord.productID);
  }

  async schedulePushDownJobs(productId) {
    const { collections } = await this.collectionGraphql.getCollections({
      searchQuery: `product_id:${productId}`,
      fields: `legacyResourceId`,
    });

    const collectionIds = collections.map((c) => c.legacyResourceId);
    const activeCollections = await prisma.collection.findMany({
      where: { collectionID: { in: collectionIds }, isActive: true },
    });

    if (!activeCollections.length) {
      // logger.debug(`No active collections found for product ${productId}`);
      return;
    }

    const jobs = activeCollections.map(({ collectionID }) => ({
      name: JOB_NAMES.PUSH_DOWN,
      data: { shop: this.shop, collectionID },
      opts: {
        deduplication: { id: `PushDown:${collectionID}`, ttl: 4000 },
        delay: 4000,
      },
    }));

    await bulkOperationQueue.addBulk(jobs);
    // logger.info(
    //   `Scheduled ${jobs.length} push down jobs for product ${productId}`,
    // );
  }

  async scheduleHideProductJobs(productId, hideAfterDays) {
    const delay = hideAfterDays * 24 * 60 * 60 * 1000;
    await hideProductQueue.add(
      "hide-product",
      {
        shop: this.shop,
        productID: productId,
      },
      {
        delay,
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { age: 1800, count: 10 },
        removeOnFail: { age: 86400 },
      },
    );

    await this.productService.updateProduct(productId, {
      scheduledHidden: new Date(),
    });
    // logger.debug(
    //   `Scheduled hiding for product ${productId} after ${hideAfterDays} days`,
    // );
  }

  async scheduleSortingJobs(collectionID) {
    if (!collectionID) {
      // logger.error(`Collection ID is required to schedule sorting jobs`);
      return;
    }

    await hideProductQueue.add(
      "hide-product",
      {
        shop: this.shop,
        productID: productId,
      },
      {
        delay,
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { age: 1800, count: 10 },
        removeOnFail: { age: 86400 },
      },
    );

    await bulkOperationQueue.addBulk(jobs);
    // logger.info(
    //   `Scheduled ${jobs.length} push down jobs for product ${productId}`,
    // );
  }
}
