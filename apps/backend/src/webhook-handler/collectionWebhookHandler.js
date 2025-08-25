import {
  // getLogger,
  CollectionGraphql,
  MerchantService,
  CollectionController,
  CollectionService,
  ProductGraphql,
} from "@acme/core/server";

import prisma from "@acme/db";

import { enqueueBulkOperationForPushDown } from "@acme/queue";
import { CollectionSorting } from "@prisma/client";


// Create singletons for stateless services
const collectionService = new CollectionService();
const merchantService = new MerchantService();

export class CollectionWebhookHandler {
  constructor({ payload, shop, admin }) {
    this.payload = payload;
    this.shop = shop;
    this.admin = admin;

    this.collectionService = collectionService;
    this.merchantService = merchantService;

    this.collectionGraphql = new CollectionGraphql(admin);
    this.collectionController = new CollectionController(admin, shop);
    this.productGraphql = new ProductGraphql(admin);
  }

  cleanup() {
    // Clear references to help GC
    this.payload = null;
    this.shop = null;
    this.admin = null;
    this.collectionService = null;
    this.merchantService = null;
    this.collectionGraphql = null;
    this.collectionController = null;
    this.productGraphql = null;
  }

  async handle(topic) {
    switch (topic) {
      case "COLLECTIONS_UPDATE":
        return this.handleCollectionUpdate();
      case "COLLECTIONS_CREATE":
        return this.handleCollectionCreate();
      case "COLLECTIONS_DELETE":
        return this.handleCollectionDelete();
      default:
        throw new Error(`Unhandled topic: ${topic}`);
    }
  }

  async handleCollectionCreate() {
    const { id, title } = this.payload;

    const merchant = await this.merchantService.getMerchant({
      shop: this.shop,
      useCache: false,
    });
    const { collection } = await this.collectionGraphql.getCollection({
      id,
      fields: `
            id
            title
            handle
            productsCount { count } 
            sortOrder 
            updatedAt
        `,
    });

    await prisma.$transaction(async (tx) => {
      await tx.collection.upsert({
        where: {
          collectionID: id.toString(),
        },
        create: {
          collectionID: id.toString(),
          title: collection.title,
          handle: collection.handle,
          currentSorting: collection.sortOrder,
          productsCount: collection.productsCount.count,
          updatedAt: collection.updatedAt,
          shop: this.shop,
        },
        update: {
          title: collection.title,
          handle: collection.handle,
          currentSorting: collection.sortOrder,
          productsCount: collection.productsCount.count,
          updatedAt: collection.updatedAt,
          shop: this.shop,
        },
      });

      const collectionCount = await tx.collection.count({
        where: { shop: this.shop },
      });
      await tx.merchant.upsert({
        where: { shop: this.shop },
        update: { collectionCount },
        create: {
          shop: this.shop,
          collectionCount,
        },
      });
    });

    console.log(`✅ Sucessfully created collection ${title}.`);

    if (merchant.autoEnableCollection) {
      await this.collectionController.enableCollections([id]);
    }
  }

  async handleCollectionDelete() {
    const { id } = this.payload;
    await prisma.$transaction(async (tx) => {
      await tx.collection.deleteMany({
        where: {
          collectionID: id.toString(),
        },
      });
      const total = await tx.collection.count({ where: { shop: this.shop } });

      await tx.merchant.upsert({
        where: { shop: this.shop },
        update: { collectionCount: total },
        create: {
          shop: this.shop,
          collectionCount: total,
        },
      });
    });

    console.log(`✅ Sucessfully deleted collection ${id}.`);
  }

  async handleCollectionUpdate() {
    const { id, handle, title, published_at, updated_at, sort_order } =
      this.payload;

    let conditionalData = {
      isNewProductAdded: false,
      pushOrSortRequired: false,
      isDisableRequired: false,
    };

    let collectionRecord = await this.collectionService.getCollection({
      id: id.toString(),
      useCache: false,
    });

    if (collectionRecord) {
      if (new Date(collectionRecord.updated_at) > new Date(updated_at)) {
        return;
      }
    }

    const { productsCount: graphqlProductCount } =
      await this.productGraphql.getProductsCount({
        searchQuery: `collection_id:${id}`,
      });

    let updateData = this.getUpdateData(
      this.payload,
      collectionRecord,
      graphqlProductCount,
      conditionalData,
    ); // Prepare update data
    let createData = this.getCreateData(
      { ...this.payload, shop: this.shop },
      graphqlProductCount,
    ); // Prepare create data

    if (
      collectionRecord.isActive &&
      collectionRecord.currentSorting !== CollectionSorting.MANUAL &&
      conditionalData.isNewProductAdded
    ) {
      conditionalData.pushOrSortRequired = true;
    }

    // Perform upsert operation
    collectionRecord = await prisma.collection.upsert({
      where: { collectionID: id.toString() },
      update: updateData,
      create: createData,
    });

    if (conditionalData.pushDownRequired) {
      await enqueueBulkOperationForPushDown({ shop: this.shop, collectionID: id });
    }

    // console.log(`✅ Sucessfully updated collection ${id} ${title}.`);
  }

