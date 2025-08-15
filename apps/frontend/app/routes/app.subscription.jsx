import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  ADVANCED_PLAN,
  ANNUAL_ADVANCED_PLAN,
  ANNUAL_BUSINESS_PLAN,
  ANNUAL_ENTERPRISE_PLAN,
  ANNUAL_PROFESSIONAL_PLAN,
  ANNUAL_STARTER_PLAN,
  authenticate,
  BUSINESS_PLAN,
  ENTERPRISE_PLAN,
  PROFESSIONAL_PLAN,
  STARTER_PLAN,
} from "../shopify.server.js";
import {
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Divider,
  ExceptionList,
  Grid,
  InlineStack,
  Page,
  Text,
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";
import { memo, useCallback, useEffect, useState } from "react";
import { SubscriptionUtils } from '@acme/core';
import { getLogger } from '@acme/core/server';

const logger = getLogger("frontend");

export const PLAN_DATA = [
  {
    title: "Free",
    name: "Free subscription",
    price: 0,
    annual_price: 0,
    annual_off_per: 0,
    action: "Free",
    url: "/app/upgrade",
    features: [
      `Real-time automated process`,
      `Push down out of stock`,
      `Hide out of stock`,
      `Tag out of stock & hidden products`,
      `24/7 support`,
    ],
  },
  {
    title: "Starter",
    name: "Starter subscription",
    price: 3.99,
    annual_price: 35.88,
    annual_off_per: 25,
    action: "Upgrade",
    url: "/app/upgrade",
    features: [
      `Real-time automated process`,
      `Push down out of stock`,
      `Hide out of stock`,
      `Tag out of stock & hidden products`,
      `24/7 support`,
    ],
  },
  {
    title: "Professional",
    name: "Professional subscription",
    price: 7.99,
    annual_price: 71.88,
    annual_off_per: 25,
    action: "Upgrade",
    url: "/app/upgrade",
    features: [
      `Real-time automated process`,
      `Push down out of stock`,
      `Hide out of stock`,
      `Tag out of stock & hidden products`,
      `24/7 support`,
    ],
  },
  {
    title: "Business",
    name: "Business subscription",
    price: 12.99,
    annual_price: 116.88,
    annual_off_per: 25,
    action: "Upgrade",
    url: "/app/upgrade",
    features: [
      `Real-time automated process`,
      `Push down out of stock`,
      `Hide out of stock`,
      `Tag out of stock & hidden products`,
      `24/7 support`,
    ],
  },
  {
    title: "Advanced",
    name: "Advanced subscription",
    price: 18.99,
    annual_price: 170.88,
    annual_off_per: 25,
    action: "Upgrade",
    url: "/app/upgrade",
    features: [
      `Real-time automated process`,
      `Push down out of stock`,
      `Hide out of stock`,
      `Tag out of stock & hidden products`,
      `24/7 support`,
    ],
  },
  {
    title: "Enterprise",
    name: "Enterprise subscription",
    price: 23.99,
    annual_price: 215.88,
    annual_off_per: 25,
    action: "Upgrade",
    url: "/app/upgrade",
    features: [
      `Real-time automated process`,
      `Push down out of stock`,
      `Hide out of stock`,
      `Tag out of stock & hidden products`,
      `24/7 support`,
    ],
  },
].map((plan) => {
  return {
    ...plan,
    description: `Up to ${SubscriptionUtils.getPlanLimit(plan.name)?.maxProducts ?? 0} products & ${SubscriptionUtils.getPlanLimit(plan.name)?.maxCollections ?? 0} collections`,
  };
});

export const action = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);

  let { shop, isOnline } = session;
  shop = shop.replace(".myshopify.com", "");

  let isAdmin = false;  

  if (shop === "advanced-collection-sort.myshopify.com") {
    isAdmin = true;
  }

  const jsonData = await request.json();
  const { plan, action, interval } = jsonData;

  switch (action) {
    case "upgrade":
      // logger.debug(`Upgrading to plan ${plan.name}`);
      const upgradeResult = await billing.require({
        plans: [plan.name],
        onFailure: () =>
          billing.request({
            plan: plan.name,
            isTest: isAdmin ? true : false,
            returnUrl: `https://admin.shopify.com/store/${shop}/apps/${process.env.SHOPIFY_APP_HANDLE}/app`,
          }),
      });

      // logger.debug(`Upgrade result`, upgradeResult);
    case "cancel":
      try {
        const billingCheck = await billing.require({
          plans: [plan.name],
          onFailure: async () =>
            billing.request({
              plan: plan.name,
            }),
        });

        const subscription = billingCheck.appSubscriptions[0];
        await billing.cancel({
          subscriptionId: subscription.id,
          isTest: isAdmin ? true : false,
        });

        return {
          success: true,
          message: "Subscription cancelled successfully",
          action,
        };
      } catch {
        return {
          success: false,
          message:
            "Failed to cancel subscription. Please try again or contact support.",
          action,
        };
      }

    default:
      return {};
  }
};

