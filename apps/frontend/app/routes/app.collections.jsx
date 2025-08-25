BigInt.prototype.toJSON = function () {
  const int = Number.parseInt(this.toString());
  return int ?? this.toString();
};

// External packages
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useLoaderData } from "@remix-run/react";
import { useFetcher } from "react-router-dom";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  IndexTable,
  useIndexResourceState,
  InlineGrid,
  Icon,
  InlineStack,
  Pagination,
  Tabs,
  Box,
  Select,
  Spinner,
  ProgressBar,
  Banner,
  Tooltip,
  useBreakpoints,
  Link,
  useSetIndexFiltersMode,
  IndexFilters,
  IndexFiltersMode,
} from "@shopify/polaris";
import { RefreshIcon, InfoIcon } from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  SubscriptionUtils,
  STATUS_FILTER,
  isNotEmptyStringAndNull,
} from "@acme/core";

import {
  // getLogger,
  MerchantService,
  MerchantGraphql,
  ProductController,
  CollectionController,
  SubscriptionService,
  SubscriptionController,
} from "@acme/core/server";

import { StoreStatsCard } from "../components/StoreStatsCard";
import Switch from "../components/Switch";

// Utilities and config
import prisma from "@acme/db";
import { useDebounce } from "../lib/useDebounce";
import { enqueueBulkOperationForPushDownMany } from "@acme/queue";

// const logger = getLogger("frontend");

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

const STATUS_TABS = [
  { id: "ALL", content: "All Collections" },
  { id: "ACTIVE", content: "Active Collections" },
  { id: "INACTIVE", content: "Inactive Collections" },
];

export const shouldRevalidate = ({
  actionResult,
  formAction,
  formMethod,
  defaultShouldRevalidate,
}) => {
  if (formMethod === "POST" && "updatedCollections" in actionResult) {
    return false; // Don't revalidate if sorting was updated
  }

  return defaultShouldRevalidate;
};

