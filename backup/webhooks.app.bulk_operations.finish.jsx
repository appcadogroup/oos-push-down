// import {
//   queryBulkOperationStatus,
// } from "../lib/shopify-graphql/shopify";
// import { authenticate } from "../shopify.server";
// import axios from "axios";
// import readline from "node:readline";
// import { PassThrough } from "node:stream";
// import prisma from "../db.server";

// import {
//   REORDER_COLLECTION_PRODUCTS,
//   reorderCollectionProducts,
// } from "../lib/shopify-graphql/collection";
// import { getMinimalShopifyMoves } from "../lib/findLISIndices";
// import {
//   MerchantService,
//   BulkOperationService,
//   CollectionService,
//   ProductUtils,
//   logger,
//   retrieveAdminLegacyResourceID,
//   retrieveAdminGraphqlID,
//   retrieveBulkOperationRestID,
// } from "../../shared";

// // import { BulkOperationStatus } from "@prisma/client";
// const BulkOperationStatus = {
//   QUEUED: "QUEUED",
//   RUNNING: "RUNNING",
//   COMPLETED: "COMPLETED",
//   FAILED: "FAILED",
//   CANCELLED: "CANCELLED",
//   ABORTED: "ABORTED",
// };

// export const action = async ({ request }) => {
//   const { payload, session, topic, shop, admin } =
//     await authenticate.webhook(request);
//   const merchantService = new MerchantService();
//   const collectionService = new CollectionService();
//   const bulkOperationService = new BulkOperationService(admin);
//   const {
//     admin_graphql_api_id,
//     status: rawStatus,
//     error_code: rawErrorCode,
//     completed_at,
//   } = payload;

//   const bulkOperationID = retrieveBulkOperationRestID(admin_graphql_api_id);
//   const status = rawStatus.toUpperCase();
//   const errorCode = rawErrorCode?.toUpperCase();

//   logger.info(`✅ Received ${topic} webhook for ${shop} | ${bulkOperationID}`);

//   if (errorCode) {
//     logger.error(`❌ Bulk operation failed: ${errorCode}`);
//     await bulkOperationService.updateBulkOperation({
//       id: bulkOperationID,
//       data: { status, error_code: errorCode },
//     });
//   }

//   const { url, objectCount } = await queryBulkOperationStatus(
//     admin,
//     admin_graphql_api_id,
//   );

//   if (!url) {
//     logger.error(`❌ Bulk operation failed: No URL found`);
//     await prisma.bulkOperation.update({
//       where: { operationID: bulkOperationID },
//       data: { status, completedAt: completed_at, errorCode },
//     });
//     return new Response();
//   }

//   const bulkOperationRecord = await prisma.bulkOperation.findUnique({
//     where: { operationID: bulkOperationID },
//   });

//   if (!bulkOperationRecord) return new Response();

//   const { jobData } = bulkOperationRecord;
//   const { collectionID, selectedLocations } = jobData;

//   // Update and exit early on failure
//   if (status !== BulkOperationStatus.COMPLETED || errorCode) {
//     const updatedRecord = await prisma.bulkOperation.update({
//       where: { operationID: bulkOperationID },
//       data: { status, completedAt: completed_at, errorCode, objectCount },
//     });

//     logger.error(`[BulkOperationFailed] ${status} | ${errorCode}`);
//     return new Response({ updatedRecord });
//   }

//   try {
//     const { data: streamData } = await axios.get(url, {
//       responseType: "stream",
//     });
//     const rl = readline.createInterface({
//       input: streamData.pipe(new PassThrough()),
//       crlfDelay: Infinity,
//     });

//     const parentLines = [],
//       variantLines = [];

//     for await (const line of rl) {
//       if (!line.trim()) continue;
//       const jsonLine = JSON.parse(line);
//       (jsonLine.__parentId ? variantLines : parentLines).push(jsonLine);
//     }

//     const mid = Math.floor(parentLines.length / 2);
//     let overrideSortingArray = parentLines.slice(0, mid);
//     const defaultSortingArray = parentLines.slice(mid);

//     // Group variants under parents for overrideSortingArray
//     const parentMap = Object.fromEntries(
//       overrideSortingArray.map((p) => [p.id, { ...p, variants: [] }]),
//     );
//     for (const variant of variantLines) {
//       const parent = parentMap[variant.__parentId];
//       if (parent) parent.variants.push(variant);
//     }
//     overrideSortingArray = Object.values(parentMap);

//     const merchant = await merchantService.getMerchant({
//       shop,
//       useCache: false,
//     });
//     const { continueSellingAsOOS, excludePushDown, excludePushDownTags } =
//       merchant;

//     // Store Should Push Down Items
//     const instockItems = overrideSortingArray.filter(
//       (p) =>
//         !ProductUtils.shouldPushDown(
//           p,
//           continueSellingAsOOS,
//           excludePushDown,
//           excludePushDownTags,
//           selectedLocations || [],
//         ),
//     );

//     const OOSItems = overrideSortingArray.filter((p) =>
//       ProductUtils.shouldPushDown(
//         p,
//         continueSellingAsOOS,
//         excludePushDown,
//         excludePushDownTags,
//         selectedLocations || [],
//       ),
//     );

//     overrideSortingArray = [...instockItems, ...OOSItems];

//     await collectionService.updateCollection(collectionID, {
//       OOSCount: OOSItems.length,
//     });

//     logger.debug(`OOS Items: ${OOSItems.length}`);

//     const minimalMoves = getMinimalShopifyMoves(
//       overrideSortingArray,
//       defaultSortingArray,
//     );

//     const info = [];

//     // Add product title to the moves
//     for (const move of minimalMoves) {
//       const productID = retrieveAdminLegacyResourceID(move.id, "Product");
//       const product = overrideSortingArray.find(
//         (p) => p.legacyResourceId === productID,
//       );
//       if (product) {
//         info.push({
//           ...move,
//           ...product,
//         });
//       }
//     }

//     if (minimalMoves.length > 0) {
//       await reorderCollectionProducts(admin, REORDER_COLLECTION_PRODUCTS, {
//         id: retrieveAdminGraphqlID(collectionID, "Collection"),
//         moves: minimalMoves,
//       });
//     }

//     await prisma.bulkOperation.update({
//       where: { operationID: bulkOperationID },
//       data: {
//         status,
//         completedAt: completed_at,
//         errorCode,
//         objectCount: Number(objectCount),
//       },
//     });

//     logger.info(`✅ Bulk operation finish successfully.`);
//   } catch (err) {
//     logger.error(`❌ Failed ${topic} | ${err.message}`, err.stack);
//   }

//   return new Response();
// };
