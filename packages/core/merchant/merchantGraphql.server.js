// src/services/shopifyProductService.js
import { ShopifyGraphQLClient } from "../server.server.js";

export class MerchantGraphql {
  constructor(admin) {
    this.admin = new ShopifyGraphQLClient(admin);
  }

  async getShop({ fields = "id\nianaTimezone" }) {
    const query = `query Shop {
        shop {
            ${fields}
        }
    }
    `;

    const { data, extensions } = await this.admin.executeQuery(query);

    return { shop: data?.shop, extensions };
  }


}
