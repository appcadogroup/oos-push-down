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
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;


export const GET_COLLECTION = `#graphql
  query GetCollection($id: ID!) {
    collection(id: $id) {
        id
        title
        productsCount {
          count
          precision
        }
        sortOrder
          ruleSet {
          rules {
              column
              relation
              condition
          }
        }
        products(first: 1000) {
            edges {
                node {
                    id
                    title
                    totalInventory
                }
            }
        }
    }
  }
`;