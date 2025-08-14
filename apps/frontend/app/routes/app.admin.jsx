import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Card,
  Page,
  Layout,
  Select,
  Button,
  Text,
  Spinner,
  TextField,
  IndexTable,
  Link,
  InlineStack,
  Tooltip,
  Icon,
  BlockStack,
  ProgressBar,
} from "@shopify/polaris";
import { InfoIcon, RefreshIcon } from "@shopify/polaris-icons";
import Switch from "../components/Switch";

import { authenticate, unauthenticated } from "../shopify.server";

import {
  CollectionService,
  MerchantGraphql,
  ProductController,
  CollectionController,
  MerchantService,
  AppGraphql,
  getLogger
} from "@acme/core/server"

const logger = getLogger("frontend");

// Constants (defined outside the component to avoid re-creation on renders)
const SORTING_OPTIONS = [
  { label: "Best Selling", value: "BEST_SELLING" },
  { label: "Manual", value: "MANUAL" },
  { label: "Product Title A-Z", value: "ALPHA_ASC" },
  { label: "Product Title Z-A", value: "ALPHA_DESC" },
  { label: "Highest Price", value: "PRICE_ASC" },
  { label: "Lowest Price", value: "PRICE_DESC" },
  { label: "Newest", value: "CREATED" },
  { label: "Oldest", value: "CREATED_DESC" },
];

/* 
  CollectionRow Component
  -------------------------
  - Extracts each table row into a separate memoized component.
  - Receives handlers and data via props.
*/
const CollectionRow = memo(function CollectionRow({
  collection,
  index,
  sortingOptions,
  onPushDown,
  timezone,
}) {
  const {
    collectionID,
    title,
    isActive,
    currentSorting,
    OOSCount,
    productsCount,
    lastRunAt,
  } = collection;

  // Status display component
  const StatusComponent = useMemo(() => {
    if (!isActive) return null;
    if (productsCount === null || OOSCount === null) {
      return (
        <Tooltip
          content={
            <Text as="span" variant="bodyMd" tone="subdued">
              Update in next run
            </Text>
          }
        >
          <Icon source={InfoIcon} accessibilityLabel="Stats unavailable" />
        </Tooltip>
      );
    }
    if (productsCount === 0) {
      return <Text as="span">Empty</Text>;
    }
    return (
      <BlockStack>
        <ProgressBar progress={(OOSCount / productsCount) * 100} />
        <Text as="span">
          {OOSCount} / {productsCount} out of stock
        </Text>
      </BlockStack>
    );
  }, [isActive, OOSCount, productsCount]);

  // Format datetime to a readable string
  const formattedDate = lastRunAt
    ? new Date(lastRunAt).toLocaleString("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not yet sorted";

  return (
    <IndexTable.Row
      id={collectionID}
      key={collectionID}
      position={index}
      rowType="subheader"
      tone="success"
    >
      <IndexTable.Cell>
        <Switch label="" checked={isActive} />
      </IndexTable.Cell>
      <IndexTable.Cell>
        {/* <InlineGrid columns={["twoThirds", "oneThird"]} alignItems="center"> */}
        <div style={{ width: "250px", whiteSpace: "wrap" }}>
          <Link
            url={`shopify://admin/collections/${collectionID}`}
            target="_blank"
          >
            <Text fontWeight="bold" as="h2" breakWord>
              {title}
            </Text>
          </Link>
        </div>
        {/* </InlineGrid> */}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <InlineStack alignment="end" alignItems="center" gap="200">
          {isActive && (
            <Tooltip
              content={
                <Text as="span" variant="bodyMd" tone="subdued">
                  Run sorting now
                </Text>
              }
            >
              <Button onClick={() => onPushDown(collectionID)} size="micro">
                <Icon source={RefreshIcon} />
              </Button>
            </Tooltip>
          )}
        </InlineStack>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <div style={{ width: "150px", whiteSpace: "wrap" }}>
          <Select
            disabled={!isActive}
            options={sortingOptions}
            onChange={() => {}}
            value={currentSorting}
          />
        </div>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span">{formattedDate}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{StatusComponent}</IndexTable.Cell>
    </IndexTable.Row>
  );
});

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  // Check if the user is an admin
  if (shop !== "advanced-collection-sort.myshopify.com") {
    throw new Response("Unauthorized", { status: 403 });
  }

  const merchantService = new MerchantService();

  // Replace with your actual method to get merchants
  const merchants = await merchantService.getMerchants({});
  return { merchants };
};

