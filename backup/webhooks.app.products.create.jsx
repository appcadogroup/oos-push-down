// import { authenticate } from "../shopify.server";
// import prisma from "../db.server";
// import { logger, convertStringListToArray } from "../../shared"; 

// export const action = async ({ request }) => {
//   const { payload, session, topic, shop } = await authenticate.webhook(request);

//   if (!session) {
//     logger.log(`Exit - No session`);
//     return null
//   }

//   // Get data from payload
//   const {
//     id,
//     title,
//     handle,
//     created_at,
//     updated_at,
//     status,
//     tags,
//     published_at
//   } = payload;

//   logger.info(`👍 Received ${topic} webhook for ${shop} | [Product] ${id}-${title}`);
//   // logger.info(`Payload: ${JSON.stringify(payload, null, 2)}`);
  
//   const productTags = convertStringListToArray(tags);
//   const productData = {
//     title: title,
//     handle: handle,
//     status: status.toUpperCase(),
//     createdAt: created_at,
//     updatedAt: updated_at,
//     publishedAt: published_at,
//     tags: productTags,
//   }

//   try {
//     await prisma.$transaction(async (tx) => {
//       await tx.product.create({
//         data: { 
//           ...productData,
//           productID: id.toString(),
//           shop: shop
//         }
//       });
    
//       const productCount = await tx.product.count({
//         where: { 
//           shop: shop
//         }
//       });
    
//       await tx.merchant.update({
//         where: { shop },
//         data: { productCount: productCount },
//       });
//     });
  
//     logger.info(`✅ Sucessfully create product and update product count.`);

//     return new Response();
//   } catch (error) {
//     logger.error(`${topic} webhook error`, { error, payload });
//     return new Response({ error: "Failed to handle webhook" }, { status: 500 });
//   }
// };
