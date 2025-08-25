import {
  CollectionGraphql,
  MerchantService,
  CollectionController,
  CollectionService,
  ProductGraphql,
  BulkOperationService,
  BulkOperationGraphql,
} from "@acme/core/server";

import prisma from "@acme/db";
import { BulkOperationStatus } from "@prisma/client";
import {
  retrieveAdminGraphqlID,
  retrieveAdminLegacyResourceID,
  getMinimalShopifyMoves, 
  ProductUtils,
} from "@acme/core";
import axios from "axios";
import readline from "node:readline";
// import { Readable } from "node:stream";
// import { createGunzip } from "node:zlib";
// import { setImmediate as yieldNow } from "node:timers/promises";
import { PassThrough } from "node:stream";

// Create singleton for stateless services
const collectionService = new CollectionService();
const merchantService = new MerchantService();

export class BulkOperationWebhookHandler {
  constructor({ payload, shop, admin }) {
    this.payload = payload;
    this.shop = shop;
    this.admin = admin;

    this.collectionService = collectionService;
    this.merchantService = merchantService;

    this.collectionGraphql = new CollectionGraphql(admin);
    this.collectionController = new CollectionController(admin, shop);
    this.bulkOperationService = new BulkOperationService(admin);
    this.bulkOperationGraphql = new BulkOperationGraphql(admin);
    this.productGraphql = new ProductGraphql(admin);
  }

  cleanup() {
    // Clear references to help GC
    this.payload = null;
    this.admin = null;
    this.collectionGraphql = null;
    this.collectionController = null;
    this.bulkOperationService = null;
    this.bulkOperationGraphql = null;
    this.productGraphql = null;
    // Keep service references since they might be reused
    // this.collectionService = null;
    // this.merchantService = null;
  }

  async handle(topic) {
    switch (topic) {
      case "BULK_OPERATIONS_FINISH":
        return this.handleBulkOperationFinish();
      default:
        throw new Error(`Unhandled topic: ${topic}`);
    }
  }

  async handleBulkOperationFinish() {
    const {
      admin_graphql_api_id,
      status: rawStatus,
      error_code: rawErrorCode,
      completed_at,
    } = this.payload;

    const bulkOperationID = retrieveAdminLegacyResourceID(
      admin_graphql_api_id,
      "BulkOperation",
    );
    const status = rawStatus.toUpperCase();
    const errorCode = rawErrorCode?.toUpperCase();

    if (errorCode) {
      await this.bulkOperationService.updateBulkOperation({
        id: bulkOperationID,
        data: { status, error_code: errorCode },
      });
    }

    const { bulkOperation } =
      await this.bulkOperationGraphql.fetchBulkOperationStatus(
        admin_graphql_api_id,
      );

    const { url, objectCount } = bulkOperation;

    if (!url) {
      await prisma.bulkOperation.update({
        where: { operationID: bulkOperationID },
        data: { status, completedAt: completed_at, errorCode },
      });
      return;
    }

    const bulkOperationRecord = await prisma.bulkOperation.findUnique({
      where: { operationID: bulkOperationID },
    });

    if (!bulkOperationRecord) return;

    const { jobData } = bulkOperationRecord;
    const { collectionID, selectedLocations } = jobData;

    // Update and exit early on failure
    if (status !== BulkOperationStatus.COMPLETED || errorCode) {
      await prisma.bulkOperation.update({
        where: { operationID: bulkOperationID },
        data: { status, completedAt: completed_at, errorCode, objectCount },
      });
      return;
    }

    

    // const { data: streamData } = await axios.get(url, {
    //   responseType: "stream",
    // });
    // const rl = readline.createInterface({
    //   input: streamData.pipe(new PassThrough()),
    //   crlfDelay: Infinity,
    // });

    // const parentLines = [],
    //   variantLines = [];

    // for await (const line of rl) {
    //   if (!line.trim()) continue;
    //   const jsonLine = JSON.parse(line);
    //   (jsonLine.__parentId ? variantLines : parentLines).push(jsonLine);
    // }

    // const mid = Math.floor(parentLines.length / 2);
    // let overrideSortingArray = parentLines.slice(0, mid);
    // const defaultSortingArray = parentLines.slice(mid);

    // // Group variants under parents for overrideSortingArray
    // const parentMap = Object.fromEntries(
    //   overrideSortingArray.map((p) => [p.id, { ...p, variants: [] }]),
    // );
    // for (const variant of variantLines) {
    //   const parent = parentMap[variant.__parentId];
    //   if (parent) parent.variants.push(variant);
    // }
    // overrideSortingArray = Object.values(parentMap);

    // const merchant = await this.merchantService.getMerchant({
    //   shop: this.shop,
    //   useCache: false,
    // });
    // const { continueSellingAsOOS, excludePushDown, excludePushDownTags } =
    //   merchant;

    // // Store Should Push Down Items
    // const instockItems = overrideSortingArray.filter(
    //   (p) =>
    //     !ProductUtils.shouldPushDown(
    //       p,
    //       continueSellingAsOOS,
    //       excludePushDown,
    //       excludePushDownTags,
    //       selectedLocations || [],
    //     ),
    // );

    // const OOSItems = overrideSortingArray.filter((p) =>
    //   ProductUtils.shouldPushDown(
    //     p,
    //     continueSellingAsOOS,
    //     excludePushDown,
    //     excludePushDownTags,
    //     selectedLocations || [],
    //   ),
    // );

    // overrideSortingArray = [...instockItems, ...OOSItems];

    // await this.collectionService.updateCollection(collectionID, {
    //   OOSCount: OOSItems.length,
    // });

    // const minimalMoves = getMinimalShopifyMoves(
    //   overrideSortingArray,
    //   defaultSortingArray,
    // );

    // const info = [];

    // // Add product title to the moves
    // for (const move of minimalMoves) {
    //   const productID = retrieveAdminLegacyResourceID(move.id, "Product");
    //   const product = overrideSortingArray.find(
    //     (p) => p.legacyResourceId === productID,
    //   );
    //   if (product) {
    //     info.push({
    //       ...move,
    //       ...product,
    //     });
    //   }
    // }

    // if (minimalMoves.length > 0) {
    //   await this.collectionGraphql.reorderCollectionProducts({
    //     id: retrieveAdminGraphqlID(collectionID, "Collection"),
    //     moves: minimalMoves,
    //   });
    // }

    await prisma.bulkOperation.update({
      where: { operationID: bulkOperationID },
      data: {
        status,
        completedAt: completed_at,
        errorCode,
        objectCount: Number(objectCount),
      },
    });

    return;
  }
}