export const loader = async ({ request }) => {
  const { session, billing, admin } = await authenticate.admin(request);
  const { shop, isOnline } = session;

  if (!session) {
    return {
      status: 401,
      error: "Unauthorized",
    };
  }

  // Pagination variables Handling
  const url = new URL(request.url);
  const getCollectionsPage = parseInt(url.searchParams.get("page") || "1");
  const getCollectionsPageSize =
    parseInt(url.searchParams.get("pageSize")) || 25;
  const getCollectionsStatus =
    url.searchParams.get("status") || STATUS_FILTER.ALL; // Default is 'all'
  const query = url.searchParams.get("query") || null;

  let whereClause = { shop };
  if (getCollectionsStatus === STATUS_FILTER.ACTIVE) {
    whereClause = { ...whereClause, isActive: true };
  } else if (getCollectionsStatus === STATUS_FILTER.INACTIVE) {
    whereClause = { ...whereClause, isActive: false };
  }

  if (isNotEmptyStringAndNull(query)) {
    whereClause = {
      ...whereClause,
      title: {
        contains: query,
        mode: "insensitive",
      },
    };
  }

  const subscriptionController = new SubscriptionController();
  const subscriptionService = new SubscriptionService();
  const merchantService = new MerchantService();

  const { plan } = await subscriptionController.getCurrentSubscription(
    billing,
    !isOnline,
  );

  const [collections, resultCount, merchant] = await prisma.$transaction([
    prisma.collection.findMany({
      where: whereClause,
      skip: (getCollectionsPage - 1) * getCollectionsPageSize,
      take: getCollectionsPageSize,
      orderBy: {
        title: "asc", // Sort by title or customize as per your defaultSorting logic
      },
    }),
    prisma.collection.count({
      where: whereClause,
    }),
    prisma.merchant.findUnique({
      where: {
        shop,
      },
      select: {
        productCount: true,
        collectionCount: true,
        activePlan: true,
      },
    }),
  ]);

  if (plan && plan.name !== merchant.activePlan) {
    await subscriptionService.upsertSubscription(shop, {
      name: plan.name,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await merchantService.updateMerchant(shop, {
      activePlan: plan.name,
    });
  }

  const isOverLimit = SubscriptionUtils.isOverPlanLimit(merchant, plan.name);

  return {
    collections: collections,
    merchant: merchant,
    page: getCollectionsPage,
    pageCount: Math.ceil(resultCount / getCollectionsPageSize),
    status: getCollectionsStatus,
    plan: plan,
    isOverLimit: isOverLimit,
  };
};

export const action = async ({ request }) => {
  const { admin, redirect, session } = await authenticate.admin(request);
  const { shop } = session;

  const formData = await request.formData();
  const action = formData.get("action");

  const collectionController = new CollectionController(admin, shop);
  const productController = new ProductController(admin);
  const merchantGraphql = new MerchantGraphql(admin);
  const merchantService = new MerchantService();

  let collectionID, collectionIDS, currentSorting, enableCollection;

  switch (action) {
    case "PUSH_DOWN":
      collectionID = formData.get("collectionID");
      return await collectionController.sortCollection(collectionID, shop);
    case "UPDATE_SORTING":
      collectionID = formData.get("collectionID");
      currentSorting = formData.get("sortingRule");
      return await collectionController.updateCollectionSortingRule(
        collectionID,
        currentSorting,
      );
    case "UPDATE_COLLECTIONS_STATUS":
      collectionIDS = JSON.parse(formData.get("collectionIDS", []));
      enableCollection = formData.get("enableCollection");
      if (collectionIDS.length <= 0) {
        return {
          error: "No collection selected",
        };
      }

      switch (enableCollection) {
        case "1":
          await enqueueBulkOperationForPushDownMany(shop, collectionIDS, { ttl: 1000 });
          return await collectionController.enableCollections(collectionIDS);
        default:
          return await collectionController.disableCollections(collectionIDS);
      }
    case "SETUP_DATA":
      try {
        const { shop: ShopifyShop } = await merchantGraphql.getShop({});
        await merchantService.upsertMerchant(shop, ShopifyShop);
        await collectionController.syncStoreCollections(shop);
        await productController.syncStoreProducts(shop);
        await productController.syncStorePublications(shop);
      } catch (error) {
        // logger.error("Error syncing store data", error);
      }
      return { success: true };
    default:
      return {};
  }
};

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
  onStatusChange,
  onSortingChange,
  onPushDown,
  selected,
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

  // Local event handlers
  const handleToggle = useCallback(() => {
    onStatusChange(!isActive, Number(collectionID));
  }, [onStatusChange, isActive, collectionID]);

  const handleSortingChangeLocal = useCallback(
    (selectedValue) => onSortingChange(selectedValue, collectionID),
    [onSortingChange, collectionID],
  );

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
      selected={selected}
      position={index}
      rowType="subheader"
      tone="success"
    >
      <IndexTable.Cell>
        <Switch label="" checked={isActive} onChange={handleToggle} />
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
            onChange={handleSortingChangeLocal}
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

/*
  ConfirmationModal Component
  -----------------------------
  - A generic modal component to confirm actions.
  - Accepts message, title, onConfirm, onCancel and modalId.
*/
function ConfirmationModal({ modalId, title, message, onConfirm, onCancel }) {
  return (
    <ui-modal id={modalId}>
      <Box padding="300" width="auto">
        <Text>{message}</Text>
      </Box>
      <TitleBar title={title}>
        <button variant="primary" onClick={onConfirm}>
          Yes, Change Status Of Collections
        </button>
        <button onClick={onCancel}>Cancel</button>
      </TitleBar>
    </ui-modal>
  );
}

export default function Index() {
  const fetcher = useFetcher();
  const storeSyncFetcher = useFetcher();
  const { collections, merchant, page, pageCount, plan, isOverLimit } =
    useLoaderData();

  // Local state
  const [currentCollections, setCurrentCollections] = useState(collections);
  const [currentPageCount, setCurrentPageCount] = useState(pageCount);
  const [currentPage, setCurrentPage] = useState(page);
  const [currentStatusFilter, setCurrentStatusFilter] = useState(0);
  const [bulkEnableIDs, setBulkEnableIDs] = useState([]);
  const [bulkDisableIDs, setBulkDisableIDs] = useState([]);
  const [bulkActionType, setBulkActionType] = useState(null);

  // Hooks for resource selection in the table
  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(currentCollections, {
    resourceIDResolver: (resource) => resource.collectionID,
  });

  // Update collections when fetcher returns new data
  useEffect(() => {
    if (fetcher?.data?.collections) {
      setCurrentCollections(fetcher.data.collections);
      setCurrentPageCount(fetcher.data.pageCount);
    }
  }, [fetcher.data?.collections]);

  // Update collections if individual items have been updated
  useEffect(() => {
    if (fetcher?.data?.updatedCollections) {
      setCurrentCollections((prevCollections) => {
        const updatedMap = new Map(
          fetcher.data.updatedCollections.map((item) => [
            item.collectionID,
            item,
          ]),
        );
        let updatedCollections = prevCollections.map(
          (col) => updatedMap.get(col.collectionID) || col,
        );
        // Re-apply filter if necessary
        if (STATUS_TABS[currentStatusFilter].id === "ACTIVE") {
          updatedCollections = updatedCollections.filter((col) => col.isActive);
        } else if (STATUS_TABS[currentStatusFilter].id === "INACTIVE") {
          updatedCollections = updatedCollections.filter(
            (col) => !col.isActive,
          );
        }
        clearSelection();
        return updatedCollections;
      });
    }
  }, [fetcher.data?.updatedCollections, currentStatusFilter, clearSelection]);

  // Update bulk actions based on selected resources
  useEffect(() => {
    const selectedCollections = currentCollections.filter((col) =>
      selectedResources.includes(col.collectionID),
    );
    setBulkEnableIDs(
      selectedCollections
        .filter((col) => !col.isActive)
        .map((col) => col.collectionID),
    );
    setBulkDisableIDs(
      selectedCollections
        .filter((col) => col.isActive)
        .map((col) => col.collectionID),
    );
  }, [selectedResources, currentCollections]);

  // Callback handlers (memoized to avoid unnecessary re-renders)
  const handleStatusFilterChange = useCallback((selectedStatus) => {
    setCurrentStatusFilter(selectedStatus);
    setCurrentPage(1); // Reset page on filter change
  }, []);

  const handlePaginationChange = useCallback((newPage) => {
    setCurrentPage(newPage);
  }, []);

  const { mode, setMode } = useSetIndexFiltersMode(IndexFiltersMode.Filtering);

  const [queryValue, setQueryValue] = useState("");
  const debouncedQuery = useDebounce(queryValue, 500);
  const handleFiltersQueryChange = useCallback(
    (value) => setQueryValue(value),
    [],
  );
  const handleQueryValueRemove = useCallback(() => setQueryValue(""), []);
  const handleFiltersClearAll = useCallback(() => {
    handleQueryValueRemove();
  }, [handleQueryValueRemove]);

  const fetchCollections = useCallback(() => {
    fetcher.submit(
      {
        action: "GET_COLLECTIONS",
        page: currentPage,
        pageSize: 25,
        query: isNotEmptyStringAndNull(debouncedQuery) ? debouncedQuery : "",
        status: STATUS_TABS[currentStatusFilter].id,
      },
      { method: "get" },
    );
  }, [currentPage, currentStatusFilter, debouncedQuery, fetcher]);

  useEffect(() => {
    fetchCollections();
  }, [currentPage, currentStatusFilter, debouncedQuery]);

  const handleSortingChange = useCallback(
    (sortingRule, collectionID) => {
      fetcher.submit(
        {
          action: "UPDATE_SORTING",
          collectionID,
          sortingRule,
        },
        { method: "POST" },
      );
    },
    [fetcher],
  );

  const handlePushDown = useCallback(
    (collectionID) => {
      fetcher.submit(
        {
          action: "PUSH_DOWN",
          collectionID,
        },
        { method: "POST" },
      );
    },
    [fetcher],
  );

  const handleStatusChange = useCallback((nextChecked, collectionID) => {
    // For single collection, set the corresponding bulk action
    if (nextChecked) {
      setBulkActionType(1);
      setBulkEnableIDs([collectionID]);
    } else {
      setBulkActionType(2);
      setBulkDisableIDs([collectionID]);
    }
    // You could also store the single collection in a dedicated state if desired.
    shopify.modal.show("confirm-collection-sorting-modal");
  }, []);

  const handleUpdateCollectionStatus = useCallback(() => {
    let collectionIDS = [];
    if (bulkActionType === 1 && bulkEnableIDs.length > 0) {
      collectionIDS = bulkEnableIDs;
    } else if (bulkActionType === 2 && bulkDisableIDs.length > 0) {
      collectionIDS = bulkDisableIDs;
    }
    if (collectionIDS.length > 0 && bulkActionType != null) {
      fetcher.submit(
        {
          action: "UPDATE_COLLECTIONS_STATUS",
          collectionIDS: JSON.stringify(collectionIDS),
          enableCollection: bulkActionType,
        },
        { method: "POST" },
      );
    }
  }, [bulkActionType, bulkEnableIDs, bulkDisableIDs, fetcher]);

  // Trigger store sync on component mount
  useEffect(() => {
    storeSyncFetcher.submit({ action: "SETUP_DATA" }, { method: "POST" });
  }, []);

  // Bulk actions for the table
  const promotedBulkActions = useMemo(() => {
    const actions = [];
    if (bulkEnableIDs.length > 0) {
      actions.push({
        content: `Enable: ${bulkEnableIDs.length} Collections`,
        onAction: () => {
          setBulkActionType(1);
          shopify.modal.show("confirm-collection-sorting-modal");
        },
      });
    }
    if (bulkDisableIDs.length > 0) {
      actions.push({
        content: `Disable: ${bulkDisableIDs.length} Collections`,
        onAction: () => {
          setBulkActionType(2);
          shopify.modal.show("confirm-collection-sorting-modal");
        },
      });
    }
    return actions;
  }, [bulkEnableIDs, bulkDisableIDs]);

  // Resource name for the IndexTable
  const resourceName = useMemo(
    () => ({
      singular: "collection",
      plural: "collections",
    }),
    [],
  );

  const modalTitle = useMemo(() => {
    if (bulkActionType === 1) {
      return `Enable ${bulkEnableIDs.length} collections?`;
    } else if (bulkActionType === 2) {
      return `Disable ${bulkDisableIDs.length} collections?`;
    }
    return "";
  }, [bulkActionType, bulkEnableIDs.length, bulkDisableIDs.length]);

  const modalMessage = useMemo(() => {
    if (bulkActionType === 1) {
      return `We’ll keep the current product order for these ${bulkEnableIDs.length} collections and switch Shopify to manual sorting so our app can automatically manage sold-out items. Proceed?`;
    } else if (bulkActionType === 2) {
      return `We’ll revert these ${bulkDisableIDs.length} collections to Shopify’s default sort order and stop automatically managing sold-out items. Proceed?`;
    }
    return "";
  }, [bulkActionType, bulkEnableIDs.length, bulkDisableIDs.length]);

  return (
    <Page
      title="Collections"
      secondaryActions={<Button url={`/app/subscription`}>Review Plan</Button>}
    >
      <BlockStack gap="300">
        {isOverLimit && (
          <Banner
            title="Your store has outgrown its current plan. Please upgrade to continue using the app."
            tone="warning"
            action={{ content: "Upgrade now", url: "/app/subscription" }}
            secondaryAction={{
              content: "Review plan",
              url: "/app/subscription",
            }}
          >
            <BlockStack gap="100">
              <p>
                <strong>Current plan:</strong> {plan.name} up to{" "}
                {SubscriptionUtils.limitDescription(plan.name)}
              </p>
              <p>
                <strong>Products in this store:</strong> {merchant.productCount}
              </p>
              <p>
                <strong>Collections in this store:</strong>{" "}
                {merchant.collectionCount}
              </p>
            </BlockStack>
          </Banner>
        )}
        {process.env.NODE_ENV !== "production" && (
          <Text variant="bodyMd" as="p" tone="critical">
            <strong>Debug:</strong> Merchant active plan is{" "}
            {merchant.activePlan}
          </Text>
        )}

        <StoreStatsCard merchant={merchant} plan={plan} />

        <Layout>
          <Layout.Section variant="fullWidth">
            {/* Global loading overlay when submitting */}
            {fetcher.state === "submitting" && (
              <Box
                style={{
                  zIndex: 99,
                  position: "fixed",
                  width: "100%",
                  height: "100%",
                  top: 0,
                  left: 0,
                  background: "var(--p-color-backdrop-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BlockStack align="center" inlineAlign="center" gap="100">
                  <Spinner
                    style={{ color: "white" }}
                    size="large"
                    accessibilityLabel="Processing..."
                  />
                  <p style={{ color: "white" }}>
                    We're working... Please don't close the window.
                  </p>
                </BlockStack>
              </Box>
            )}

            <Card>
              <BlockStack gap="400">
                <InlineGrid columns={["twoThirds", "auto"]} alignItems="center">
                  <Tabs
                    selected={currentStatusFilter}
                    onSelect={handleStatusFilterChange}
                    tabs={STATUS_TABS}
                  />
                  <IndexFilters
                    autoFocusSearchField={true}
                    queryValue={queryValue}
                    queryPlaceholder="Searching collections..."
                    onQueryChange={handleFiltersQueryChange}
                    onQueryClear={() => setQueryValue("")}
                    onClearAll={handleFiltersClearAll}
                    appliedFilters={[]}
                    filters={[]}
                    tabs={[]}
                    mode={mode}
                    setMode={setMode}
                  />
                </InlineGrid>

                <IndexTable
                  condensed={useBreakpoints().smDown}
                  itemCount={currentCollections.length}
                  resourceName={resourceName}
                  selectedItemsCount={
                    allResourcesSelected ? "All" : selectedResources.length
                  }
                  onSelectionChange={handleSelectionChange}
                  promotedBulkActions={promotedBulkActions}
                  headings={[
                    { title: "Status" },
                    { title: "Title" },
                    { title: "Action", hidden: true },
                    { title: "Sorted By" },
                    { title: "Last Run At" },
                    { title: "Stock Level" },
                  ]}
                  loading={
                    fetcher.state === "loading" &&
                    fetcher.formData?.get("action") === "GET_COLLECTIONS"
                  }
                >
                  {currentCollections.map((col, idx) => (
                    <CollectionRow
                      key={col.collectionID}
                      collection={col}
                      index={idx}
                      sortingOptions={SORTING_OPTIONS}
                      onStatusChange={handleStatusChange}
                      onSortingChange={handleSortingChange}
                      onPushDown={handlePushDown}
                      selected={selectedResources.includes(col.collectionID)}
                      timezone={merchant.timezone}
                    />
                  ))}
                </IndexTable>

                <Pagination
                  label={`Page ${currentPage} of ${currentPageCount}`}
                  hasPrevious={currentPage > 1}
                  hasNext={currentPage < currentPageCount}
                  onPrevious={() => handlePaginationChange(currentPage - 1)}
                  onNext={() => handlePaginationChange(currentPage + 1)}
                  previousText="Previous"
                  nextText="Next"
                />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Confirmation modals */}
        <ConfirmationModal
          modalId="confirm-collection-sorting-modal"
          title={modalTitle}
          message={modalMessage}
          onConfirm={() => {
            handleUpdateCollectionStatus();
            shopify.modal.hide("confirm-collection-sorting-modal");
          }}
          onCancel={() =>
            shopify.modal.hide("confirm-collection-sorting-modal")
          }
        />

        <ui-modal id="over-limit-modal">
          <Box padding="300" width="auto">
            <Text>
              You have reached the limit of your current plan. Please upgrade to
              a higher plan to unlock more products and collections.
            </Text>
          </Box>
          <TitleBar title="Upgrade your plan?">
            <button variant="primary" url="/app/pricing">
              Upgrade Plan
            </button>
            <button onClick={() => shopify.modal.hide("over-limit-modal")}>
              Close
            </button>
          </TitleBar>
        </ui-modal>
      </BlockStack>
    </Page>
  );
}
