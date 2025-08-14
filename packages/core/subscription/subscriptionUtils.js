import { PLAN_LIMIT } from "./subscriptionConstant.js";

export class SubscriptionUtils {
  static getBasePlanName(shopifyPlanName) {
    const lowerPlanName = shopifyPlanName.toLowerCase();
    if (lowerPlanName.includes("free")) return "free";
    if (lowerPlanName.includes("starter")) return "starter";
    if (lowerPlanName.includes("professional")) return "professional";
    if (lowerPlanName.includes("business")) return "business";
    if (lowerPlanName.includes("advanced")) return "advanced";
    if (lowerPlanName.includes("enterprise")) return "enterprise";
    return null;
  }

  static getPlanLimit(shopifyPlanName) {
    const basePlan = this.getBasePlanName(shopifyPlanName);
    const limit = basePlan ? PLAN_LIMIT[basePlan] : null;
    return limit;
  }

  static isOverPlanLimit(merchant, plan) {
    try {
      const basePlan = this.getBasePlanName(plan);
      const planLimit = PLAN_LIMIT[basePlan];

      if (!planLimit) {
        throw new Error(`Plan not found`);
      }

      if (merchant.collectionCount > planLimit.maxCollections) {
        return true;
      }

      if (merchant.productCount > planLimit.maxProducts) {
        return true;
      }

      return false;
    } catch (error) {
      if (error.message === "Plan not found") {
        return true;
      }

      throw error;
    }
  }

  static limitDescription = (plan) => {
    const basePlan = this.getBasePlanName(plan);
    return `${PLAN_LIMIT[basePlan].maxProducts} products & ${PLAN_LIMIT[basePlan].maxCollections} collections`;
  };
}