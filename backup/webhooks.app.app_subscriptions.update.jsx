// import { authenticate, FREE_PLAN } from "../shopify.server";

// import { SubscriptionService, MerchantService, AppGraphql } from "../../shared";
// import { retrieveAdminLegacyResourceID } from "../lib/common";

// export const action = async ({ request }) => {
//   const { payload, session, topic, shop, admin } =
//     await authenticate.webhook(request);


//   // Get data from payload
//   const { name, status, admin_graphql_api_id, created_at, updated_at } =
//     payload.app_subscription;

//   try {
//     const subscriptionService = new SubscriptionService();
//     const merchantService = new MerchantService();
//     const appGraphql = new AppGraphql(admin);

//     const subscription = await subscriptionService.getSubscription({
//       shop,
//       useCache: false,
//     });
//     if (subscription && subscription.updatedAt > new Date(updated_at)) {
//       return new Response();
//     }

//     const merchant = await merchantService.getMerchant({
//       shop,
//       useCache: false,
//     });
//     let updatedMerchant = null;

//     switch (status) {
//       case "ACTIVE":
//         const { app } = await appGraphql.getAppByHandle({
//           handle: process.env.SHOPIFY_APP_HANDLE,
//         });
//         const subscriptions = app.installation?.activeSubscriptions || [];
//         const activeSubscription =
//           subscriptions?.length > 0 ? subscriptions[0] : null;
//         await subscriptionService.upsertSubscription(shop, {
//           name,
//           status,
//           createdAt: created_at,
//           updatedAt: updated_at,
//           subscriptionID: retrieveAdminLegacyResourceID(
//             admin_graphql_api_id,
//             "AppSubscription",
//           ),
//           ...(activeSubscription &&
//             activeSubscription.id == admin_graphql_api_id && {
//               currentPeriodEnd: activeSubscription.currentPeriodEnd,
//               trialDays: activeSubscription.trialDays,
//             }),
//         });
//         updatedMerchant = await merchantService.updateMerchant(shop, {
//           activePlan: name,
//         });
//         break;
//       case "CANCELLED":
//         // case "EXPIRED":
//         // case "DECLINED":
//         // case "FROZEN":
//         if (merchant.activePlan === name) {
//           await subscriptionService.upsertSubscription(shop, {
//             name,
//             status,
//             createdAt: created_at,
//             updatedAt: updated_at,
//             subscriptionID: null,
//           });
//           updatedMerchant = await merchantService.updateMerchant(shop, {
//             activePlan: FREE_PLAN,
//           });

//         }
//         break;
//       default:
//         break;
//     }

//     return new Response();
//   } catch (error) {
//     return new Response({ error: "Failed to handle webhook" }, { status: 500 });
//   }
// };

// // {
// //   "admin_graphql_api_id": "gid://shopify/AppSubscription/24685609018",
// //   "name": "Free",
// //   "status": "CANCELLED",
// //   "admin_graphql_api_shop_id": "gid://shopify/Shop/57332695098",
// //   "created_at": "2025-03-16T15:45:21-04:00",
// //   "updated_at": "2025-04-09T12:14:39-04:00",
// //   "currency": "USD",
// //   "capped_amount": null
// // }
