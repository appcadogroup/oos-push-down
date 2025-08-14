export const GET_COLLECTIONS = `#graphql
  query GetCollections($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      edges {
        node {
          id
          legacyResourceId
          title
          handle
          updatedAt
          productsCount {
            count
            precision
          }
          sortOrder
          # ruleSet {
          #   rules {
          #     column
          #     relation
          #     condition
          #   }
          # }
          # products(first: 10) {
          #   edges {
          #     node {
          #       id
          #       title
          #       totalInventory
          #     }
          #   }
          # }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export async function getCollections(admin, query, variables) {
  const response = await admin.graphql(query, {
    variables,
  });

  const responseJson = await response.json();
  const collections = responseJson.data.collections;
  const extensions = responseJson.extensions;

  return {
    collections,
    extensions,
  };
}




export async function getCollection(admin, query, variables) {
  const response = await admin.graphql(query, {
    variables,
  });
  const responseJson = await response.json();
  const collection = responseJson.data.collection;
  const extensions = responseJson.extensions;

  return {
    collection,
    extensions,
  };
  
}


export const GET_COLLECTION_COUNT = `#graphql
  query CollectionsCount {
    collectionsCount {
      count
    }
  }
`;

export async function getCollectionCount(admin, query, variables) {
  const response = await admin.graphql(query, {
    variables,
  });
  const responseJson = await response.json();
  const collectionCount = responseJson.data.collectionsCount;
  const extensions = responseJson.extensions;

  return {
    collectionCount,
    extensions,
  };
  
}


export const UPDATE_COLLECTION = `#graphql
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

export async function updateCollection(admin, query, variables) {
  const response = await admin.graphql(query, {
    variables,
  });

  const responseJson = await response.json();
  const collection = responseJson.data.collection;
  const extensions = responseJson.extensions;

  return {
    collection,
    extensions,
  };
}

export const REORDER_COLLECTION_PRODUCTS = `#graphql
    mutation collectionReorderProducts($id: ID!, $moves: [MoveInput!]!) {
        collectionReorderProducts(id: $id, moves: $moves) {
            job {
                id
            }
            userErrors {
                field
                message
            }
        }
    }
`;

export async function reorderCollectionProducts(admin, query, variables) {
  const response = await admin.graphql(query, {
    variables,
  });

  const responseJson = await response.json();
  const reorderCollectionProducts = responseJson.data.collectionReorderProducts;
  const extensions = responseJson.extensions;

  return {
    reorderCollectionProducts,
    extensions,
  };
}

export async function fetchAllProductsInCollection(admin, collectionRecord) {
  let allProducts = [];
  let costs = [];
  let hasNextPage = true;
  let cursor = null; // GraphQL cursor for pagination

  while (hasNextPage) {
    const response = await admin.graphql(
      `query($id: ID!, $sortKey: ProductCollectionSortKeys, $cursor: String) {
        collection(id: $id) {
          id
          title
          handle
          updatedAt
          products(first: 250, after: $cursor, sortKey: $sortKey) {
            edges {
              node {
                id
                totalInventory
              }
              cursor
            }
            pageInfo {
              hasNextPage
            }
          }
        }
      }`,
      {
        variables: {
          id: `gid://shopify/Collection/${collectionRecord.collectionID}`,
          sortKey: collectionRecord.currentSorting || 'BEST_SELLING', // Default sort key if not specified
          cursor: cursor
        }
      }
    );

    const jsonData = await response.json()
  
    // Collect products from the current batch
    const products = jsonData.data.collection.products.edges;
    products.forEach(edge => {
      allProducts.push(edge.node);
      cursor = edge.cursor; // Update the cursor to the last item in the current batch
    });

    const cost = jsonData.extensions.cost;
    costs.push(cost)

    // Check if there are more pages
    hasNextPage = jsonData.data.collection.products.pageInfo.hasNextPage;
  }

  return { allProducts, costs };
}