// /routes/admin/query.jsx
export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  // Check if the user is an admin
  if (shop !== "advanced-collection-sort.myshopify.com") {
    throw new Response("Unauthorized", { status: 403 });
  }

  const jsonData = await request.json();
  const { action, selectedMerchant, ...data } = jsonData;

  if (!selectedMerchant) {
    throw new Response("Selected merchant is required", { status: 400 });
  }

  const { admin } = await unauthenticated.admin(selectedMerchant);
  if (!admin) {
    throw new Response("Unauthorized", { status: 403 });
  }

  const merchantService = new MerchantService();
  const collectionController = new CollectionController(
    admin,
    selectedMerchant,
  );
  const collectionService = new CollectionService();
  const productController = new ProductController(admin);
  const merchantGraphql = new MerchantGraphql(admin);
  const appGraphql = new AppGraphql(admin);

  switch (action) {
    case "PUSH_DOWN":
      const { collectionID } = data;
      const pushDownResult = await collectionController.sortCollection(
        collectionID,
        selectedMerchant,
      );
      logger.info(`Push down result for ${collectionID}:`, pushDownResult);
      return pushDownResult;
    case "getMerchantSubscription":
      // Subscriptions
      const { app } = await appGraphql.getAppByHandle({
        handle: process.env.SHOPIFY_APP_HANDLE,
      });
      const subscriptions = app.installation?.activeSubscriptions || [];
      const subscription = subscriptions?.length > 0 ? subscriptions[0] : null;

      return subscription;

    case "getMerchantCollections":
      // Collections
      const collections = await collectionService.getManyCollections({
        shop: selectedMerchant,
      });
      return collections;
    case "runGraphQLQuery":
      const { query, variables } = data;
      try {
        const queryRes = await admin.graphql(query, {
          variables: JSON.parse(variables),
        });
        const queryJson = await queryRes.json();
        const queryResult = queryJson.data;
        return queryResult;
      } catch (error) {
        logger.error("GraphQL Query Error:", error);
        return {
          success: false,
          message: "Error executing GraphQL query",
          error: error.message,
        };
      }
    case "SETUP_DATA":
      try {
        const { shop: ShopifyShop } = await merchantGraphql.getShop({});
        const forceSync = true;
        await merchantService.upsertMerchant(selectedMerchant, ShopifyShop);
        await collectionController.syncStoreCollections(
          selectedMerchant,
          forceSync,
        );
        await productController.syncStoreProducts(selectedMerchant, forceSync);
        await productController.syncStorePublications(selectedMerchant);
        return { success: true };
      } catch (error) {
        logger.error("Error syncing store data", error);
        return {
          success: false,
          message: `Error syncing store data: ${error?.message}`,
        };
      }
    default:
      throw new Response("Invalid action", { status: 400 });
  }
};