  getUpdateData(
    payload,
    existingCollection,
    graphqlCollectionProductsCount,
    conditionalData,
  ) {
    const { title, handle, sort_order, updated_at } = payload;

    const updateData = {};

    // Update title and handle if they have changed
    if (existingCollection.title !== title) {
      updateData.title = title;
    }
    if (existingCollection.handle !== handle) {
      updateData.handle = handle;
    }

    // Format the sort order and check against the predefined MANUAL sorting
    const formattedSortOrder = sort_order.replaceAll("-", "_").toUpperCase();

    // Disable collection and update sorting rule if user changes the sort order manually
    if (existingCollection.isActive && formattedSortOrder !== "MANUAL") {
      conditionalData.isDisableRequired = true;
      updateData.isActive = false;
      updateData.currentSorting = formattedSortOrder;
    }

    // Update sorting rule if collection is inactive and sorting not same as existing sorting rule
    if (
      !existingCollection.isActive &&
      formattedSortOrder !== existingCollection.currentSorting
    ) {
      // logger.debug(
      //   `Update sorting rule if collection is inactive and sorting not same as existing sorting rule`,
      // );
      updateData.currentSorting = formattedSortOrder;
    }

    if (existingCollection.productsCount != graphqlCollectionProductsCount) {
      updateData.productsCount = graphqlCollectionProductsCount;
    }

    if (
      Number(existingCollection.productsCount) <
      Number(graphqlCollectionProductsCount)
    ) {
      conditionalData.isNewProductAdded = true;
    }

    updateData.updatedAt = updated_at;

    return updateData;
  }

  getCreateData(payload, graphqlProductCount) {
    const { id, title, handle, sort_order, updated_at, shop } = payload;

    const createData = {
      collectionID: id.toString(),
      title: title,
      handle: handle,
      isActive: true, // Assuming new collections are active by default
      currentSorting: sort_order.replaceAll("-", "_").toUpperCase(),
      productsCount: graphqlProductCount,
      updatedAt: updated_at,
      shop: shop,
    };

    return createData;
  }

  // async schedulePushDownJobs(productId) {
  //   const { collections } = await this.collectionGraphql.getCollections({
  //     searchQuery: `product_id:${productId}`,
  //     fields: `legacyResourceId`,
  //   });

  //   const collectionIds = collections.map((c) => c.legacyResourceId);
  //   const activeCollections = await prisma.collection.findMany({
  //     where: { collectionID: { in: collectionIds }, isActive: true },
  //   });

  //   if (!activeCollections.length) {
  //     logger.debug(`No active collections found for product ${productId}`);
  //     return;
  //   }

  //   const jobs = activeCollections.map(({ collectionID }) => ({
  //     name: JOB_NAMES.PUSH_DOWN,
  //     data: { shop: this.shop, collectionID },
  //     opts: {
  //       deduplication: { id: `PushDown:${collectionID}`, ttl: 4000 },
  //       delay: 4000,
  //     },
  //   }));

  //   await bulkOperationQueue.addBulk(jobs);
  //   console.log(
  //     `Scheduled ${jobs.length} push down jobs for product ${productId}`,
  //   );
  // }

  // async scheduleHideProductJobs(productId, hideAfterDays) {
  //   const delay = hideAfterDays * 24 * 60 * 60 * 1000;
  //   await hideProductQueue.add(
  //     "hide-product",
  //     {
  //       shop: this.shop,
  //       productID: productId,
  //     },
  //     {
  //       delay,
  //       attempts: 3,
  //       backoff: { type: "exponential", delay: 2000 },
  //       removeOnComplete: { age: 1800, count: 10 },
  //       removeOnFail: { age: 86400 },
  //     },
  //   );

  //   await this.productService.updateProduct(productId, {
  //     scheduledHidden: new Date(),
  //   });
  //   logger.debug(
  //     `Scheduled hiding for product ${productId} after ${hideAfterDays} days`,
  //   );
  // }

  // async scheduleSortingJobs(collectionID) {
  //   if (!collectionID) {
  //     console.error(`Collection ID is required to schedule sorting jobs`);
  //     return;
  //   }

  //   await hideProductQueue.add(
  //     "hide-product",
  //     {
  //       shop: this.shop,
  //       productID: productId,
  //     },
  //     {
  //       delay,
  //       attempts: 3,
  //       backoff: { type: "exponential", delay: 2000 },
  //       removeOnComplete: { age: 1800, count: 10 },
  //       removeOnFail: { age: 86400 },
  //     },
  //   );

  //   await bulkOperationQueue.addBulk(jobs);
  //   console.log(
  //     `Scheduled ${jobs.length} push down jobs for product ${productId}`,
  //   );
  // }
}
