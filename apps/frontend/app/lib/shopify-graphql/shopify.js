export async function fetchAllData(admin, query, variables = {}, dataPath, nodes=false) {
  let hasNextPage = true;
  let endCursor = null;
  const allData = [];

  try {
    while (hasNextPage) {
      const response = await admin.graphql(`${query}`, {
        variables: {
          ...variables,
          after: endCursor, // Use the cursor for pagination
        },
      });

      const responseJson = await response.json();

      // Extract the paginated data and page info
      const pageData = dataPath
        .split(".")
        .reduce(
          (obj, key) => (obj && obj[key] ? obj[key] : null),
          responseJson.data,
        );
      if (!pageData) throw new Error("Invalid data path");

      

      allData.push(...(!nodes ? pageData.edges.map((edge) => edge.node) : pageData.nodes.map((node) => node)))
      hasNextPage = pageData.pageInfo.hasNextPage;
      endCursor = pageData.pageInfo.endCursor;
    }

    return allData;
  } catch (error) {
    if (error.response?.data?.errors) {
      console.error(
        "Shopify GraphQL API error:",
        JSON.stringify(error.response.data.errors, null, 2),
      );
      throw new Error(
        "The Shopify GraphQL API returned an error. Please review the API response for details.",
      );
    } else if (error.message) {
      
      throw new Error(`Unexpected error: ${error.message}`);
    } else {
      
      throw new Error(
        "An unknown error occurred while executing the GraphQL request.",
      );
    }
  }
}

/**
 * Executes a Shopify GraphQL API request using either the native admin client or Axios with an access token.
 *
 * @param {Object} options - The configuration options for the request.
 * @param {Object} options.admin - The Shopify admin client (for native authenticate calls).
 * @param {string} options.shopifyUrl - The Shopify store URL (required if using Axios).
 * @param {string} options.accessToken - The access token for Axios calls (required if using Axios).
 * @param {string} query - The GraphQL query string.
 * @param {Object} [variables={}] - The variables to pass with the GraphQL query.
 * @param {string} dataPath - The path to the data field in the response JSON.
 * @returns {Promise<Object>} - The data at the specified dataPath in the response.
 */
export async function shopifyGraphQL(admin, query, variables = {}, dataPath) {
  try {
    let responseJson;

    if (admin) {
      // Use native Shopify admin client
      const response = await admin.graphql(query, { variables });
      responseJson = await response.json();
    }
    // Check for user errors in the response
    if (
      responseJson.data[dataPath]?.userErrors &&
      responseJson.data[dataPath].userErrors.length > 0
    ) {
      console.error(
        "Shopify GraphQL API error:",
        JSON.stringify(responseJson.data[dataPath].userErrors, null, 2),
      );
      throw new Error(
        "An error occurred while processing the GraphQL request. Please check the query and variables.",
      );
    }

    return responseJson.data[dataPath];
  } catch (error) {
    if (error.response?.data?.errors) {
      console.error(
        "Shopify GraphQL API error:",
        JSON.stringify(error.response.data.errors, null, 2),
      );
      throw new Error(
        "The Shopify GraphQL API returned an error. Please review the API response for details.",
      );
    } else if (error.message) {
      
      throw new Error(`Unexpected error: ${error.message}`);
    } else {
      
      throw new Error(
        "An unknown error occurred while executing the GraphQL request.",
      );
    }
  }
}

// Fetch products with pagination
export async function fetchProducts(
  context,
  query = "",
  first = 10,
  fields = `id
            legacyResourceId
            title
            handle
            tags`,
  after = null,
) {
  const graphqlQuery = `
      query getProducts($query: String, $first: Int!, $after: String) {
        products(query: $query, first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              ${fields}
            }
          }
        }
      }
    `;

  return shopifyGraphQL(
    context,
    graphqlQuery,
    { query, first, after },
    "products",
  );
}