export default function AdminMerchantPage() {
  const { merchants } = useLoaderData();
  const fetcher = useFetcher();
  const subscriptionFetcher = useFetcher();
  const collectionFetcher = useFetcher();
  const pushDownFetcher = useFetcher();
  const syncStoreFetcher = useFetcher();
  const [selectedMerchant, setSelectedMerchant] = useState("");
  const [currentCollections, setCurrentCollections] = useState([]);
  const [query, setQuery] =
    useState(`mutation AppSubscriptionTrialExtend($id: ID!, $days: Int!) {
    appSubscriptionTrialExtend(id: $id, days: $days) {
      userErrors {
        field
        message
        code
      }
      appSubscription {
        id
        status
      }
    }
  }`);
  const [variables, setVariables] = useState(`{
      "id": "gid://shopify/AppSubscription/443388186",
      "days": 10
    }`);

  const merchantOptions = merchants.map((merchant) => ({
    label: merchant.shop,
    value: merchant.shop,
  }));

  const handleSelectChange = (value) => setSelectedMerchant(value);

  const handleMerchantChange = () => {
    if (!selectedMerchant) {
      return;
    }
    subscriptionFetcher.submit(
      {
        action: "getMerchantSubscription",
        selectedMerchant: selectedMerchant,
      },
      {
        method: "post",
        encType: "application/json",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    collectionFetcher.submit(
      {
        action: "getMerchantCollections",
        selectedMerchant: selectedMerchant,
      },
      {
        method: "post",
        encType: "application/json",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  };

  const handleSyncStoreData = () => {
    if (!selectedMerchant) {
      return;
    }
    syncStoreFetcher.submit(
      {
        action: "SETUP_DATA",
        selectedMerchant: selectedMerchant,
      },
      {
        method: "post",
        encType: "application/json",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  };

  const handleQuery = () => {
    // Fetcher submit json data
    fetcher.submit(
      {
        selectedMerchant: selectedMerchant,
        action: "runGraphQLQuery",
        query: query,
        variables: variables,
      },
      {
        method: "post",
        encType: "application/json",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  };

  const handlePushDown = useCallback(
    (collectionID) => {
      pushDownFetcher.submit(
        {
          action: "PUSH_DOWN",
          collectionID,
          selectedMerchant: selectedMerchant,
        },
        {
          method: "POST",
          encType: "application/json",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    },
    [pushDownFetcher, selectedMerchant],
  );

  useEffect(() => {
    handleMerchantChange(selectedMerchant);
  }, [selectedMerchant]);

  useEffect(() => {
    if (syncStoreFetcher.data?.success) {
      shopify.toast.show("Store data synced successfully!");
    }
  }, [syncStoreFetcher.data]);

  // Set collections when collectionFetcher data changes
  useEffect(() => {
    if (collectionFetcher.data) {
      setCurrentCollections(collectionFetcher.data);
    }
  }, [collectionFetcher.data]);

  // Update collections if individual items have been updated
  useEffect(() => {
    if (pushDownFetcher?.data?.updatedCollections) {
      setCurrentCollections((prevCollections) => {
        const updatedMap = new Map(
          pushDownFetcher.data.updatedCollections.map((item) => [
            item.collectionID,
            item,
          ]),
        );
        let updatedCollections = prevCollections.map(
          (col) => updatedMap.get(col.collectionID) || col,
        );
        return updatedCollections;
      });

      shopify.toast.show(`Run sorting successfully`, { duration: 1500 });
    }
  }, [pushDownFetcher.data?.updatedCollections]);

  const selectedMerchantData = memo(() => {
    return selectedMerchant
      ? merchants.find((m) => m.shop === selectedMerchant)
      : null;
  }, [selectedMerchant, merchants]);

  return (
    <Page
      title="Merchant Query Admin"
      primaryAction={{
        content: "Sync Store Data",
        onAction: handleSyncStoreData,
        disabled: !selectedMerchant,
      }}
    >
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <Select
              label="Select a merchant"
              options={merchantOptions}
              onChange={handleSelectChange}
              value={selectedMerchant}
              placeholder="Choose a merchant"
            />
          </Card>
        </Layout.Section>

        {(fetcher.state === "loading" ||
          subscriptionFetcher.state === "loading") && (
          <Layout.Section>
            <Card sectioned>
              <Spinner accessibilityLabel="Loading" size="large" />
            </Card>
          </Layout.Section>
        )}

        {subscriptionFetcher.data && (
          <Layout.Section>
            <Card title="Query Result" sectioned>
              {subscriptionFetcher.data && (
                <div>
                  <Text variant="headingSm" as="h3" fontWeight="bold">
                    Subscription Status:{" "}
                    <Text
                      as="span"
                      color={
                        subscriptionFetcher.data.status === "active"
                          ? "success"
                          : "critical"
                      }
                    >
                      {subscriptionFetcher.data.status?.toUpperCase()}
                    </Text>
                  </Text>

                  <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
                    <Text variant="bodySm" as="p" color="subdued">
                      Created:{" "}
                      {new Date(
                        subscriptionFetcher.data.createdAt,
                      ).toLocaleString()}
                    </Text>
                    <Text variant="bodySm" as="p" color="subdued">
                      Current period end:{" "}
                      {new Date(
                        subscriptionFetcher.data.currentPeriodEnd,
                      ).toLocaleString()}
                    </Text>
                  </div>

                  <div style={{ marginTop: "1rem" }}>
                    <Text variant="bodyMd" as="p">
                      <strong>Plan:</strong>{" "}
                      {subscriptionFetcher.data.name || "No plan data"}
                    </Text>
                    <Text variant="bodyMd" as="p">
                      <strong>ID:</strong>{" "}
                      {subscriptionFetcher.data.id || "N/A"}
                    </Text>
                    {subscriptionFetcher.data.trialDays && (
                      <Text variant="bodyMd" as="p">
                        <strong>Trial Days:</strong>{" "}
                        {subscriptionFetcher.data.trialDays}
                      </Text>
                    )}
                    {subscriptionFetcher.data.currentPeriodEnd && (
                      <Text variant="bodyMd" as="p">
                        <strong>Current Period End:</strong>{" "}
                        {new Date(
                          subscriptionFetcher.data.currentPeriodEnd,
                        ).toLocaleDateString()}
                      </Text>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </Layout.Section>
        )}

        {collectionFetcher.data && currentCollections.length && (
          <Layout.Section>
            <Card title="Merchant Collections" sectioned>
              <IndexTable
                condensed={false}
                itemCount={currentCollections.length}
                resourceName={{
                  singular: "collection",
                  plural: "collections",
                }}
                headings={[
                  { title: "Status" },
                  { title: "Title" },
                  { title: "Action", hidden: true },
                  { title: "Sorted By" },
                  { title: "Last Run At" },
                  { title: "Stock Level" },
                ]}
                loading={
                  collectionFetcher.state === "loading" &&
                  collectionFetcher.formData?.get("action") ===
                    "getMerchantCollections"
                }
              >
                {currentCollections.map((col, idx) => (
                  <CollectionRow
                    key={col.collectionID}
                    collection={col}
                    sortingOptions={SORTING_OPTIONS}
                    index={idx}
                    onPushDown={handlePushDown}
                    timezone={selectedMerchantData.timezone}
                  />
                ))}
              </IndexTable>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card sectioned>
            <div style={{ marginTop: "1rem" }}>
              <TextField
                label="GraphQL Query"
                value={query}
                onChange={(value) => setQuery(value)}
                multiline={4}
                placeholder="Enter your GraphQL query here..."
              />
            </div>

            <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
              <TextField
                label="GraphQL Variables (JSON)"
                value={variables}
                onChange={(value) => setVariables(value)}
                multiline={2}
                placeholder='{"key": "value"}'
              />
            </div>

            <Button onClick={handleQuery} disabled={!selectedMerchant} primary>
              Query Merchant Data
            </Button>
          </Card>
        </Layout.Section>

        {fetcher.data && (
          <Layout.Section>
            <Card title="GraphQL Query Result" sectioned>
              <pre>{JSON.stringify(fetcher.data, null, 2)}</pre>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
