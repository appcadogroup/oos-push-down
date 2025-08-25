export class ShopifyGraphQLClient {
  constructor(admin) {
    this.admin = admin;
  }

  async getResponseJson(query, variables = {}) {
    try {
      // Determine which method to call based on the admin client
      if (typeof this.admin.graphql === "function") {
        const response = await this.admin.graphql(query, { variables });
        return await response.json(); // Embedded Remix app
      } else if (typeof this.admin.request === "function") {
        return await this.admin.request(query, { variables }); // Node Express app
      } else {
        throw new Error(
          "Unsupported admin client: Missing 'graphql' or 'request' method"
        );
      }
    } catch (err) {
      throw err
    }
  }

  async executeQuery(query, variables = {}) {
    try {
      const jsonData = await this.getResponseJson(query, variables);

      if (jsonData.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(jsonData.errors)}`);
      }

      return {
        data: jsonData.data,
        extensions: jsonData.extensions,
      };
    } catch (err) {
      if (err instanceof HttpError) {
        switch (err.status) {
          case 403:
          case 404:
            return {
              data: null,
              extensions: null,
            };
          default:
            throw err;
        }
      } else {
        throw err;
      }
    }
    
  }

  async fetchAllData({
    query,
    variables = {},
    dataPath,
    extractor = "edges", // Default to "edges" (common in Shopify API)
  }) {
    let hasNextPage = true;
    let endCursor = null;
    const allData = [];

    try {
      while (hasNextPage) {
        const responseJson = await this.getResponseJson(query, {
          ...variables,
          after: endCursor,
        });

        if (responseJson.errors) {
          throw new Error(
            `GraphQL errors: ${JSON.stringify(responseJson.errors)}`
          );
        }

        // Navigate to the data using the provided dataPath
        const pageData = dataPath
          .split(".")
          .reduce(
            (obj, key) => (obj && obj[key] ? obj[key] : null),
            responseJson.data
          );

        if (!pageData) {
          throw new Error(`Invalid data path: ${dataPath}`);
        }

        if (!pageData[extractor]) {
          throw new Error(
            `Extractor '${extractor}' not found in data at path: ${dataPath}`
          );
        }

        // Extract nodes based on the extractor type ("edges" or "nodes")
        const items =
          extractor === "edges"
            ? pageData[extractor].map((edge) => edge.node)
            : pageData[extractor]; // For "nodes", assume it's already the array

        allData.push(...items);
        hasNextPage = pageData.pageInfo?.hasNextPage ?? false;
        endCursor = pageData.pageInfo?.endCursor ?? null;
      }

      return allData;
    } catch (error) {
      console.error("Error in fetchAllData:", error.message, {
        query,
        variables,
        dataPath,
        extractor,
      });
      throw new Error(
        error.message ||
          "An unknown error occurred while fetching paginated data."
      );
    }
  }
}
