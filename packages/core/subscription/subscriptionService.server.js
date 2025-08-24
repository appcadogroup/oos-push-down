// src/services/collectionService.js
import { getClient } from "@acme/redis"; // Import shared Redis client
const redis = getClient(); // same singleton every import

import prisma from "@acme/db"; // Import shared Prisma client

export class SubscriptionService {
  constructor(db = prisma, redisClient = redis) {
    this.db = db;
    this.redis = redisClient;
    this.cacheTTL = 3600;
    this.cachePrefix = "subscription:";
  }

  getCacheKey(shop) {
    return `${this.cachePrefix}${shop}`;
  }

  async createSubscription(shop, data = {}, tx = this.db) {
    try {
      const subscription = await tx.subscription.create({
        data: { shop, ...data },
      });

      return subscription; // Cache update deferred to caller
    } catch (error) {
      console.error("Error in createSubscription:", { error, shop, data });
      throw new Error(`Failed to create setting: ${error.message}`);
    }
  }

  async upsertSubscription(shop, data = {}, tx = this.db) {
    try {
      const subscription = await tx.subscription.upsert({
        where: { shop },
        create: { shop, ...data },
        update: { ...data },
      });
      return subscription; // Cache update deferred to caller
    } catch (error) {
      console.error("Error in upsertSubscription:", { error, shop, data });
      throw new Error(`Failed to upsert setting: ${error.message}`);
    }
  }

  async getSubscription({shop, tx = this.db, useCache = true }) {
    const cacheKey = this.getCacheKey(shop);
  
    // Use cache only if not in a transaction (tx === this.db) and useCache is true
    if (tx === this.db && useCache) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (error) {
        console.warn("Redis cache read failed, proceeding to database:", { error, shop });
        // Fall through to database query
      }
    }
  
    try {
      const subscription = await tx.subscription.findUnique({
        where: { shop },
      });
  
      // Cache the result only if not in a transaction (tx === this.db) and subscription exists
      if (tx === this.db && subscription && useCache) {
        try {
          await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(subscription));
        } catch (error) {
          console.error("Failed to cache subscription:", { error, shop });
        }
      }
  
      return subscription;
    } catch (error) {
      console.error("Error in getSubscription:", { error, shop });
      throw new Error(`Failed to fetch subscription: ${error.message}`);
    }
  }

  async updateSubscription(shop, data = {}, tx = this.db) {
    try {
      const subscription = await tx.subscription.update({
        where: { shop },
        data,
      });
      return subscription; // Cache update deferred to caller
    } catch (error) {
      console.error("Error in updateSubscription:", { error, shop, data });
      if (error.code === "P2025") throw new Error(`Setting for shop ${shop} not found`);
      throw new Error(`Failed to update setting: ${error.message}`);
    }
  }

  async setCache(shop, data) {
    await this.redis.setex(this.getCacheKey(shop), this.cacheTTL, JSON.stringify(data));
  }

  async invalidateCache(shop) {
    await this.redis.del(this.getCacheKey(shop));
  }
}