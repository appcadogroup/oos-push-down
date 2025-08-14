// src/services/shopifyCollectionService.js
import { getLogger, ShopifyGraphQLClient } from "../server.server.js";

const logger = getLogger('graphql/collection');

export class CollectionGraphql {
  constructor(admin) {
    this.admin = new ShopifyGraphQLClient(admin);
  }

  async getCollections({
    first = 250,
    after = null,
    searchQuery = null,
    fields = "id\nlegacyResourceId\ntitle\nhandle\nupdatedAt",
  }) {
    const query = `
      query GetCollections($first: Int!, $after: String, $query: String) {
        collections(first: $first, after: $after, query: $query) {
          edges {
            node {
              ${fields}
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const { data, extensions } = await this.admin.executeQuery(query, {
      first,
      after,
      query: searchQuery,
    });
    return {
      collections: data.collections.edges.map((edge) => edge.node),
      extensions,
    };
  }

  async getAllCollections({
    searchQuery = null,
    fields = "id\nlegacyResourceId\ntitle",
  }) {
    const query = `
      query Collections($first: Int!, $after: String, $query: String) {
        collections(first: $first, after: $after, query: $query) {
          nodes {
            ${fields}
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const collections = await this.admin.fetchAllData({
      query,
      variables: { first: 250, query: searchQuery },
      dataPath: "collections",
      extractor: "nodes",
    });

    logger.info(`Fetched ${collections.length} collections from Shopify.`);

    return collections;
  }

  async getCollection({ id, fields = "id\ntitle\nhandle" }) {
    const query = `
      query GetCollection($id: ID!) {
        collection(id: $id) {
          ${fields}
        }
      }
    `;

    const { data, extensions } = await this.admin.executeQuery(query, {
      id: `gid://shopify/Collection/${id}`,
    });
    return { collection: data.collection, extensions };
  }

  async getCollectionCount() {
    const query = `
      query CollectionsCount {
        collectionsCount {
          count
        }
      }
    `;
    const { data, extensions } = await this.admin.executeQuery(query);
    return { collectionCount: data.collectionsCount.count, extensions };
  }

  async updateCollection({ input, fields = "id\ntitle\nhandle" }) {
    const query = `
      mutation updateCollection($input: CollectionInput!) {
          collectionUpdate(input: $input) {
              collection {
                  id
              }
              userErrors {
                  field
                  message
              }
          }
      }
    `;

    const { data, extensions } = await this.admin.executeQuery(query, {
      input,
    });
    return { collection: data.collectionUpdate.collection, extensions };
  }

  async updateCollections({
    updates,
    fields = "id\nsortOrder",
    MAX_MUTATIONS_PER_BATCH = 48,
    BACKOFF_TIME_MS = 1000,
  }) {
    let remainingUpdates = [...updates]; // Copy the updates array

    const processBatch = async (batchUpdates) => {
      // Constructing the mutation string dynamically based on the input
      const mutations = batchUpdates
        .map((update, index) => {
          const graphqlQuery = `
        CollectionUpdate${index}: collectionUpdate(
          input: ${update}
        )
        {
          collection {
            id
            sortOrder
          }
        }
        `;
          return graphqlQuery;
        })
        .join("\n");

      // Construct the complete GraphQL mutation query
      const query = `
        mutation {
          ${mutations}
        }
      `;
      // Execute the query with the constructed mutations
      const { data, extensions } = await this.admin.executeQuery(query, {});
      // Check throttle status and backoff if needed
      const throttleStatus = extensions?.cost?.throttleStatus;
      if (throttleStatus) {
        const { current, max } = throttleStatus;
        const remainingCapacity = max - current;

        if (remainingCapacity < 10) {
          logger.debug("Not enough capacity for more mutations. Backing off...");
          await new Promise((resolve) => setTimeout(resolve, BACKOFF_TIME_MS)); // Wait for 1 second
        }
      }

      return { data, extensions };
    };

    while (remainingUpdates.length > 0) {
      // Slice the next batch of updates (up to MAX_MUTATIONS_PER_BATCH)
      const batchUpdates = remainingUpdates.slice(0, MAX_MUTATIONS_PER_BATCH);
      const response = await processBatch(batchUpdates);

      // Extract remaining updates if any
      remainingUpdates = remainingUpdates.slice(MAX_MUTATIONS_PER_BATCH);

      // After the batch, check the response and throttle status to decide whether to wait
      const { data, extensions } = response;
      const cost = extensions?.cost;

      if (cost) {
        logger.debug(
          `Request cost: ${cost.requestedQueryCost}, Throttle status: ${JSON.stringify(extensions.cost.throttleStatus)}`,
        );
      }
    }

    return { success: true };
  }
  async reorderCollectionProducts({ id, moves, fields = "job { id }" }) {
    const MAX_MOVES_PER_REQUEST = 250;
    const query = `
      mutation collectionReorderProducts($id: ID!, $moves: [MoveInput!]!) {
        collectionReorderProducts(id: $id, moves: $moves) {
          ${fields}
          userErrors {
            field
            message
          }
        }
      }
    `;

    const results = [];
    const userErrors = [];
    const extensions = [];

    // Break `moves` into chunks of 250 or fewer
    for (let i = 0; i < moves.length; i += MAX_MOVES_PER_REQUEST) {
      const chunk = moves.slice(i, i + MAX_MOVES_PER_REQUEST);
      const { data, extensions: ext } = await this.admin.executeQuery(query, {
        id,
        moves: chunk,
      });

      if (data?.collectionReorderProducts) {
        results.push(data.collectionReorderProducts);
        if (data.collectionReorderProducts.userErrors?.length) {
          userErrors.push(...data.collectionReorderProducts.userErrors);
        }
      }

      if (ext) extensions.push(ext);
    }

    return {
      reorderCollectionProducts: results,
      userErrors,
      extensions,
    };
  }
}
