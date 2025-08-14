import prisma from "@acme/db";
import { authenticate } from "../shopify.server";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AutoSelection,
  BlockStack,
  Box,
  Card,
  Checkbox,
  Combobox,
  EmptySearchResult,
  InlineGrid,
  InlineStack,
  Listbox,
  Page,
  Select,
  Tag,
  Text,
  TextField,
  useBreakpoints,
} from "@shopify/polaris";

import { useAppBridge } from "@shopify/app-bridge-react";
import { fetchAllData } from "../lib/shopify-graphql/shopify";
import {
  HidingChannelOptions,
  findModifiedKeys,
  getDeepValue,
  isEmpty,
  setDeepValue,
} from "@acme/core";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;

  const tags = await fetchAllData(
    admin,
    `query ($first: Int!, $after: String) {
        productTags(first: $first, after: $after) {
          nodes 
          pageInfo {
            hasNextPage
            endCursor
          }
        }
    }`,
    { first: 5000 },
    "productTags",
    true,
  );

  const currentMerchant = await prisma.merchant.findUnique({
    where: {
      shop: shop,
    },
  });
  return { tags, currentMerchant };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;
  const body = await request.json();

  const updatedMerchant = await prisma.merchant.update({
    where: {
      shop: shop,
    },
    data: body,
  });
  return { success: true, updatedMerchant };
};

