// src/services/AppGraphql.js
import { ShopifyGraphQLClient } from "../server.server.js";

export class AppGraphql {
  constructor(admin) {
    this.admin = new ShopifyGraphQLClient(admin);
  }

  async getAppByHandle({
    handle,
    fields = `
    installation {
      activeSubscriptions {
          id
          name
          createdAt
          trialDays
          status
          currentPeriodEnd
      }
    }`,
  }) {
    const query = `
      query($handle:String!) {
          appByHandle(handle: $handle) {
            ${fields}
          }
      }
    `;

    const { data, extensions } = await this.admin.executeQuery(query, {
      handle
    });
    return {
      app: data.appByHandle,
      extensions,
    };
  }

}
