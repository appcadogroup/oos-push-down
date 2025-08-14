

export class ProductUtils {
  static isOOSByLocations(productVariants, selectedLocations) {
    for (const variantKey in productVariants) {
      const variant = productVariants[variantKey];
      const inventoryItem = variant.inventoryItem;
      if (inventoryItem?.tracked === false) {
        // If the inventory item is not tracked, means out of stock is not applicable
        return false;
      }

      // Check each selected location for positive stock
      for (const locationId of selectedLocations) {
        const locationKey = `L${locationId}`;
        // Check if the location data exists for the inventory item
        const locationData = inventoryItem[locationKey];
        const quantity = locationData?.quantities?.[0]?.quantity ?? null;
        if (quantity != null && quantity > 0) {
          // Found at least one variant with stock in selected locations
          return false;
        }
      }
    }

    // If no variant had stock in any selected location
    return true;
  }

  static getLocationsInventoryLevelQuery(locationIDs) {
    return locationIDs
      .map(
        (location) =>
          `L${location}:inventoryLevel(locationId:\"gid://shopify/Location/${location}\") {
              id
              quantities(names: [\"available\"]) {
                  quantity
              }
            }`,
      )
      .join("\n");
  }

  static shouldPushDown = (
    product,
    continueSellingAsOOS,
    excludePushDown,
    excludePushDownTags,
    selectedLocations = [],
  ) => {
    if (
      !product.tracksInventory ||
      product.variants.some((variant) => !variant.inventoryItem.tracked)
    ) {
      return false;
    }

    let OOS = false;
    if (selectedLocations.length > 0) {
      OOS = this.isOOSByLocations(product.variants, selectedLocations);
    } else {
      if (product.totalInventory > 0) return false;
      OOS = product.variants.every(
        (variant) => variant.inventoryQuantity <= 0,
      );
    }

    if (!OOS) return false;

    if (excludePushDown && excludePushDownTags.length > 0) {
      const hasExcludeTag = product.tags.some((tag) =>
        excludePushDownTags.includes(tag),
      );
      if (hasExcludeTag) return false;
    }

    const hasContinue = (product.variants || []).some(
      (variant) => variant.inventoryPolicy === "CONTINUE",
    );
    if (hasContinue && !continueSellingAsOOS) return false;

    return true;
  };
}