export default function ShopPage() {
  const { smUp } = useBreakpoints();
  const shopify = useAppBridge();
  const { tags = [], currentMerchant = {} } = useLoaderData();
  const fetcher = useFetcher();

  const [shop, setShop] = useState(currentMerchant);
  const [value, setValue] = useState("");
  const [suggestion, setSuggestion] = useState("");

  const isDirty = JSON.stringify(shop) !== JSON.stringify(currentMerchant);
  const isLoading = fetcher.state !== "idle";

  // Sync fetcher result
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.updatedMerchant) {
      setShop(fetcher.data.updatedMerchant);
      shopify.toast.show("Shop updated successfully");
      resetAll();
    }
  }, [fetcher.data]);

  const resetAll = () => {
    setValue("");
    setSuggestion("");
  };

  const handleChange = (name, value) => {
    setShop((prev) => ({
      ...prev,
      [name]: value, // Dynamically update the specific field
    }));
  };

  const handleActiveOptionChange = useCallback(
    (activeOption) => {
      const activeOptionIsAction = activeOption === value;
      if (
        !activeOptionIsAction &&
        !shop.excludeHideTags.includes(activeOption)
      ) {
        setSuggestion(activeOption);
      } else {
        setSuggestion("");
      }
    },
    [value, shop.excludeHideTags],
  );

  const updateSelection = useCallback(
    (selected) => {
      const nextSelectedTags = new Set([...shop.excludeHideTags]);

      if (nextSelectedTags.has(selected)) {
        nextSelectedTags.delete(selected);
      } else {
        nextSelectedTags.add(selected);
      }
      handleChange("excludeHideTags", [...nextSelectedTags]);
      setValue("");
      setSuggestion("");
    },
    [shop.excludeHideTags],
  );

  const removeTag = useCallback(
    (tag) => () => {
      updateSelection(tag);
    },
    [updateSelection],
  );

  const formatOptionText = useCallback(
    (option) => {
      const trimValue = value.trim().toLocaleLowerCase();
      const matchIndex = option.toLocaleLowerCase().indexOf(trimValue);

      if (!value || matchIndex === -1) return option;

      const start = option.slice(0, matchIndex);
      const highlight = option.slice(matchIndex, matchIndex + trimValue.length);
      const end = option.slice(matchIndex + trimValue.length, option.length);

      return (
        <p>
          {start}
          <Text fontWeight="bold" as="span">
            {highlight}
          </Text>
          {end}
        </p>
      );
    },
    [value],
  );

  const escapeSpecialRegExCharacters = useCallback(
    (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    [],
  );

  const options = useMemo(() => {
    let list;
    const filterRegex = new RegExp(escapeSpecialRegExCharacters(value), "i");

    if (value) {
      list = tags.filter((tag) => tag.match(filterRegex));
    } else {
      list = tags;
    }

    return [...list];
  }, [value, escapeSpecialRegExCharacters]);

  const verticalContentMarkup =
    shop.excludeHideTags.length > 0 ? (
      <InlineStack gap="100" alignment="center">
        {shop.excludeHideTags.map((tag) => (
          <Tag key={`option-${tag}`} onRemove={removeTag(tag)}>
            {tag}
          </Tag>
        ))}
      </InlineStack>
    ) : null;

  const optionMarkup =
    options.length > 0
      ? options.map((option) => {
          return (
            <Listbox.Option
              key={option}
              value={option}
              selected={shop.excludeHideTags.includes(option)}
              accessibilityLabel={option}
            >
              <Listbox.TextOption
                selected={shop.excludeHideTags.includes(option)}
              >
                {formatOptionText(option)}
              </Listbox.TextOption>
            </Listbox.Option>
          );
        })
      : null;

  const noResults = value && !tags.includes(value);

  const actionMarkup = noResults ? (
    <Listbox.Action value={value}>{`Add "${value}"`}</Listbox.Action>
  ) : null;

  const emptyStateMarkup = optionMarkup ? null : (
    <EmptySearchResult
      title=""
      description={`No tags found matching "${value}"`}
    />
  );

  const listboxMarkup =
    optionMarkup || actionMarkup || emptyStateMarkup ? (
      <Listbox
        autoSelection={AutoSelection.None}
        onSelect={updateSelection}
        onActiveOptionChange={handleActiveOptionChange}
      >
        {/* {actionMarkup} */}
        {optionMarkup}
      </Listbox>
    ) : null;

  const handleSave = () => {
    const modifiedKeys = findModifiedKeys(currentMerchant, shop);

    // ✅ Only include modified keys, preserving arrays correctly
    const modifiedShop = {};
    for (const key of modifiedKeys) {
      const value = getDeepValue(shop, key);
      setDeepValue(modifiedShop, key, value);
    }
    // Submit only modified part
    fetcher.submit(modifiedShop, {
      method: "post",
      encType: "application/json",
    });
  };

  return (
    <Page
      divider
      primaryAction={{
        content: "Save",
        disabled: !isDirty || isLoading,
        onAction: () => handleSave(),
        loading: isLoading,
      }}
    >
      <BlockStack gap={{ xs: "800", sm: "400" }}>
        <InlineGrid columns={{ xs: "1fr", md: "2fr 5fr" }} gap="400">
          <Box
            as="section"
            paddingInlineStart={{ xs: 400, sm: 0 }}
            paddingInlineEnd={{ xs: 400, sm: 0 }}
          >
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                Hide/Show Settings
              </Text>
            </BlockStack>
          </Box>
          <Card roundedAbove="sm">
            <BlockStack gap="500">
              <BlockStack gap="200">
                <Checkbox
                  label="Hide Out-of-Stock Products"
                  checked={shop?.enableHiding}
                  onChange={(value) => handleChange("enableHiding", value)}
                  helpText="Automatically unpublish out-of-stock items after they were sold out more than X days ago. 365 days maximum. 0 days will hide sold out items the next day.
                Products are hidden from All Sales Channels by changing status to Draft. Products are hidden from Online Store Only by changing status to Unpublished."
                />

                <Box paddingInlineStart={600}>
                  <TextField
                    label="Hide After Days"
                    type="number"
                    min={0}
                    max={365}
                    error={isEmpty(shop?.hideAfterDays) ? "Required" : ""}
                    value={shop?.hideAfterDays}
                    onChange={(value) => handleChange("hideAfterDays", value)}
                    disabled={!shop?.enableHiding}
                    helpText="Number of days after which the product will be hidden. 0 days will hide sold out items the next day."
                  />
                </Box>
              </BlockStack>

              <Select
                label="Hide Products From"
                options={HidingChannelOptions}
                onChange={(value) => handleChange("hidingChannel", value)}
                value={shop?.hidingChannel}
                disabled={!shop?.enableHiding}
                helpText={
                  <span>
                    Allows you to set a specific sort order for all out-of-stock
                    products at the bottom of the collection.
                  </span>
                }
              />

              <BlockStack gap="100">
                <Checkbox
                  label="Don't hide sold-out products having tags below"
                  checked={shop?.excludeHiding}
                  onChange={(value) => handleChange("excludeHiding", value)}
                  disabled={!shop?.enableHiding}
                  // helpText="Do not hide out-of-stock products if they have a specific tag(s) assigned. They will be treated as regular out-of-stock products and pushed to the bottom of collections instead"
                />

                <Combobox
                  allowMultiple
                  activator={
                    <Combobox.TextField
                      disabled={!shop?.excludeHiding || !shop?.enableHiding}
                      autoComplete="off"
                      // label="Don't hide products down having tags below"
                      helpText="Do not hide out-of-stock products if they have a specific tag(s) assigned. They will be treated as regular out-of-stock products and pushed to the bottom of collections instead."
                      value={value}
                      suggestion={suggestion}
                      placeholder="Select Tags"
                      // autoComplete
                      verticalContent={verticalContentMarkup}
                      onChange={(value) => setValue(value)}
                    />
                  }
                >
                  {listboxMarkup}
                </Combobox>
              </BlockStack>

              <Checkbox
                label="Re-publish Back to Stock Products"
                checked={shop?.republishHidden}
                onChange={(value) => handleChange("republishHidden", value)}
                helpText="Automatically publish back products returning to stock. Only products unpublished by the app will be published back. If you want to publish items manually, please, disable this option."
                disabled={!shop?.enableHiding}
              />

              <BlockStack gap="100">
                <Checkbox
                  label={`Tag Products Hidden By The App`}
                  checked={shop?.tagHiddenProduct}
                  onChange={(value) => handleChange("tagHiddenProduct", value)}
                  disabled={!shop?.enableHiding}
                  // helpText="Automatically assign a specific tag to out-of-stock products. The tag will be removed after a product returns in stock. One tag only. Use this tag to create smart collections with sold out items or exclude sold out items from smart collections."
                />

                <TextField
                  // label={`Tag Products Hidden By The App`}
                  helpText={`Automatically assign a specific tag to hidden products. The tag will be removed after a product is published back. One tag only.`}
                  disabled={!shop?.tagHiddenProduct || !shop?.enableHiding}
                  onChange={(value) => handleChange("hiddenProductTag", value)}
                  value={shop?.hiddenProductTag}
                />
              </BlockStack>
            </BlockStack>
          </Card>
        </InlineGrid>
      </BlockStack>
    </Page>
  );
}
