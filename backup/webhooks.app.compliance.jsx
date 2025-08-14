// import prisma from "../db.server";
// import { logger } from "../../shared";
// import { authenticate } from "../shopify.server";

// export const action = async ({ request }) => {
//   const { shop, topic, payload } = await authenticate.webhook(request);
//   logger.info(`Received ${topic} webhook for ${shop}`, payload);

//   switch (topic) {
//     case "shop/redact":
//       const { shop_id, shop_domain } = payload;
//       // Handle shop redaction
//       logger.info(`Shop redaction for ${shop}`);

//       // Delete all data related to the merchant on delete cascade
//       await prisma.merchant.deleteMany({
//         where: {
//           shop: shop_domain,
//         },
//       });
//       break;
//     case "customers/redact":
//       const { customer_id, customer_email } = payload;
//       // Handle customer redaction
//       logger.info(`Customer redaction for ${shop}`);
//       break;
      

//     default:
//       logger.warn(`Unhandled topic: ${topic}`);
//   }

//   return new Response();
// };
