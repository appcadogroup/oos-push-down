// import { authenticate } from "../shopify.server";
// import { logger } from "../../shared";

// import { CollectionGraphql, MerchantService, ProductGraphql, ProductService } from '../../shared'

// export const action = async ({ request }) => {
//   const { payload, session, topic, shop, admin } =
//     await authenticate.webhook(request);

//   if (!session) {
//     logger.debug(`Exit - No session`);
//     return new Response();
//   }
 
//   const merchantService = new MerchantService();
//   const productService = new ProductService();
//   const collectionGraphql = new CollectionGraphql(admin);
//   const productGraphql = new ProductGraphql(admin);

//   const {
//     product_id,
//     inventory_policy,
//   } = payload;

//   logger.info(
//     `✅ Received ${topic} webhook for ${shop} | ${product_id} ${inventory_policy}`,
//   );
//   // logger.info(`Payload: ${JSON.stringify(payload, null, 2)}`)


//   // const merchant = await merchantService.getMerchant({shop, useCache: false});
//   // const product = await productService.getProduct({id: product_id, useCache: false });
  
//   // const {
//   //   tagOOSProduct,
//   //   OOSProductTag,
//   //   republishHidden
//   // } = merchant;

//   // // Remove OOS Product tag if tag is provided and enabled
//   // if (tagOOSProduct && OOSProductTag) {
//   //   await productGraphql.removeProductTags({id: product_id, tags: OOSProductTag});
//   // }

//   // const { collections } = await shopifyCollectionService.getCollections({
//   //   searchQuery: `product_id:${product_id}`,
//   //   fields: `
//   //     legacyResourceId
//   //   `,
//   // });
//   // const collectionIds = collections.map((collection) => collection.legacyResourceId );
//   // const activeCollections = await prisma.collection.findMany({
//   //   where: {
//   //     collectionID: {
//   //       in: collectionIds,
//   //     },
//   //     isActive: true,
//   //   },
//   // });

//   // const jobsData = [];
//   // // const ttl = 4 * 60 * 1000; // 4 Mins
//   // const ttl = 4 * 1000; // 4 Seconds
//   // for (const collection of activeCollections) {
//   //   const { collectionID } = collection;
//   //   const jobKey = `PushDown:${collectionID}`;
//   //   jobsData.push({
//   //     name: JOB_NAMES.PUSH_DOWN, 
//   //     data: { 
//   //       shop: shop,
//   //       collectionID: collectionID 
//   //     }, 
//   //     opts: {
//   //       deduplication: { id: jobKey, ttl: ttl },
//   //       delay: ttl
//   //     },
//   //   });
//   // }

//   // const bulkAddResult = await bulkOperationQueue.addBulk(jobsData);
//   // logger.info(
//   //   `${bulkAddResult.length} Webhook job for Store ${shop} [out-of-stock] scheduled with TTL ${ttl / 1000} sec.`,
//   // );

//   // if (republishHidden && product.hiddenAt) {
//   //   // Republish hidden product
//   //   if (merchant.hidingChannel === "ONLINE_STORE") {
//   //     await productGraphql.publishProduct({ id: product_id, 
//   //       publicationIds: [
//   //         {
//   //           publicationId: "gid://shopify/OnlineStorePublication/1",
//   //         },
//   //       ]
//   //     })
//   //   } else if (merchant.hidingChannel === "ALL_CHANNELS") {
//   //     await productGraphql.updateProduct({
//   //       id: product_id,
//   //       data: {
//   //         status: "ACTIVE",
//   //       },
//   //     });
//   //   }
//   //   logger.info(`Republish hidden product ${product_id}`);
//   // }

//   return new Response();
// };


// // // Update product oos status
// // await productService.updateManyProducts(
// //   {
// //     productID: product_id,
// //     OOS: true, // Only update if it's currently false
// //   },
// //   {
// //     OOS: false,
// //     OOSAt: null,
// //   },
// // );