// Fetch products with pagination
export async function fetchProductTags(
  context,
  first = 1000,
  after = null,
) {
  const graphqlQuery = `
      query ($first: Int!, $after: String) {
        productTags(first: $first, after: $after) {
          nodes 
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

  return shopifyGraphQL(
    context,
    graphqlQuery,
    { first, after },
    "productTags",
  );
}

// Fetch orders with pagination
export async function fetchOrders(
  context,
  first = 10,
  after = null,
  query = "",
) {
  const graphqlQuery = `
      query getOrders($first: Int!, $after: String, $query: String) {
        orders(first: $first, after: $after, query: $query) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              name
              totalPrice
              createdAt
              customer {
                id
                email
                firstName
                lastName
              }
              lineItems(first: 5) {
                edges {
                  node {
                    title
                    quantity
                    variant {
                      id
                      price
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

  return shopifyGraphQL(context, graphqlQuery, { first, after, query });
}

// Fetch Single Order
export async function fetchOrder(context, id) {
  const graphqlQuery = `
    query getOrder($id: ID!) {
        order(id: $id) {
          id
          name
          email
          lineItems(first: 50) {
            edges {
              node {
                id
                title
                quantity
                discountedTotalSet {
                  shopMoney {
                    amount
                  }
                }
                variant {
                  id
                  cigarCount: metafield(key: "cigar_count", namespace:"custom") {
                    namespace,
                    value
                  }
                  tobaccoOz: metafield(key: "tobacco_oz", namespace:"custom") {
                    namespace,
                    value
                  }
                }
                product {
                  productType
                  category {
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;

  return shopifyGraphQL(
    context,
    graphqlQuery,
    { id: `gid://shopify/Order/${id}` },
    "order",
  );
}

// Update product
export async function updateProduct(context, input) {
  const query = `
      mutation updateProduct($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            title
            description
            handle
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  compareAtPrice
                  inventoryQuantity
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

  return shopifyGraphQL(context, query, { input });
}

// Create webhook subscription
export async function createWebhookSubscription(context, topic, webhookUrl) {
  const query = `
      mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookUrl: URL!) {
        webhookSubscriptionCreate(
          topic: $topic,
          webhookSubscription: {
            callbackUrl: $webhookUrl,
            format: JSON
          }
        ) {
          webhookSubscription {
            id
            topic
            callbackUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

  return shopifyGraphQL(context, query, { topic, webhookUrl });
}

// Delete webhook subscription
export async function deleteWebhookSubscription(context, id) {
  const query = `
      mutation webhookSubscriptionDelete($id: ID!) {
        webhookSubscriptionDelete(id: $id) {
          deletedWebhookSubscriptionId
          userErrors {
            field
            message
          }
        }
      }
    `;

  return shopifyGraphQL(context, query, { id });
}

// Fetch customers with pagination
export async function fetchCustomers(
  context,
  first = 10,
  after = null,
  query = "",
) {
  const graphqlQuery = `
      query getCustomers($first: Int!, $after: String, $query: String) {
        customers(first: $first, after: $after, query: $query) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              email
              firstName
              lastName
              phone
              ordersCount
              totalSpent
              addresses(first: 1) {
                edges {
                  node {
                    address1
                    city
                    country
                    zip
                  }
                }
              }
            }
          }
        }
      }
    `;

  return shopifyGraphQL(context, graphqlQuery, { first, after, query });
}

// Add tags to any resource
export async function addTags(context, id, tags) {
  const query = `
        mutation addTags($id: ID!, $tags: [String!]!) {
            tagsAdd(id: $id, tags: $tags) {
            node {
                id
            }
            userErrors {
                message
            }
        }
    }
    `;

  const results = await shopifyGraphQL(
    context,
    query,
    {
      id,
      tags,
    },
    "tagsAdd",
  );

  return results;
}

// Remove tags from any resource
export async function removeTags(context, id, tags) {
  const query = `
      mutation removeTags($id: ID!, $tags: [String!]!) {
        tagsRemove(id: $id, tags: $tags) {
          node {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

  const results = await shopifyGraphQL(
    context,
    query,
    {
      id,
      tags,
    },
    "tagsRemove",
  );

  return results;
}

// =============================================================================
// Translations
// =============================================================================

// Fetch customers with pagination
export async function fetchTranslatableResources(context, resourceIds) {
  const graphqlQuery = `
query translableResources($resourceIds: [ID!]!) {
  translatableResourcesByIds(first: 100, resourceIds: $resourceIds) {
    edges {
      node {
        resourceId
        translatableContent {
          key
          value
          digest
          locale
        }
      }
    }
  }
}`;

  return shopifyGraphQL(
    context,
    graphqlQuery,
    { resourceIds },
    "translatableResourcesByIds",
  );
}

// Translation Register
export async function translationRegister(context, resourceId, translations) {
  const graphqlQuery = `
mutation translationsRegister($resourceId: ID!, $translations: [TranslationInput!]!) {
  translationsRegister(resourceId: $resourceId, translations: $translations) {
    userErrors {
      message
      field
    }
    translations {
      key
      value
    }
  }
}`;

  return shopifyGraphQL(
    context,
    graphqlQuery,
    { resourceId, translations },
    "translationsRegister",
  );
}

export async function fetchCollectionsByProduct(context, productID) {
  const graphqlQuery = `
    query CollectionListByProduct($query: String) {
      collections(first: 250, query: $query) {
        nodes {
          legacyResourceId
          id
        }
      }
    }`;

  return shopifyGraphQL(
    context,
    graphqlQuery,
    { query: `product_id:${productID}` },
    "collections",
  );
}

// Update Collection
export async function updateCollection(context, input) {
  const graphqlQuery = `#graphql
 mutation updateCollectionRules($input: CollectionInput!) {
  collectionUpdate (input: $input) {
    collection {
      id
      title
      description
      handle
      ruleSet {
        rules {
          column
          relation
          condition
        }
        appliedDisjunctively
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

  return shopifyGraphQL(context, graphqlQuery, { input }, "collectionUpdate");
}

// Bulk Operation Query Collection Products
export async function bulkOperationQueryCollectionWithSorting(
  context,
  collectionID,
  currentSorting,
) {
  const query = `sortKey: ${currentSorting.sortKey}${currentSorting?.reverse ? `, reverse: ${currentSorting?.reverse}` : ``}`;
  const graphqlQuery = `
  mutation {
  bulkOperationRunQuery(
   query: """
    {
        collection(id: "${collectionID}") {
            id
            legacyResourceId
            title
            currentSorting: products(${query}) {
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
                                    inventoryPolicy
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
                        totalInventory
                        tags
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
    }
  }
}`;

  return shopifyGraphQL(context, graphqlQuery, {}, "bulkOperationRunQuery");
}

export async function queryBulkOperationStatus(context, operationID) {
  const graphqlQuery = `
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

  return shopifyGraphQL(context, graphqlQuery, { id: operationID }, "node");
}

export const retrieveBulkOperationRestID = (operationID) =>
  operationID.replace("gid://shopify/BulkOperation/", "");
export const retrieveAdminGraphqlID = (id, type) =>
  `gid://shopify/${type}/${id}`;
export const retrieveAdminLegacyResourceID = (id, type) =>
  id.replace(`gid://shopify/${type}/`, '').trim();
