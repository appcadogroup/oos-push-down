export const getMerchantHandle = (myshopifyDomain) => {
    return myshopifyDomain.replace(".myshopify.com", "");
}
export const retrieveBulkOperationRestID = (operationID) =>
  operationID.replace("gid://shopify/BulkOperation/", "");
export const retrieveAdminGraphqlID = (id, type) =>
  `gid://shopify/${type}/${id}`;
export const retrieveAdminLegacyResourceID = (id, type) =>
  id.replace(`gid://shopify/${type}/`, '').trim();

export const shouldHideProduct = (
  productTags,
  excludeHiding,
  excludeHideTags
) => {
  if (excludeHiding && excludeHideTags.length > 0) {
    const hasExcludeTag = productTags.some((tag) =>
      excludeHideTags.includes(tag),
    );
    if (hasExcludeTag) return false;
  }


  // If the product has no variants or all variants are out of stock, hide it
  return true;
}