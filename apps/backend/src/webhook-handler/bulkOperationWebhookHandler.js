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
export class BulkOperationWebhookHandler {
  constructor({ payload, shop, admin }) {
    this.payload = payload;
    this.shop = shop;
    this.admin = admin;

    this.collectionGraphql = new CollectionGraphql(admin);
    this.collectionController = new CollectionController(admin, shop);
    this.bulkOperationService = new BulkOperationService(admin);
    this.bulkOperationGrpahql = new BulkOperationGraphql(admin);
    this.collectionService = new CollectionService();
    this.productGraphql = new ProductGraphql(admin);
    this.merchantService = new MerchantService();
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
    // const {
    //   admin_graphql_api_id,
    //   status: rawStatus,
    //   error_code: rawErrorCode,
    //   completed_at,
    // } = this.payload;

    // const bulkOperationID = retrieveAdminLegacyResourceID(
    //   admin_graphql_api_id,
    //   "BulkOperation"
    // );
    // const status = rawStatus.toUpperCase();
    // const errorCode = rawErrorCode?.toUpperCase();

    // if (errorCode) {
    //   await this.bulkOperationService.updateBulkOperation({
    //     id: bulkOperationID,
    //     data: { status, error_code: errorCode },
    //   });
    // }

    // const { bulkOperation } =
    //   await this.bulkOperationGrpahql.fetchBulkOperationStatus(
    //     admin_graphql_api_id
    //   );
    // const { url, objectCount } = bulkOperation || {};

    // // No file URL: just finalize record
    // if (!url) {
    //   await prisma.bulkOperation.update({
    //     where: { operationID: bulkOperationID },
    //     data: { status, completedAt: completed_at, errorCode },
    //   });
    //   return;
    // }

    // const bulkOperationRecord = await prisma.bulkOperation.findUnique({
    //   where: { operationID: bulkOperationID },
    // });
    // if (!bulkOperationRecord) return;

    // const { jobData } = bulkOperationRecord;
    // const { collectionID, selectedLocations } = jobData;

    // // Update & exit early unless completed and error-free
    // if (status !== BulkOperationStatus.COMPLETED || errorCode) {
    //   await prisma.bulkOperation.update({
    //     where: { operationID: bulkOperationID },
    //     data: { status, completedAt: completed_at, errorCode, objectCount },
    //   });
    //   return;
    // }

    // // Fetch merchant flags once
    // const merchant = await this.merchantService.getMerchant({
    //   shop: this.shop,
    //   useCache: false,
    // });
    // const { continueSellingAsOOS, excludePushDown, excludePushDownTags } =
    //   merchant;

    // // ---- Stream & build structures incrementally ----
    // const res = await axios.get(url, { responseType: "stream" });
    // let input = Readable.from(res.data);
    // const enc = (res.headers?.["content-encoding"] || "").toLowerCase();
    // if (enc.includes("gzip")) input = input.pipe(createGunzip());

    // const rl = readline.createInterface({ input, crlfDelay: Infinity });

    // // We'll keep only what we truly need:
    // // - defaultOrder: original parent order (for target order)
    // // - parentMap: parent by id with attached variants
    // const parentMap = new Map(); // id -> { id, handle, title, legacyResourceId, updatedAt, variants: [] }
    // const defaultOrder = []; // array of parent ids in original order

    // // We may see variants before parents; buffer them then attach later.
    // const variantsByParent = new Map(); // parentId -> [variant...]

    // let processed = 0;
    // for await (const line of rl) {
    //   if (!line) continue;
    //   const obj = JSON.parse(line);

    //   if (obj.__parentId) {
    //     // variant
    //     const bucket = variantsByParent.get(obj.__parentId);
    //     if (bucket) bucket.push(obj);
    //     else variantsByParent.set(obj.__parentId, [obj]);
    //   } else {
    //     // parent (product)
    //     parentMap.set(obj.id, {
    //       id: obj.id,
    //       handle: obj.handle,
    //       title: obj.title,
    //       legacyResourceId: obj.legacyResourceId,
    //       updatedAt: obj.updatedAt,
    //       variants: [], // attach later if any
    //     });
    //     defaultOrder.push(obj.id);
    //     // attach any variants that arrived early
    //     const early = variantsByParent.get(obj.id);
    //     if (early) {
    //       const p = parentMap.get(obj.id);
    //       p.variants = early;
    //       variantsByParent.delete(obj.id);
    //     }
    //   }

    //   processed++;
    //   // yield every few thousand lines to keep event loop healthy
    //   if (processed % 2000 === 0) await yieldNow();
    // }

    // // Attach any variants whose parent arrived after
    // if (variantsByParent.size) {
    //   for (const [pid, vars] of variantsByParent) {
    //     const p = parentMap.get(pid);
    //     if (p) p.variants = vars;
    //   }
    //   variantsByParent.clear();
    // }

    // // Build arrays for sorting decision in one pass, computing shouldPushDown once
    // const overrideInStock = [];
    // const overrideOOS = [];

    // for (const pid of defaultOrder) {
    //   const p = parentMap.get(pid);
    //   if (!p) continue;

    //   const pushDown = ProductUtils.shouldPushDown(
    //     p,
    //     continueSellingAsOOS,
    //     excludePushDown,
    //     excludePushDownTags,
    //     selectedLocations || []
    //   );

    //   if (pushDown) overrideOOS.push(p);
    //   else overrideInStock.push(p);
    // }

    // const overrideSortingArray = overrideInStock.concat(overrideOOS);

    // // Update OOS count (cheap)
    // await this.collectionService.updateCollection(collectionID, {
    //   OOSCount: overrideOOS.length,
    // });

    // // Compute minimal moves
    // const minimalMoves = getMinimalShopifyMoves(
    //   overrideSortingArray,
    //   defaultOrder.map((id) => parentMap.get(id))
    // );

    // // Build info quickly with a Map (avoid O(n²) .find)
    // const byLegacyId = new Map(
    //   overrideSortingArray.map((p) => [p.legacyResourceId, p])
    // );
    // const info = minimalMoves.map((move) => {
    //   const productID = retrieveAdminLegacyResourceID(move.id, "Product");
    //   const product = byLegacyId.get(productID);
    //   return product ? { ...move, ...product } : move;
    // });

    // // Apply reorder if needed (consider batching if moves is huge)
    // if (minimalMoves.length > 0) {
    //   await this.collectionGraphql.reorderCollectionProducts({
    //     id: retrieveAdminGraphqlID(collectionID, "Collection"),
    //     moves: minimalMoves,
    //   });
    // }

    // // Finalize bulk operation record
    // await prisma.bulkOperation.update({
    //   where: { operationID: bulkOperationID },
    //   data: {
    //     status,
    //     completedAt: completed_at,
    //     errorCode,
    //     objectCount: Number(objectCount),
    //   },
    // });

    // // small return for logging/metrics
    // return { processed, moves: minimalMoves.length, oos: overrideOOS.length };
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
      await this.bulkOperationGrpahql.fetchBulkOperationStatus(
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

    const { data: streamData } = await axios.get(url, {
      responseType: "stream",
    });
    const rl = readline.createInterface({
      input: streamData.pipe(new PassThrough()),
      crlfDelay: Infinity,
    });

    const parentLines = [],
      variantLines = [];

    for await (const line of rl) {
      if (!line.trim()) continue;
      const jsonLine = JSON.parse(line);
      (jsonLine.__parentId ? variantLines : parentLines).push(jsonLine);
    }

    const mid = Math.floor(parentLines.length / 2);
    let overrideSortingArray = parentLines.slice(0, mid);
    const defaultSortingArray = parentLines.slice(mid);

    // Group variants under parents for overrideSortingArray
    const parentMap = Object.fromEntries(
      overrideSortingArray.map((p) => [p.id, { ...p, variants: [] }]),
    );
    for (const variant of variantLines) {
      const parent = parentMap[variant.__parentId];
      if (parent) parent.variants.push(variant);
    }
    overrideSortingArray = Object.values(parentMap);

    const merchant = await this.merchantService.getMerchant({
      shop: this.shop,
      useCache: false,
    });
    const { continueSellingAsOOS, excludePushDown, excludePushDownTags } =
      merchant;

    // Store Should Push Down Items
    const instockItems = overrideSortingArray.filter(
      (p) =>
        !ProductUtils.shouldPushDown(
          p,
          continueSellingAsOOS,
          excludePushDown,
          excludePushDownTags,
          selectedLocations || [],
        ),
    );

    const OOSItems = overrideSortingArray.filter((p) =>
      ProductUtils.shouldPushDown(
        p,
        continueSellingAsOOS,
        excludePushDown,
        excludePushDownTags,
        selectedLocations || [],
      ),
    );

    overrideSortingArray = [...instockItems, ...OOSItems];

    await this.collectionService.updateCollection(collectionID, {
      OOSCount: OOSItems.length,
    });

    const minimalMoves = getMinimalShopifyMoves(
      overrideSortingArray,
      defaultSortingArray,
    );

    const info = [];

    // Add product title to the moves
    for (const move of minimalMoves) {
      const productID = retrieveAdminLegacyResourceID(move.id, "Product");
      const product = overrideSortingArray.find(
        (p) => p.legacyResourceId === productID,
      );
      if (product) {
        info.push({
          ...move,
          ...product,
        });
      }
    }

    if (minimalMoves.length > 0) {
      await this.collectionGraphql.reorderCollectionProducts({
        id: retrieveAdminGraphqlID(collectionID, "Collection"),
        moves: minimalMoves,
      });
    }

    await prisma.bulkOperation.update({
      where: { operationID: bulkOperationID },
      data: {
        status,
        completedAt: completed_at,
        errorCode,
        objectCount: Number(objectCount),
      },
    });
  }
}
