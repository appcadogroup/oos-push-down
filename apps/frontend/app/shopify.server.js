import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "@acme/db";

import { 
  // getLogger,
  CollectionController, 
  MerchantService,
  MerchantGraphql,
  ProductController 
} from '@acme/core/server';
// const logger = getLogger('server');

export const FREE_PLAN = 'Free subscription';
export const STARTER_PLAN = 'Starter subscription';
export const PROFESSIONAL_PLAN = 'Professional subscription';
export const BUSINESS_PLAN = 'Business subscription';
export const ADVANCED_PLAN = 'Advanced subscription';
export const ENTERPRISE_PLAN = 'Enterprise subscription';
export const ANNUAL_STARTER_PLAN = 'Annual Starter subscription';
export const ANNUAL_PROFESSIONAL_PLAN = 'Annual Professional subscription';
export const ANNUAL_BUSINESS_PLAN = 'Annual Business subscription';
export const ANNUAL_ADVANCED_PLAN = 'Annual Advanced subscription';
export const ANNUAL_ENTERPRISE_PLAN = 'Annual Enterprise subscription';

export const BILLING = {
  [STARTER_PLAN]: {
    trialDays: 7,
    lineItems: [
      {
        amount: 3.99,
        currencyCode: 'USD',
        interval: BillingInterval.Every30Days,
      },
    ],
  },
  [ANNUAL_STARTER_PLAN]: {
    trialDays: 7,
    lineItems: [
      {
        amount: 35.88,
        currencyCode: 'USD',
        interval: BillingInterval.Annual,
      }
    ],
  },
  [PROFESSIONAL_PLAN]: {
    trialDays: 7,
    lineItems: [
      {
        amount: 7.99,
        currencyCode: 'USD',
        interval: BillingInterval.Every30Days,
      },  
    ],
  },
  [ANNUAL_PROFESSIONAL_PLAN]: {
    trialDays: 7,
    lineItems: [
      {
        amount: 71.88,
        currencyCode: 'USD',
        interval: BillingInterval.Annual,
      }
    ],
  },
  [BUSINESS_PLAN]: {
    trialDays: 7,
    lineItems: [
      {
        amount: 12.99,
        currencyCode: 'USD',
        interval: BillingInterval.Every30Days,
      }
    ],
  },
  [ANNUAL_BUSINESS_PLAN]: {
    trialDays: 7,
    lineItems: [
      {
        amount: 116.88,
        currencyCode: 'USD',
        interval: BillingInterval.Annual,
      }
    ],
  },
  [ADVANCED_PLAN]: {
    trialDays: 7,
    lineItems: [
      {
        amount: 18.99,
        currencyCode: 'USD',
        interval: BillingInterval.Every30Days,
      }
    ],
  },
  [ANNUAL_ADVANCED_PLAN]: {
    trialDays: 7,
    lineItems: [
      {
        amount: 170.88,
        currencyCode: 'USD',
        interval: BillingInterval.Annual,
      }
    ],
  },
  [ENTERPRISE_PLAN]: {
    trialDays: 7,
    lineItems: [
      {
        amount: 23.99,
        currencyCode: 'USD',
        interval: BillingInterval.Every30Days,
      }
    ],
  },
  [ANNUAL_ENTERPRISE_PLAN]: {
    trialDays: 7,
    lineItems: [
      {
        amount: 215.88,
        currencyCode: 'USD',
        interval: BillingInterval.Annual,
      }
    ],
  },
}


const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.April25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  billing: BILLING,
  hooks: {
    afterAuth: async ({ session, admin }) => {
      if (session) {
        try {
          shopify.registerWebhooks({ session });
          const collectionController = new CollectionController(admin);
          const productController = new ProductController(admin);
          const merchantGraphql = new MerchantGraphql(admin);
          const merchantService = new MerchantService();
          const { shop } = session;
          const { shop: ShopifyShop } = await merchantGraphql.getShop({});
          await merchantService.upsertMerchant(shop, ShopifyShop);
          await collectionController.syncStoreCollections(shop);
          await productController.syncStoreProducts(shop);
          await productController.syncStorePublications(shop);
          // logger.info(`Shop ${shop} authenticated and setup successfully`);
        } catch (error) {
          // logger.error(`Error during afterAuth hook: ${error.message}`, {
          //   shop: session.shop,
          //   error: error,
          // });
        }
       
      }
    },
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October24;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
