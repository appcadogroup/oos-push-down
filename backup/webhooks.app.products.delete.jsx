// import { authenticate } from "../shopify.server";
// import prisma from "../db.server";
// import { logger } from "../../shared"; 

// export const action = async ({ request }) => {
//   const { payload, session, topic, shop } = await authenticate.webhook(request);

//   if (!session) {
//     logger.debug(`Exit - No session`);
//     return null
//   }


//   // Get data from payload
//   const {
//     id,
//     title,
//   } = payload;


//   logger.info(`✅ Received ${topic} webhook for ${shop} | [Product] ${id}`);
//   logger.info(`Payload: ${JSON.stringify(payload, null, 2)}`);

//   try {
//     await prisma.$transaction(async (tx) => {
//       await tx.product.deleteMany({
//         where: { productID: id }
//       })

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
  
//     logger.info(`✅ Sucessfully update product count.`);
//     return new Response();
//   } catch (error) {
//     logger.error(`${topic} webhook error`, { error, payload });
//     return new Response({ error: "Failed to handle webhook" }, { status: 500 });
//   }
// };
