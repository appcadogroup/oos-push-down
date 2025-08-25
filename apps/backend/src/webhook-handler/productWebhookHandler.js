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
} from "@acme/core";
import prisma from "@acme/db";
import {
  enqueueBulkOperationForPushDownMany,
  enqueueHideProduct,
} from "@acme/queue";

// Create singletons for stateless services
const productService = new ProductService();
const merchantService = new MerchantService();
const subscriptionController = new SubscriptionController();

export class ProductWebhookHandler {
  constructor({ payload, shop, admin }) {
    this.payload = payload;
    this.shop = shop;
    this.admin = admin;

    // Reuse singleton services
    this.productService = productService;
    this.merchantService = merchantService;
    this.subscriptionController = subscriptionController;

    this.productGraphql = new ProductGraphql(admin);
    this.collectionGraphql = new CollectionGraphql(admin);
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

    // console.log(`✅ Sucessfully create product and update product count.`);
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

    // console.log(`✅ Sucessfully delete product ${id}.`);
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

    console.log(`Handling product update for ${id}`);

    const productTags = convertStringListToArray(tags);
    const variantsCount = variant_gids.length;
    const hasContinueSelling = variants.some(
      (v) => v.inventory_policy === "continue"
    );
    const hasOutOfStockVariants = variants.some(
      (v) => v.inventory_quantity <= 0
    );
    const allOutOfStockVariants = variants.every(
      (v) => v.inventory_quantity <= 0
    );

    const productStatus = status.toUpperCase();

    let productRecord = await this.productService.getProduct({
      id,
      useCache: false,
    });

    // console.log(`Product record found:`, { productRecord });

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
      merchantRecord.activePlan
    );

    let OOS = allOutOfStockVariants
      ? hasContinueSelling
        ? merchantRecord.continueSellingAsOOS
        : true
      : false;

    if (merchantRecord.selectedLocations?.length) {
      const locationInventoryQuery =
        ProductUtils.getLocationsInventoryLevelQuery(
          merchantRecord.selectedLocations
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
          merchantRecord.selectedLocations
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
      console.log(`Product ${id} not updated. Skipping...`);
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
      console.log(`Product ${id} OOS status changed to ${OOS}.`);

      if (isOverLimit) {
        console.log(`Product ${id} sorting skipped due to plan limits.`);
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
    console.log(`Handling product out of stock: ${productRecord.productID}`);
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
      // Deprecated - Replaced with push down directly
      //   console.log(
      //     `Scheduling push down jobs for product ${productRecord.productID}`
      //   );
      //   await this.schedulePushDownJobs(productRecord.productID);

      console.log(`Pushing down product ${productRecord.productID}`);
      await this.pushDownProduct(productRecord.productID);
      // logger.debug(
      //   `Scheduled push down jobs for product ${productRecord.productID}`
      // );
    }

    // Add OOS tag
    if (tagOOSProduct && isNotEmptyStringAndNull(OOSProductTag)) {
      console.log(`Adding OOS tag to product ${productRecord.productID}`);
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
      console.log(`Scheduling hiding for product ${productRecord.productID}`);
      await this.scheduleHideProductJobs(
        productRecord.productID,
        hideAfterDays
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
      // console.log(`Removed OOS tag from product ${productRecord.productID}`);
    }

    if (tagHiddenProduct && isNotEmptyStringAndNull(hiddenProductTag)) {
      const removeTagResult = await this.productGraphql.removeProductTags({
        id: productRecord.productID,
        tags: hiddenProductTag,
      });

      console.log(`Removed hidden tag from product`, {
        result: removeTagResult,
      });
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
                "Publication"
              ),
            },
          ],
        });

        console.log(
          `Republished product ${productRecord.productID} on online store channel`,
          { result }
        );
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
    }

    await this.schedulePushDownJobs(productRecord.productID);
  }

  async pushDownProduct(productId) {
    const { collections } = await this.collectionGraphql.getCollections({
      searchQuery: `product_id:${productId}`,
      fields: `legacyResourceId`,
    });
    const collectionIds = collections.map((c) => c.legacyResourceId);
    const activeCollections = await prisma.collection.findMany({
      where: { collectionID: { in: collectionIds }, isActive: true },
    });

    if (!activeCollections.length) {
      console.log(`No active collections found for product ${productId}`);
      return;
    }

    // Push down product to active collections
    for (const collection of activeCollections) {
      const moves = [
        {
          id: retrieveAdminGraphqlID(productId, "Product"),
          newPosition: String(999999),
        },
      ];
      const { reorderCollectionProducts, errors } = await this.collectionGraphql.reorderCollectionProducts({
        id: retrieveAdminGraphqlID(collection.collectionID, "Collection"),
        moves: moves,
      });

      console.log(`Pushed down product ${productId} in collection ${collection.collectionID}`);
    }
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
      console.log(`No active collections found for product ${productId}`);
      return;
    }

    // 3) Batch push-down (efficient, concurrency-capped)
    const jobs = await enqueueBulkOperationForPushDownMany(
      this.shop,
      activeCollections.map(({ collectionID }) => collectionID)
    );

    console.log(
      `Scheduled ${jobs.length} push down jobs for product ${productId}`
    );
  }

  async scheduleHideProductJobs(productId, hideAfterDays) {
    const delay = hideAfterDays * 24 * 60 * 60 * 1000;
    await enqueueHideProduct(this.shop, productId, { delayMs: delay });

    await this.productService.updateProduct(productId, {
      scheduledHidden: new Date(),
    });
    console.log(
      `Scheduled hiding for product ${productId} after ${hideAfterDays} days`
    );
  }

  // =============. Deprecated ==============
  // ----- Add push down jobs
  // const jobs = activeCollections.map(({ collectionID }) => ({
  //   name: JOB_NAMES.PUSH_DOWN,
  //   data: { shop: this.shop, collectionID },
  //   opts: {
  //     deduplication: { id: `PushDown:${collectionID}`, ttl: 4000 },
  //     delay: 4000,
  //   },
  // }));
  // await bulkOperationQueue.addBulk(jobs);

  // ----- Add hide product jobs
  // await hideProductQueue.add(
  //   "hide-product",
  //   {
  //     shop: this.shop,
  //     productID: productId,
  //   },
  //   {
  //     delay,
  //     attempts: 3,
  //     backoff: { type: "exponential", delay: 2000 },
  //     removeOnComplete: { age: 1800, count: 10 },
  //     removeOnFail: { age: 86400 },
  //   },
  // );
}
