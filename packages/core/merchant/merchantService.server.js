// src/services/collectionService.js
import { redis } from "@acme/redis";
import { retrieveAdminLegacyResourceID } from "@acme/core";
import prisma from "@acme/db";

export class MerchantService {
  constructor(db = prisma, redisClient = redis) {
    this.db = db;
    this.redis = redisClient;
    this.cacheTTL = 3600;
    this.cachePrefix = "merchant:";
  }

  getCacheKey(shop) {
    return `${this.cachePrefix}${shop}`;
  }

  async createMerchant(shop, data = {}, tx = this.db) {
    try {
      const merchant = await tx.merchant.create({
        data: { shop, ...data },
      });

      return merchant; // Cache update deferred to caller
    } catch (error) {
      console.error("Error in createMerchant:", { error, shop, data });
      throw new Error(`Failed to create setting: ${error.message}`);
    }
  }

  async upsertMerchant(shop, data = {}, tx = this.db) {
    try {
      const merchantData = {
        shopID: data?.id
          ? retrieveAdminLegacyResourceID(data.id, "Shop")
          : null,
        timezone: data.ianaTimezone,
      };
      const merchant = await tx.merchant.upsert({
        where: { shop },
        create: { shop, ...merchantData },
        update: { ...merchantData },
      });
      return merchant; // Cache update deferred to caller
    } catch (error) {
      console.error("Error in upsertMerchant:", { error, shop, data });
      throw new Error(`Failed to upsert setting: ${error.message}`);
    }
  }

  async getMerchant({ shop, tx = this.db, useCache = true }) {
    const cacheKey = this.getCacheKey(shop);

    // Use cache only if not in a transaction (tx === this.db) and useCache is true
    if (tx === this.db && useCache) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (error) {
        console.warn("Redis cache read failed, proceeding to database:", {
          error,
          shop,
        });
        // Fall through to database query
      }
    }

    try {
      const merchant = await tx.merchant.findUnique({
        where: { shop },
      });

      // Cache the result only if not in a transaction (tx === this.db) and merchant exists
      if (tx === this.db && merchant && useCache) {
        try {
          await this.redis.setex(
            cacheKey,
            this.cacheTTL,
            JSON.stringify(merchant),
          );
        } catch (error) {
          console.error("Failed to cache merchant:", { error, shop });
        }
      }

      return merchant;
    } catch (error) {
      console.error("Error in getMerchant:", { error, shop });
      throw new Error(`Failed to fetch merchant: ${error.message}`);
    }
  }

  async getMerchants({ where = {}, tx = this.db, useCache = true }) {
    try {
      const merchants = await tx.merchant.findMany({
        where: where,
      });

      return merchants;
    } catch (error) {
      console.error("Error in getMerchants:", { error, where });
      throw new Error(`Failed to fetch merchants: ${error.message}`);
    }
  }

  async updateMerchant(shop, data = {}, tx = this.db) {
    try {
      const merchant = await tx.merchant.update({
        where: { shop },
        data,
      });
      return merchant; // Cache update deferred to caller
    } catch (error) {
      console.error("Error in updateMerchant:", { error, shop, data });
      if (error.code === "P2025")
        throw new Error(`Setting for shop ${shop} not found`);
      throw new Error(`Failed to update setting: ${error.message}`);
    }
  }

  async setCache(shop, data) {
    await this.redis.setex(
      this.getCacheKey(shop),
      this.cacheTTL,
      JSON.stringify(data),
    );
  }

  async invalidateCache(shop) {
    await this.redis.del(this.getCacheKey(shop));
  }
}
