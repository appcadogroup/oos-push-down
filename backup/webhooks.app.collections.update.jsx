// import { authenticate } from "../shopify.server";
// import prisma from "../db.server";
// import { CollectionSorting } from "@prisma/client";

// import { JOB_NAMES, logger, bulkOperationQueue, CollectionService, ProductGraphql } from "../../shared";

// export const action = async ({ request }) => {
//   const { payload, session, topic, shop, admin } =
//     await authenticate.webhook(request);

//   if (!session) {
//     logger.debug(`Exit - No session`);
//     return null;
//   }

//   // Get data from payload
//   const {
//     id,
//     handle,
//     title,
//     published_at,
//     updated_at,
//     sort_order,
//   } = payload;


//   logger.info(`👍 Received ${topic} webhook for ${shop} - [Collection] ${id}`);
//   // console.log(`Payload: ${JSON.stringify(payload, null, 2)}`);

//   const collectionService = new CollectionService();
//   const productGraphql = new ProductGraphql(admin);
  
//   try {
//     let conditionalData = {
//       isNewProductAdded: false,
//       pushOrSortRequired:false,
//       isDisableRequired:false,
//     }

//     let collectionRecord = await collectionService.getCollection({ id: id.toString(), useCache: false});
//     if (collectionRecord) {
//       if (new Date(collectionRecord.updated_at) > new Date(updated_at)) {
//         return new Response(
//           {
//             collectionRecord,
//           },
//           { status: 200 },
//         );
//       }
//     }

//     const { productsCount:graphqlProductCount } = await productGraphql.getProductsCount({
//       searchQuery: `collection_id:${id}`,
//     })

//     let updateData = getUpdateData(payload, collectionRecord, graphqlProductCount, conditionalData); // Prepare update data
//     let createData = getCreateData({...payload, shop}, graphqlProductCount); // Prepare create data

//     if (
//       collectionRecord.isActive && 
//       collectionRecord.currentSorting !== CollectionSorting.MANUAL &&
//       conditionalData.isNewProductAdded
//     ) {
//       conditionalData.pushOrSortRequired = true
//     }

//     // Perform upsert operation
//     collectionRecord = await prisma.collection.upsert({
//       where: { collectionID: id.toString() },
//       update: updateData,
//       create: createData,
//     });

//     if (conditionalData.pushDownRequired) {
//       const jobKey = `PushDown:${id}`;
//       const ttl = 4 * 60 * 1000;
//       await bulkOperationQueue.add(
//         JOB_NAMES.PUSH_DOWN,
//         { 
//           shop, 
//           collectionID: id 
//         },
//         {
//           deduplication: { id: jobKey, ttl: ttl },
//           delay: ttl
//         }
//       );
//       logger.info(`✅ Sucessfully scheduled pushSort for ${shop} in ${ttl / 1000} sec.`);
//     }
//     logger.info(`✅ Sucessfully updated collection ${title}.`);

//     return new Response();
//   } catch (error) {
//     logger.error(`${topic} webhook error`, { error: error, payload });
//     return new Response({ error: "Failed to handle collection update" }, { status: 500 });
//   }
// };

// function getUpdateData(payload, existingCollection, graphqlCollectionProductsCount, conditionalData) {
//   const { title, handle, sort_order, updated_at } = payload;

//   const updateData = {};

//   // Update title and handle if they have changed
//   if (existingCollection.title !== title) {
//     updateData.title = title;
//   }
//   if (existingCollection.handle !== handle) {
//     updateData.handle = handle;
//   }

//   // Format the sort order and check against the predefined MANUAL sorting
//   const formattedSortOrder = sort_order.replaceAll("-", "_").toUpperCase();

//   // Disable collection and update sorting rule if user changes the sort order manually
//   if (existingCollection.isActive && formattedSortOrder !== "MANUAL") {
//     conditionalData.isDisableRequired = true;
//     updateData.isActive = false;
//     updateData.currentSorting = formattedSortOrder;
//   }

//   // Update sorting rule if collection is inactive and sorting not same as existing sorting rule
//   if (
//     !existingCollection.isActive &&
//     formattedSortOrder !== existingCollection.currentSorting
//   ) {
//     logger.debug(
//       `Update sorting rule if collection is inactive and sorting not same as existing sorting rule`,
//     );
//     updateData.currentSorting = formattedSortOrder;
//   }

//   if (existingCollection.productsCount != graphqlCollectionProductsCount) {
//     updateData.productsCount = graphqlCollectionProductsCount;
//   }

//   if (Number(existingCollection.productsCount) < Number(graphqlCollectionProductsCount)) {
//     conditionalData.isNewProductAdded = true
//   }

//   updateData.updatedAt = updated_at;

//   return updateData;
// }

// function getCreateData(payload, graphqlProductCount) {
//   const { id, title, handle, sort_order, updated_at, shop } = payload;

//   const createData = {
//     collectionID: id.toString(),
//     title: title,
//     handle: handle,
//     isActive: true, // Assuming new collections are active by default
//     currentSorting: sort_order.replaceAll("-", "_").toUpperCase(),
//     productsCount: graphqlProductCount,
//     updatedAt: updated_at,
//     shop: shop
//   };

//   return createData;
// }
