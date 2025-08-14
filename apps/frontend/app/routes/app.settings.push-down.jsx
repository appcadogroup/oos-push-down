import {
  Autocomplete,
  AutoSelection,
  BlockStack,
  Box,
  Card,
  Checkbox,
  Combobox,
  Divider,
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
import { authenticate } from "../shopify.server";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import {  ProductGraphql, MerchantService, LocationGraphql } from "@acme/core/server";
import { OOSSortOrderOptions, findModifiedKeys, getDeepValue, setDeepValue,} from "@acme/core";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;

  const productGraphql = new ProductGraphql(admin);
  const merchantService = new MerchantService();
  const locationGraphql = new LocationGraphql(admin);

  const locations = await locationGraphql.getAllLocations({});
  const productTags = await productGraphql.getAllProductTags();
  const currentMerchant = await merchantService.getMerchant({
    shop,
    useCache: false,
  });

  return { productTags, currentMerchant, allLocations: locations };
};

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const { shop } = session;
  const body = await request.json();

  const merchantService = new MerchantService();
  const locationGraphql = new LocationGraphql(admin);

  if (body?.selectedLocations && body?.selectedLocations?.length) {
    const graphqlLocations = await locationGraphql.getAllLocations({});
    const validLocations = body.selectedLocations.filter((location) =>
      graphqlLocations.some((loc) => loc.legacyResourceId === location))
    body.selectedLocations = validLocations || [];
  }
  
  const updatedMerchant = await merchantService.updateMerchant(shop, body);
  return { success: true, updatedMerchant };
};

