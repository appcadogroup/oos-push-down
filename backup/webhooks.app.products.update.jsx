// import {
//   authenticate,
// } from "../shopify.server";
// import { logger, ProductWebhookHandler } from "../../shared";
// export const action = async ({ request }) => {
//   const { payload, session, topic, shop, admin } =
//     await authenticate.webhook(request);

//   if (!session) {
//     return new Response();
//   }

//   try {
//     const handler = new ProductWebhookHandler({ payload, shop, admin });
//     return await handler.handle(topic);
//   } catch (error) {
//     logger.error(`${topic} webhook error`, { error: error });
//     return new Response({ error: `Failed to handle webhook` }, { status: 500 });
//   }
// };
