// src/services/locationGraphql.js
import { ShopifyGraphQLClient } from "../server.server.js";

export class LocationGraphql {
  constructor(admin) {
    this.admin = new ShopifyGraphQLClient(admin);
  }

  async getLocation({ id, fields = "id\nname\nnlegacyResourceId" }) {
    const query = `query Location ($id: ID!) {
        location (id: $id) {
            ${fields}
        }
    }
    `;

    const { data, extensions } = await this.admin.executeQuery(query, {
      id: `gid://shopify/Location/${id}`,
    });

    return { location: data?.location, extensions };
  }


  async getAllLocations({ searchQuery = null, fields = "id\nname\nlegacyResourceId" }) {
    const query = `query Locations($first: Int!, $after: String, $query: String) {
        locations(first: $first, after: $after, query: $query) {
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
    const locations = await this.admin.fetchAllData({
      query,
      variables: { first: 250, query: searchQuery },
      dataPath: "locations",
      extractor: "nodes",
    })
    
    return locations;

  }

  async getLocationsCount({ searchQuery = null }) {
    const query = `query LocationsCount($query: String) {
        locationsCount(query: $query) {
          count
        }
      }
    `;

    const { data, extensions } = await this.admin.executeQuery(query, {
      query: searchQuery,
    });

    return { locationsCount: data?.locationsCount.count, extensions };
  }
}
