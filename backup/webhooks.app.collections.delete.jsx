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
//   } = payload;

//   try {
//     await prisma.$transaction(async (tx) => {
//       await tx.collection.deleteMany({
//         where: {
//           collectionID: id.toString(),
//         }
//       })
//       const total = await tx.collection.count({where: { shop }});

//       await tx.merchant.upsert({
//         where: { shop: shop },
//         update: { collectionCount: total },
//         create: { 
//           shop: shop, 
//           collectionCount: total
//         }
//       });
//     });
  
//     logger.info(`✅ Sucessfully deleted collection ${id}.`);

//     return new Response();
//   } catch (error) {
//     logger.error(`${topic} webhook error`, { error, payload });
//     return new Response({ error: "Failed to handle webhook" }, { status: 500 });
//   }
// };
