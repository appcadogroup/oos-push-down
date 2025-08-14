// import { authenticate } from "../shopify.server";
// import db from "../db.server";
// import { logger } from "../../shared";

// export const action = async ({ request }) => {
//   const { shop, session, topic } = await authenticate.webhook(request);

//   logger.debug(`Received ${topic} webhook for ${shop}`);
//   if (session) {
//     logger.debug(`Deleting session for ${shop}`);
//     await db.session.deleteMany({ where: { shop } });
//   }

//   return new Response();
// };
