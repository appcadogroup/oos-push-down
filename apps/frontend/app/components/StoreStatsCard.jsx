import {
  BlockStack,
  Card,
  InlineGrid,
  InlineStack,
  Text,
} from "@shopify/polaris";
import { SubscriptionUtils } from "@acme/core";

export const StoreStatsCard = ({ merchant, plan }) => {
  const planLimit = SubscriptionUtils.getPlanLimit(plan.name);
  return (
    <Card>
      <InlineGrid columns={2} gap="300">
        <BlockStack gap="100">
          <Text as="h2" variant="titleLg" alignment="center">
            Total Products
          </Text>
          <InlineStack blockAlign="end" align="center" gap="100">
            <Text as="p" variant="headingLg" alignment="center">
              {merchant?.productCount}
            </Text>
            <Text as="span" variant="titleLg" alignment="center">
              of {planLimit.maxProducts} Plan Limit
            </Text>
          </InlineStack>
          {/* <ProgressBar
              progress={(parseFloat(merchant?.productCount) / 100) * 100}
              size="small"
              tone="primary"
              animated={false}
            /> */}
        </BlockStack>

        <BlockStack gap="100">
          <Text as="h2" variant="titleLg" alignment="center">
            Total Collections
          </Text>
          <InlineStack blockAlign="end" align="center" gap="100">
            <Text as="p" variant="headingLg" alignment="center">
              {merchant?.collectionCount}
            </Text>
            <Text as="span" variant="titleLg" alignment="center">
              of {planLimit.maxCollections} Plan Limit
            </Text>
          </InlineStack>
          {/* <ProgressBar
              progress={(parseFloat(merchant?.collectionCount) / 100) * 100}
              size="small"
              tone="critical"
              animated={false}
            /> */}
        </BlockStack>
      </InlineGrid>
    </Card>
  );
};
