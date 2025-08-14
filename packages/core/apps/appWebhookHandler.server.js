import prisma from "@acme/db";
import {
  MerchantService,
  SubscriptionService,
  AppGraphql,
} from "@acme/core/server";
import {
  retrieveAdminLegacyResourceID,
} from "@acme/core";

export class AppWebhookHandler {
  constructor({ payload, shop, admin, webhookId, session = null }) {
    this.payload = payload;
    this.shop = shop;
    this.admin = admin;
    this.session = session;
    this.webhookId = webhookId;

    this.subscriptionService = new SubscriptionService();
    this.merchantService = new MerchantService();
    this.appGraphql = new AppGraphql(admin);
  }

  async handle(topic) {
    switch (topic) {
      case "APP_UNINSTALLED":
        return this.handleAppUninstalled();
      case "SCOPE_UPDATE":
        return this.handleScopeUpdate();
      case "SHOP_REDACT":
        return this.handleShopRedact();
      case "CUSTOMERS_REDACT":
        return this.handleCustomersRedact();
      case "CUSTOMERS_DATA_REQUEST":
        return this.handleCustomersDataRequest();
      case "APP_SUBSCRIPTIONS_UPDATE":
        return this.handleAppSubscriptionsUpdate();
      default:
        throw new Error(`Unhandled topic: ${topic}`);
    }
  }

  async handleAppSubscriptionsUpdate() {
    const { name, status, admin_graphql_api_id, created_at, updated_at } =
      this.payload.app_subscription;

    const subscription = await this.subscriptionService.getSubscription({
      shop: this.shop,
      useCache: false,
    });

    if (subscription && subscription.updatedAt > new Date(updated_at)) {
      return;
    }

    const merchant = await this.merchantService.getMerchant({
      shop: this.shop,
      useCache: false,
    });

    switch (status) {
      case "ACTIVE":
        const { app } = await this.appGraphql.getAppByHandle({
          handle: process.env.SHOPIFY_APP_HANDLE,
        });
        const subscriptions = app.installation?.activeSubscriptions || [];
        const activeSubscription =
          subscriptions?.length > 0 ? subscriptions[0] : null;
        await this.subscriptionService.upsertSubscription(this.shop, {
          name,
          status,
          createdAt: created_at,
          updatedAt: updated_at,
          subscriptionID: retrieveAdminLegacyResourceID(
            admin_graphql_api_id,
            "AppSubscription",
          ),
          ...(activeSubscription &&
            activeSubscription.id == admin_graphql_api_id && {
              currentPeriodEnd: activeSubscription.currentPeriodEnd,
              trialDays: activeSubscription.trialDays,
            }),
        });
        updatedMerchant = await this.merchantService.updateMerchant(this.shop, {
          activePlan: name,
        });
        break;
      case "CANCELLED":
        if (merchant.activePlan === name) {
          await this.subscriptionService.upsertSubscription(this.shop, {
            name,
            status,
            createdAt: created_at,
            updatedAt: updated_at,
            subscriptionID: null,
          });
          updatedMerchant = await this.merchantService.updateMerchant(this.shop, {
            activePlan: FREE_PLAN,
          });
        }
        break;
      default:
        break;
      // case "EXPIRED":
      // case "DECLINED":
      // case "FROZEN":
    }
  }

  async handleAppUninstalled() {
    await prisma.session.deleteMany({ where: { shop: this.shop } });
  }

  async handleScopeUpdate() {
  }

  async handleShopRedact() {
    const { shop_domain } = this.payload;
    await prisma.merchant.deleteMany({
      where: {
        shop: shop_domain,
      },
    });
  }

  async handleCustomersRedact() {
  }

  async handleCustomersDataRequest() {
  }
}
