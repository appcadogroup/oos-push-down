// src/controllers/subscriptionController.js
import { getLogger, MerchantService, SubscriptionService } from "@acme/core/server";
import {
  ADVANCED_PLAN,
  ANNUAL_ADVANCED_PLAN,
  ANNUAL_BUSINESS_PLAN,
  ANNUAL_ENTERPRISE_PLAN,
  ANNUAL_PROFESSIONAL_PLAN,
  ANNUAL_STARTER_PLAN,
  BUSINESS_PLAN,
  ENTERPRISE_PLAN,
  FREE_PLAN,
  PROFESSIONAL_PLAN,
  STARTER_PLAN,
} from "@acme/core/server";

const logger = getLogger('controller/subscription');

export class SubscriptionController {
  constructor() {
    this.subscriptionService = new SubscriptionService();
    this.merchantService = new MerchantService();
  }

  async getCurrentSubscription(billing, isTest = false) {
    try {
      const billingCheck = await billing.require({
        plans: [
          STARTER_PLAN,
          PROFESSIONAL_PLAN,
          BUSINESS_PLAN,
          ADVANCED_PLAN,
          ENTERPRISE_PLAN,
          ANNUAL_STARTER_PLAN,
          ANNUAL_PROFESSIONAL_PLAN,
          ANNUAL_BUSINESS_PLAN,
          ANNUAL_ADVANCED_PLAN,
          ANNUAL_ENTERPRISE_PLAN,
        ],
        isTest: false,
        onFailure: () => {
          throw new Error("No active plan");
        },
      });
      const subscription = billingCheck.appSubscriptions[0];
      logger.debug(
        `Shop is on plan ${subscription.name} (id ${subscription.id})`,
      );
      return { plan: { ...subscription } };
    } catch (error) {
      if (error.message === "No active plan") {
        logger.debug(`Shop doesnt not have any active plans.`);
        return {
          plan: {
            name: FREE_PLAN,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        };
      }

      throw error;
    }
  }
}
