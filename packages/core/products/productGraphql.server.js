// src/services/shopifyProductService.js
import { getLogger, ShopifyGraphQLClient } from "../server.server.js";

const logger = getLogger('graphql/product');

export class ProductGraphql {
  constructor(admin) {
    this.admin = new ShopifyGraphQLClient(admin);
  }

  async getProduct({ id, fields = "id\nlegacyResourceId" }) {
    const query = `query Product ($id: ID!) {
        product (id: $id) {
            ${fields}
        }
    }
    `;

    const { data, extensions } = await this.admin.executeQuery(query, {
      id: `gid://shopify/Product/${id}`,
    });

    return { product: data.product, extensionss };
  }

  async updateProduct({ id, data }) {
    const query = `mutation ProductUpdate($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id
          title
        }
        userErrors {
          field
          message
        }
      }
    }`

    const variables = {
      input: {
        id: `gid://shopify/Product/${id}`,
        ...data,
      },
    };

    const { data:product, extensions } = await this.admin.executeQuery(
      query,
      variables,
    );

    return { product: product.productUpdate.product, extensions };
  }
  

  async getAllProducts({ searchQuery = null, fields = "id\nlegacyResourceId" }) {
    const query = `query Products($first: Int!, $after: String, $query: String) {
        products(first: $first, after: $after, query: $query) {
          nodes {
            ${fields}
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `
    const products = await this.admin.fetchAllData({
      query,
      variables: { first: 250, query: searchQuery },
      dataPath: "products",
      extractor: "nodes",
    })

    logger.info(`Fetched ${products.length} products from Shopify.`);

    return products;

  }

  async getProductsCount({ searchQuery = null }) {
    const query = `query ProductsCount($query: String) {
        productsCount(query: $query) {
          count
        }
      }
    `;

    const { data, extensions } = await this.admin.executeQuery(query, {
      query: searchQuery,
    });

    return { productsCount: data.productsCount.count, extensions };
  }

  async getProductTags({ first = 5000, after = null }) {
    const query = `query ($first: Int!, $after: String) {
        productTags(first: $first, after: $after) {
          nodes 
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
    });

    return { productTags: data.productTags.nodes, extensions };
  }

  async getProductVariants({ searchQuery, fields = `id\ninventoryPolicy` }) {
    const query = `query ProductVariantsList($query: String) {
        productVariants(first: 250, query: $query) {
          nodes {
            ${fields}
          }
          pageInfo {
            startCursor
            endCursor
          }
        }
      }
    `;

    const { data, extensions } = await this.admin.executeQuery(query, {
      query: searchQuery,
    });
    return { productVariants: data.productVariants.nodes, extensions };
  }

  async getAllProductTags() {
    const query = `query ($first: Int!, $after: String) {
        productTags(first: $first, after: $after) {
          nodes 
          pageInfo {
            hasNextPage
            endCursor
          }
        }
    }
    `;

    const productTags = await this.admin.fetchAllData({
      query,
      variables: { first: 5000 },
      dataPath: "productTags",
      extractor: "nodes",
    })

    return productTags;
  }

  async addProductTags({ id, tags }) {
    const query = `mutation addTags($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) {
        node {
          id
        }
        userErrors {
          message
        }
      }
    }`;

    const variables = {
      id: `gid://shopify/Product/${id}`,
      tags,
    };

    const { data, extensions } = await this.admin.executeQuery(
      query,
      variables,
    );
    return { productID: data.tagsAdd.node.id, extensions };
  }

  async removeProductTags({ id, tags }) {
    const query = `mutation removeTags($id: ID!, $tags: [String!]!) {
      tagsRemove(id: $id, tags: $tags) {
        node {
          id
        }
        userErrors {
          message
        }
      }
    }`;

    const variables = {
      id: `gid://shopify/Product/${id}`,
      tags,
    };

    const { data, extensions } = await this.admin.executeQuery(
      query,
      variables,
    );

    return { productID: data.tagsRemove.node.id, extensions };
  }

  async getPublications() {
    const query = `query {
      publications(first: 10) {
        node {
          id
          catalog {
            title
          }
        }
      }
    }`;

    const { data, extensions } = await this.admin.executeQuery(query, {});

    return { publications: data.publications.nodes, extensions };
  }

  async getCatalogs() {
    const query = `query catalogs {
      catalogs (first:2, type:APP) {
        nodes {
          id
          title
          publication {
            id
          }
        }
      }
    }`;

    const { data, extensions } = await this.admin.executeQuery(query, {});

    return { catalogs: data.catalogs.nodes, extensions };
  }
  
  async unpublishProduct({ id, productPublications, fields = "id\nlegacyResourceId" }) {
    const query = `mutation productUnpublish($input: ProductUnpublishInput!) {
      productUnpublish(input: $input) {
        product {
          # Product fields
          ${fields}
        }
        userErrors {
          field
          message
        }
      }
    }`;
    const variables = {
      input: {
        id: `gid://shopify/Product/${id}`,
        productPublications
      }
     
    };
    const { data, extensions } = await this.admin.executeQuery(
      query,
      variables,
    );
    return { product: data.productUnpublish.product, extensions };
  }

  async publishProduct({ id, productPublications, fields = "id\nlegacyResourceId" }) {
    const query = `mutation ProductPublishInput($input: ProductPublishInput!) {
      productPublish(input: $input) {
        product {
          ${fields}
        }
        userErrors {
          field
          message
        }
      }
    }`;
    const variables = {
      input: {
        id: `gid://shopify/Product/${id}`,
        productPublications
      }
     
    };
    const { data, extensions } = await this.admin.executeQuery(
      query,
      variables,
    );
    return { product: data.productPublish.product, extensions };
  }
}