export const loader = async ({ request }) => {
  const { billing, redirect, session } = await authenticate.admin(request);

  if (!session) {
    return null;
  }

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
    // logger.debug(
    //   `Shop is on plan ${subscription.name} (id ${subscription.id})`,
    // );
    const basePlan = SubscriptionUtils.getBasePlanName(subscription.name);
    // logger.debug(`Base plan is ${basePlan}`);
    const matchedPlanData = PLAN_DATA.find(
      (plan) => SubscriptionUtils.getBasePlanName(plan.name) === basePlan,
    );
    const index = PLAN_DATA.findIndex(
      (plan) => SubscriptionUtils.getBasePlanName(plan.name) === basePlan,
    );
    const { action } = matchedPlanData;

 
    return {
      billing, 
      plan: { ...subscription, action: action, index }
    };
  } catch (error) {
    if (error.message === "No active plan") {
      // logger.debug(`Shop doesnt not have any active plans.`);
      return {
        billing,
        plan: {
          name: "Free subscription",
          action: "Upgrade to starter",
          index: -1,
        },
      };
    }

    throw error;
  }
};

export default function PricingPage() {
  const { plan } = useLoaderData();
  const [recurringMethod, setRecurringMethod] = useState("Monthly");
  const fetcher = new useFetcher();

  // Function to handle the upgrade button click
  const handleUpgrade = async (plan) => {
    if (recurringMethod === "Yearly") {
      plan.name = `Annual ${plan.name}`;
    }
    await fetcher.submit(JSON.stringify({ plan: plan, action: "upgrade" }), {
      method: "post",
      encType: "application/json",
      json: true,
    });
  };

  // Function to handle the cancel button click
  const handleCancel = async (plan) => {
    // Perform the upgrade action here
    await fetcher.submit(JSON.stringify({ plan: plan, action: "cancel" }), {
      method: "post",
      encType: "application/json",
      json: true,
    });
  };

  const handleChangeRecurringMethod = useCallback(
    (value) => {
      setRecurringMethod(value);
    },
    [recurringMethod],
  );

  useEffect(() => {
    if (fetcher?.data?.action === "cancel") {
      if (fetcher?.data?.success) {
        shopify.toast.show(`Plan cancelled successfully.`);
      } else {
        shopify.toast.show(
          `Failed to cancel subscription. Please try again or contact support.`,
        );
      }
    }
  }, [fetcher?.data]);

  // === Handlers with useCallback ===
  const onCancelSubscription = useCallback(
    () => handleCancel(plan),
    [plan, handleCancel],
  );

  const onChangeRecurringMethod = useCallback(
    (method) => handleChangeRecurringMethod(method),
    [handleChangeRecurringMethod],
  );

  const onSelectPlan = useCallback(
    (planItem) => {
      planItem.name === "Free subscription"
        ? handleCancel(plan)
        : handleUpgrade(planItem);
    },
    [handleUpgrade, handleCancel, plan],
  );

  // === Helper Functions ===
  const isMatchedRecurring = useCallback(
    (planItem) => {
      return (
        (planItem.name.includes("Annual") && recurringMethod === "Yearly") ||
        (!planItem.name.includes("Annual") && recurringMethod === "Monthly")
      );
    },
    [recurringMethod],
  );

  const isCurrentPlan = useCallback(
    (planItem) => {
      return SubscriptionUtils.getBasePlanName(planItem.name) === SubscriptionUtils.getBasePlanName(plan.name);
    },
    [plan],
  );

  const getButtonLabel = useCallback(
    (planItem) => {
      if (isCurrentPlan(planItem)) {
        return isMatchedRecurring(planItem)
          ? "Current Plan"
          : planItem.name.includes("Free") ? 'Current Plan' : `Switch to ${recurringMethod}`;
      }
      return "Select";
    },
    [isCurrentPlan, isMatchedRecurring, recurringMethod],
  );

  // === Plan Card Component ===
  const PlanCard = memo(({ planItem }) => {
    const currentPlan = isCurrentPlan(planItem);
    const matchedRecurring = isMatchedRecurring(planItem);

    return (
      <Grid.Cell
        key={planItem.name}
        columnSpan={{ xs: 4, sm: 6, md: 3, lg: 4, xl: 4 }}
      >
        <Card>
          <Box padding="400">
            <BlockStack gap="200">
              <Text variant="headingMd" as="h3">
                {planItem.title}
              </Text>

              <Text variant="headingLg" as="h4" fontWeight="bold">
                {recurringMethod === "Monthly"
                  ? planItem.price == "0"
                    ? "Free"
                    : `$${planItem.price}/month`
                  : planItem.annual_price == "0"
                    ? "Free"
                    : `$${planItem.annual_price}/year`}
              </Text>

              <Box minHeight="25px">
                {recurringMethod === "Monthly" &&
                  planItem.annual_off_per > 0 && (
                    <Text
                      variant="bodyMd"
                      as="h4"
                      fontWeight="bold"
                      tone="success"
                    >
                      or ${planItem.annual_price}/year and save{" "}
                      {planItem.annual_off_per}%
                    </Text>
                  )}
              </Box>

              <Box as="p" variant="bodyMd" minHeight="30px">
                {planItem.description}
              </Box>

              <Divider borderColor="border-inverse" />

              <BlockStack gap="100">
                {planItem.features.map((feature, idx) => (
                  <ExceptionList
                    key={idx}
                    items={[{ icon: CheckIcon, description: feature }]}
                  />
                ))}
              </BlockStack>

              <hr />

              <Button
                variant="primary"
                size="large"
                disabled={planItem.name.includes("Free") ? currentPlan : (currentPlan && matchedRecurring)}
                onClick={() => onSelectPlan(planItem)}
              >
                {getButtonLabel(planItem)}
              </Button>
            </BlockStack>
          </Box>
        </Card>
      </Grid.Cell>
    );
  });

  return (
    <Page title="Pricing">
      <Card
        title={`Current Plan`}
        illustration="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd10aac7bd9c7ad02030f48cfa0.svg"
      >
        <BlockStack gap="200">
          <Text>
            You're currently on the <strong>{plan?.name}</strong> plan. Upgrade
            to higher plan to unlock more products and collections limit.

          </Text>

          {plan?.name !== "Free subscription" && (
            <InlineStack align="start">
              <Button
                onClick={() => handleCancel(plan)}
                tone="critical"
                variant="secondary"
                fullWidth={false}
              >
                Cancel Subscription
              </Button>
            </InlineStack>
          )}
        </BlockStack>
      </Card>

      <Box paddingBlock="200">
        <Divider />
      </Box>

      <Box align="center">
        <ButtonGroup variant="segmented">
          {["Monthly", "Yearly"].map((method) => (
            <Button
              key={method}
              pressed={recurringMethod === method}
              onClick={() => onChangeRecurringMethod(method)}
            >
              {method}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      <Grid>
        {PLAN_DATA.map((planItem) => (
          <PlanCard key={planItem.name} planItem={planItem} />
        ))}
      </Grid>
    </Page>
  );
}
