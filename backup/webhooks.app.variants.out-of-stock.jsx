// import { authenticate } from "../shopify.server";
// import { logger, MerchantService, ProductGraphql, CollectionGraphql, ProductService } from "../../shared";

// export const action = async ({ request }) => {
//   const { payload, session, topic, shop, admin } =
//     await authenticate.webhook(request);

//   if (!session) {
//     logger.debug(`Exit - No session`);
//     return new Response();
//   }

//   const merchantService = new MerchantService();
//   const productService = new ProductService();
//   const productGraphql = new ProductGraphql(admin);
//   const collectionGraphql = new CollectionGraphql(admin);

//   // Get target variant and inventory item id from payload
//   const { product_id, inventory_policy } = payload;

//   logger.info(
//     `✅ Received ${topic} webhook for ${shop} | [product] ${product_id} - title`,
//   );
//   // logger.info(`Payload: ${JSON.stringify(payload, null, 2)}`);

//   try {
//     // const merchant = await merchantService.getMerchant({
//     //   shop,
//     //   useCache: false,
//     // });

//     // const product = await productService.getProduct({
//     //   id: product_id,
//     //   useCache: false,
//     // });

//     // const { hasContinueSelling, tags: productTags } = product;

//     // const {
//     //   // OOS
//     //   continueSellingAsOOS,
//     //   excludePushDown,
//     //   excludePushDownTags,
//     //   tagOOSProduct,
//     //   OOSProductTag,
//     //   // Hide & Show
//     //   enableHiding,
//     //   hideAfterDays,
//     //   excludeHiding,
//     //   excludeHideTags,
//     // } = merchant;

//     // if (
//     //   !continueSellingAsOOS &&
//     //   (inventory_policy === "continue" || hasContinueSelling)
//     // ) {
//     //   logger.debug(`Exit. Variant inventory policy are continue.`);
//     //   return new Response();
//     // }

//     // let pushDownRequired = true;
//     // if (excludePushDown && excludePushDownTags.length > 0) {
//     //   const hasExcludeTag = productTags.some((tag) =>
//     //     excludePushDownTags.includes(tag),
//     //   );

//     //   if (hasExcludeTag) {
//     //     logger.debug(
//     //       `Exit. Product has at least one of exclude push down tags.`,
//     //     );
//     //     pushDownRequired = false;
//     //     // return new Response();
//     //   }
//     // }

//     // if (pushDownRequired) {
//     //   const { collections } = await shopifyCollectionService.getCollections({
//     //     searchQuery: `product_id:${product_id}`,
//     //     fields: `
//     //       legacyResourceId
//     //     `,
//     //   });
//     //   const collectionIds = collections.map(
//     //     (collection) => collection.legacyResourceId,
//     //   );

//     //   const activeCollections = await prisma.collection.findMany({
//     //     where: {
//     //       collectionID: {
//     //         in: collectionIds,
//     //       },
//     //       isActive: true,
//     //     },
//     //   });

//     //   const bulkOperationJob = [];
//     //   const ttl = 4 * 1000; // 4 seconds
//     //   const operationType = "QUERY";
//     //   for (const collection of activeCollections) {
//     //     const { collectionID } = collection;
//     //     const jobKey = `PushDown:${collectionID}`;
//     //     bulkOperationJob.push({
//     //       name: JOB_NAMES.PUSH_DOWN,
//     //       data: {
//     //         shop: shop,
//     //         collectionID: collectionID,
//     //       },
//     //       opts: {
//     //         deduplication: { id: jobKey, ttl: ttl },
//     //         delay: ttl,
//     //       },
//     //     });
//     //   }

//     //   await bulkOperationQueue.addBulk(bulkOperationJob);

//     //   logger.debug(
//     //     `${bulkOperationJob.length} ${operationType} job scheduled in ${ttl / 1000} sec.`,
//     //   );
//     // }

//     // // Tag OOS Product if tag is provided and enabled
//     // if (tagOOSProduct && isNotEmptyStringAndNull(OOSProductTag)) {
//     //   await productGraphql.addProductTags({
//     //     id: product_id,
//     //     tags: OOSProductTag,
//     //   });
//     // }

//     // let hideProduct = true;
//     // if (!enableHiding || product.hiddenAt) {
//     //   hideProduct = false;
//     // }

//     // const now = new Date();
//     // if (product.scheduledHidden > now) {
//     //   hideProduct = false;
//     // }

//     // if (excludeHiding && excludeHideTags.length > 0) {
//     //   const hasExcludeTag = productTags.some((tag) =>
//     //     excludeHideTags.includes(tag),
//     //   );

//     //   if (hasExcludeTag) {
//     //     logger.info(`Product excluded from hiding due to tag match.`, {
//     //       excludeTags: excludeHideTags,
//     //     });
//     //     hideProduct = false;
//     //   }
//     // }

//     // if (hideProduct) {
//     //   logger.debug(
//     //     `Product ${product_id} will be hidden after ${hideAfterDays} days.`,
//     //   );
     
//     //   const delay = hideAfterDays > 0 ? hideAfterDays * 24 * 60 * 60 * 1000 : 0;
//     //   await hideProductQueue.add(
//     //     'hide-product',
//     //     {
//     //       shop,
//     //       productID: product_id,
//     //     },
//     //     {
//     //       attempts: 3,
//     //       backoff: {
//     //         type: 'exponential',
//     //         delay: 2000,
//     //       },
//     //       removeOnComplete: {
//     //         age: 1800, // keep up to half hour
//     //         count: 10, // keep up to 1000 jobs
//     //       },
//     //       removeOnFail: {
//     //         age: 24 * 3600, // keep up to 24 hours
//     //       },
//     //       opts: {
//     //         delay: delay,
//     //       },
//     //     },
//     //   )

//     //   await productService.updateProduct(product_id, {
//     //     scheduledHidden: now
//     //   })
//     // }

  
//   } catch (err) {
//     logger.error(err.message);
//   }

//   return new Response();
// };

// // const { product } = await productGraphql.getProduct({
// //   id: product_id ,
// //   fields: `
// //     legacyResourceId
// //     title
// //     handle
// //     status
// //     publishedAt
// //     createdAt
// //     updatedAt
// //     tags
// //     variantsCount {
// //       count
// //     }
// //   `
// // });

// // const variantsCount = product.variantsCount.count;
// // const { product: productWithVariants } = await productGraphql.getProduct({
// //   id: product_id ,
// //   fields: `
// //     variants (first: ${variantsCount}, cursor: null) {
// //       inventoryPolicy
// //     }
// //   `
// // });

// // const jobKey = `PushDown:${collectionID}`;
// // jobsData.push({
// //   // name: "collection-pushdown", // Job name
// //   data: { shop, collectionID },
// //   // opts: { deduplication: { id: jobKey, ttl } }
// //   opts: {
// //     deduplication: { id: jobKey, ttl: ttl },
// //     delay: ttl, // Delay before processing
// //     removeOnComplete: {
// //       age: 1800, // keep up to half hour
// //       count: 10, // keep up to 1000 jobs
// //     },
// //     removeOnFail: {
// //       age: 24 * 3600, // keep up to 24 hours
// //     },
// //   },
// // });