export default function ShopPage() {
  const { smUp } = useBreakpoints();
  const shopify = useAppBridge();
  const {
    productTags = [],
    currentMerchant = {},
    allLocations,
  } = useLoaderData();
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
        !shop.excludePushDownTags.includes(activeOption)
      ) {
        setSuggestion(activeOption);
      } else {
        setSuggestion("");
      }
    },
    [value, shop.excludePushDownTags],
  );

  const updateSelection = useCallback(
    (selected) => {
      const nextSelectedTags = new Set([...shop.excludePushDownTags]);

      if (nextSelectedTags.has(selected)) {
        nextSelectedTags.delete(selected);
      } else {
        nextSelectedTags.add(selected);
      }
      handleChange("excludePushDownTags", [...nextSelectedTags]);
      setValue("");
      setSuggestion("");
    },
    [shop.excludePushDownTags],
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
      list = productTags.filter((tag) => tag.match(filterRegex));
    } else {
      list = productTags;
    }

    return [...list];
  }, [value, escapeSpecialRegExCharacters]);

  const verticalContentMarkup =
    shop.excludePushDownTags.length > 0 ? (
      <InlineStack gap="100" alignment="center">
        {shop.excludePushDownTags.map((tag) => (
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
              selected={shop.excludePushDownTags.includes(option)}
              accessibilityLabel={option}
            >
              <Listbox.TextOption
                selected={shop.excludePushDownTags.includes(option)}
              >
                {formatOptionText(option)}
              </Listbox.TextOption>
            </Listbox.Option>
          );
        })
      : null;

  const noResults = value && !productTags.includes(value);

  const actionMarkup = noResults ? (
    <Listbox.Action value={value}>{`Add "${value}"`}</Listbox.Action>
  ) : null;

  const emptyStateMarkup = optionMarkup ? null : (
    <EmptySearchResult
      title=""
      description={`No productTags found matching "${value}"`}
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

  /// Locations
  const deselectedLocationOptions = useMemo(
    () => [
      ...allLocations.map((location) => ({
        value: location.legacyResourceId,
        label: location.name,
      })),
    ],
    [],
  );
  const [selectedLocationOptions, setSelectedLocationOptions] = useState(
    shop.selectedLocations || [],
  );
  const [locationInputValue, setLocationInputValue] = useState("");
  const [locationOptions, setLocationOptions] = useState(
    deselectedLocationOptions,
  );

  const updateLocationText = useCallback(
    (value) => {
      setLocationInputValue(value);

      if (value === "") {
        setLocationOptions(deselectedLocationOptions);
        return;
      }

      const filterRegex = new RegExp(value, "i");
      const resultOptions = deselectedLocationOptions.filter((option) =>
        option.label.match(filterRegex),
      );

      setLocationOptions(resultOptions);
    },
    [deselectedLocationOptions],
  );

  const removeLocation = useCallback(
    (tag) => () => {
      const options = [...selectedLocationOptions];
      options.splice(options.indexOf(tag), 1);
      setSelectedLocationOptions(options);
      handleChange("selectedLocations", options);
    },
    [selectedLocationOptions],
  );

  const verticalLocationMarkup = (
    <InlineStack spacing="extraTight" alignment="center">
      {selectedLocationOptions.length > 0 ? (
        selectedLocationOptions.map((option) => {
          // Find the label for the option
          const location = deselectedLocationOptions.find(
            (loc) => loc.value === option,
          );
          let tagLabel = location.label;
          return (
            <Tag key={`option${option}`} onRemove={removeLocation(option)}>
              {tagLabel}
            </Tag>
          );
        })
      ) : (
        <Tag key={`option-all`} onRemove={removeLocation("all")}>
          All
        </Tag>
      )}
    </InlineStack>
  );
  const textField = (
    <Autocomplete.TextField
      onChange={updateLocationText}
      label="Select locations to track inventory"
      value={locationInputValue}
      placeholder="Select Locations"
      verticalContent={verticalLocationMarkup}
      autoComplete="off"
    />
  );

  const handleLocationChange = useCallback((value) => {
    let cleaned = [];

    if (value.length === 0) {
      cleaned = [];
    } else if (value.includes("all")) {
      if (value.length === 1) {
        cleaned = [];
      } else {
        const lastSelected = value[value.length - 1];
        if (lastSelected === "all") {
          cleaned = [];
        } else {
          cleaned = value.filter((v) => v !== "all");
        }
      }
    } else {
      cleaned = value;
    }
    setSelectedLocationOptions(cleaned);
    handleChange("selectedLocations", cleaned);
  }, []);

  const selectedLocationForUI = useMemo(
    () =>
      selectedLocationOptions.length === 0 ? ["all"] : selectedLocationOptions,
    [selectedLocationOptions],
  );

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
                Push Down Settings
              </Text>
            </BlockStack>
          </Box>
          <Card roundedAbove="sm">
            <BlockStack gap="500">
              <Select
                label="Sort Out-of-Stock Products By"
                options={OOSSortOrderOptions}
                onChange={(value) => handleChange("OOSSortOrder", value)}
                value={shop?.OOSSortOrder}
                helpText={
                  <span>
                    Allows you to set a specific sort order for all out-of-stock
                    products at the bottom of the collection.
                  </span>
                }
              />

              <BlockStack gap="100">
                <Checkbox
                  label="Don't push sold-out products down having productTags below"
                  checked={shop?.excludePushDown}
                  onChange={(value) => handleChange("excludePushDown", value)}
                  // helpText="Do not hide out-of-stock products if they have a specific tag(s) assigned. They will be treated as regular out-of-stock products and pushed to the bottom of collections instead"
                />

                <Combobox
                  allowMultiple
                  activator={
                    <Combobox.TextField
                      autoComplete="off"
                      disabled={!shop?.excludePushDown}
                      helpText="Do not push out-of-stock products down if they have a specific tag(s) assigned. Their position will be determined by primary sort order."
                      value={value}
                      suggestion={suggestion}
                      placeholder="Select Tags"
                      verticalContent={verticalContentMarkup}
                      onChange={(value) => setValue(value)}
                    />
                  }
                >
                  {listboxMarkup}
                </Combobox>
              </BlockStack>

              <Checkbox
                label="Automatically enable push down feature on the new collections"
                checked={shop?.autoEnableCollection}
                onChange={(value) =>
                  handleChange("autoEnableCollection", value)
                }
                helpText="Automatically enable all new collections to be processed by the app. New collections will be processed within the next scheduled run."
              />
            </BlockStack>
          </Card>
        </InlineGrid>
        {smUp ? <Divider /> : null}
        <InlineGrid columns={{ xs: "1fr", md: "2fr 5fr" }} gap="400">
          <Box
            as="section"
            paddingInlineStart={{ xs: 400, sm: 0 }}
            paddingInlineEnd={{ xs: 400, sm: 0 }}
          >
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                Sold Out Settings
              </Text>
            </BlockStack>
          </Box>
          <Card roundedAbove="sm">
            <BlockStack gap="400">
              <Autocomplete
                allowMultiple
                options={[
                  { value: "all", label: "All Locations" },
                  ...locationOptions,
                ]}
                selected={selectedLocationForUI}
                textField={textField}
                onSelect={(value) => handleLocationChange(value)}
                listTitle="Suggested Locations"
              />

              <Checkbox
                label={`Take products which "continue selling when out of stock" as out of stock if they have 0 or less inventory (Default: Disabled)`}
                checked={shop?.continueSellingAsOOS}
                onChange={(value) =>
                  handleChange("continueSellingAsOOS", value)
                }
                // helpText="Automatically enable all new collections to be processed by the app. New collections will be processed within the next scheduled run."
              />

              <BlockStack gap="100">
                <Checkbox
                  label={`Tag out of stock products`}
                  checked={shop?.tagOOSProduct}
                  onChange={(value) => handleChange("tagOOSProduct", value)}
                  // helpText="Automatically assign a specific tag to out-of-stock products. The tag will be removed after a product returns in stock. One tag only. Use this tag to create smart collections with sold out items or exclude sold out items from smart collections."
                />

                <TextField
                  label={`Automatically assign a specific tag to out-of-stock products. The tag will be removed after a product returns in stock. One tag only. Use this tag to create smart collections with sold out items or exclude sold out items from smart collections.`}
                  helpText={`Use letter, numbers, dashes or underscores only as recommended by Shopify`}
                  disabled={!shop?.tagOOSProduct}
                  onChange={(value) => handleChange("OOSProductTag", value)}
                  value={shop?.OOSProductTag}
                />
              </BlockStack>
            </BlockStack>
          </Card>
        </InlineGrid>
      </BlockStack>
    </Page>
  );
}
