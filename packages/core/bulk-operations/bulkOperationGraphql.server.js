// src/services/shopifyProductService.js
import { ShopifyGraphQLClient } from "../server.server.js";

export class BulkOperationGraphql {
  constructor(admin) {
    this.admin = new ShopifyGraphQLClient(admin);
  }

  async getCurrentOperation() {
    const query = `query {
        currentBulkOperation {
            id
            status
            errorCode
            createdAt
            completedAt
            objectCount
            url
            partialDataUrl
        }
    }
    `;

    const { data, extensions } = await this.admin.executeQuery(query, {});
    return { currentBulkOperation: data.currentBulkOperation, extensions };
  }

  // Bulk Operation Query Collection Products
  async bulkOperationQueryCollectionWithSorting(
    collectionID,
    currentSorting,
    locationInventoryQuery = null,
  ) {
    const productFilter = `sortKey: ${currentSorting.sortKey}${currentSorting?.reverse ? `, reverse: ${currentSorting?.reverse}` : ``}`;
    const query = `
    mutation {
    bulkOperationRunQuery(
     query: """
      {
          collection(id: "${collectionID}") {
              id
              legacyResourceId
              title
              currentSorting: products(${productFilter}) {
                  edges {
                      node {
                          id
                          legacyResourceId
                          title
                          tracksInventory
                          totalInventory
                          variants(first: 250) {
                              edges {
                                  node {
                                      inventoryQuantity
                                      inventoryPolicy
                                      inventoryItem {
                                        tracked
                                        ${locationInventoryQuery ? locationInventoryQuery : ""}
                                      }

                                  }
                              }
                          }
                          tags
                      }
                  }
              },
              defaultSorting: products(sortKey: COLLECTION_DEFAULT) {
                  edges {
                      node {
                          id
                          legacyResourceId
                          title
                      }
                  }
              }
          }
      }
      """
    ) {
      bulkOperation {
        id
        status
        createdAt
        type
      }
      userErrors {
        field
        message
        code
      }
    }
  }`;

    const { data, extensions } = await this.admin.executeQuery(query, {});
    // if (extensions?.cost?.throttleStatus?.maximumAvailable) {
    //   const throttleStatus = extensions.cost.throttleStatus;
    //   if (throttleStatus?.maximumAvailable) {
    //     await this.admin.sleep(throttleStatus?.maximumAvailable);
    //   }
    // }

    return {
      bulkOperation: data.bulkOperationRunQuery.bulkOperation,
      userErrors: data.bulkOperationRunQuery.userErrors,
      extensions,
    };
  }

  async fetchShopifyCollectionData(
    collectionID,
    productFilter,
    maxVariantCount,
    first = 250,
    locationInventoryQuery = null,
  ) {
    const query = `
    query fetchCollection($first: Int!, $collectionID: ID!, $after: String) {
        collection(id: $collectionID) {
            id
            legacyResourceId
            title
            products(first: $first, after: $after,${productFilter}) {
                nodes {
                  id
                  legacyResourceId
                  title
                  tracksInventory
                  totalInventory
                  variants(first: ${maxVariantCount}) {
                    nodes {
                      inventoryPolicy
                      inventoryQuantity
                      inventoryItem {
                          tracked
                          ${locationInventoryQuery ? locationInventoryQuery : ""}
                      }
                    }      
                  }
                  tags
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
    }
`;

    async function fetchPaginatedData(
      admin,
      query,
      productCursor = null,
      allProducts = [],
    ) {
      const variables = {
        first,
        collectionID,
        after: productCursor,
      };

      const { data, extensions } = await admin.executeQuery(query, variables);

      const products = data.collection.products.nodes;
      const hasMoreProducts = data.collection.products.pageInfo.hasNextPage;
      productCursor = data.collection.products.pageInfo.endCursor;

      allProducts.push(...products);

      if (hasMoreProducts) {
        return fetchPaginatedData(admin, query, productCursor, allProducts);
      }

      return { allProducts: allProducts };
    }

    return await fetchPaginatedData(this.admin, query);
  }

  async fetchBulkOperationStatus(bulkOperationID) {
    const query = `
    query ($id: ID!) {
      node(id: $id) {
        ... on BulkOperation {
          url
          partialDataUrl
          status
          objectCount
          completedAt
          errorCode
        }
      }
    }
    `;

    const { data, extensions } = await this.admin.executeQuery(query, {
      id: bulkOperationID,
    });
    return { bulkOperation: data.node, extensions };
  }
}
