// import { authenticate } from "../shopify.server";
// import prisma from "../db.server";

// import { logger, CollectionGraphql, CollectionController, MerchantService } from "../../shared";

// export const action = async ({ request }) => {
//   const { payload, session, topic, shop, admin } = await authenticate.webhook(request);

//   if (!session) {
//     logger.debug(`Exit - No session`);
//     return null
//   }

//   const collectionGraphql = new CollectionGraphql(admin);
//   const collectionController = new CollectionController(admin, shop);
//   const merchantService = new MerchantService();
//   const merchant = await merchantService.getMerchant({shop, useCache: false});

//   // Get data from payload
//   const {
//     id,
//     title,
//   } = payload;


//   logger.info(`👍 Received ${topic} webhook for ${shop} | [Collection] ${id}-${title}`);
//   // console.log(`Payload: ${JSON.stringify(payload, null, 2)}`);


//   // Fetch collection from shopify
//   const { collection } = await collectionGraphql.getCollection({
//     id, 
//     fields: `
//      id
//      title
//      handle
//      productsCount { count } 
//      sortOrder 
//      updatedAt
//   `});

//   try {
//     await prisma.$transaction(async (tx) => {
//       await tx.collection.upsert({
//         where: {
//           collectionID: id.toString(),
//         },
//         create: {
//           collectionID: id.toString(),
//           title: collection.title,
//           handle: collection.handle,
//           currentSorting: collection.sortOrder,
//           productsCount: collection.productsCount.count,
//           updatedAt: collection.updatedAt,
//           shop
//         },
//         update: {
//           title: collection.title,
//           handle: collection.handle,
//           currentSorting: collection.sortOrder,
//           productsCount: collection.productsCount.count,
//           updatedAt: collection.updatedAt,
//           shop
//         }
//       })
      
//       const collectionCount = await tx.collection.count({where: { shop }});
//       await tx.merchant.upsert({
//         where: { shop: shop },
//         update: { collectionCount },
//         create: { 
//           shop, 
//           collectionCount
//         }
//       });
//     });
  
//     logger.info(`✅ Sucessfully created collection ${title}.`);

//     if (merchant.autoEnableCollection) {
//       await collectionController.enableCollections([id]);
//     }

//     return new Response();
//   } catch (error) {
//     logger.error(`${topic} webhook error`, { error, payload });
//     return new Response({ error: "Failed to handle webhook" }, { status: 500 });
//   }
// };
