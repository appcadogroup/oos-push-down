// src/services/collectionService.js
import { getLogger } from '@acme/core/server'
import { redis } from '@acme/redis'; // Import shared Redis client
import prisma from '@acme/db';

const logger = getLogger('services/collection');

export class CollectionService {
  constructor(db = prisma, redisClient = redis) {
    this.db = db;
    this.redis = redisClient;
    this.cacheTTL = 3600; // 1 hour TTL
    this.cachePrefix = "collection:";
  }

  getCacheKey(id) {
    return `${this.cachePrefix}${id}`;
  }

  async setCache(id, data) {
    try {
      await this.redis.setex(this.getCacheKey(id.toString()), this.cacheTTL, JSON.stringify(data));
    } catch (error) {
      logger.error("Failed to cache collection:", { error, id });
    }
  }

  async setCacheBulk(collections) {
    try {
      // Prepare key-value pairs for MSET
      const keyValuePairs = {};
      for (const collection of collections) {
        const key = this.getCacheKey(collection.collectionID);
        keyValuePairs[key] = JSON.stringify(collection);
      }

      // Use MSET to set all keys atomically
      await this.redis.mset(keyValuePairs);

      // Set expiration for each key (not atomic with MSET, but efficient enough)
      const pipeline = this.redis.pipeline();
      for (const key of Object.keys(keyValuePairs)) {
        pipeline.expire(key, this.cacheTTL);
      }
      await pipeline.exec();
      logger.debug(`Cached ${collections.length} collections in bulk`);
    } catch (error) {
      logger.error("Error in setCacheBulk:", { error, collectionCount: collections.length });
    }
  }


  async invalidateCache(id) {
    try {
      await this.redis.del(this.getCacheKey(id));
    } catch (error) {
      logger.error("Error invalidating cache:", { error, id });
    }
  }

  async getCollection({id, select = null, tx = this.db, useCache = true}) {
    const cacheKey = this.getCacheKey(id);

    // Use cache only if not in a transaction (tx === this.db) and useCache is true
    if (tx === this.db && useCache) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (error) {
        console.warn("Redis cache read failed, proceeding to database:", { error, id });
      }
    }

    try {
      const collection = await tx.collection.findUnique({
        where: { collectionID: id },
        ...(select ? { select } : {}),
      });

      // Cache the result only if not in a transaction and collection exists
      if (tx === this.db && collection && useCache) {
        await this.setCache(id, collection);
      }

      return collection;
    } catch (error) {
      logger.error("Error in getCollection:", { error, id });
      throw new Error(`Failed to fetch collection: ${error.message}`);
    }
  }

  async getManyCollections(where = {}, select = null, tx = this.db) {
    try {
      const collections = await tx.collection.findMany({
        where,
        ...(select ? { select } : {}),
      });
      return collections; // No caching for bulk reads as per decision
    } catch (error) {
      logger.error("Error in getManyCollections:", { error, where });
      throw new Error(`Failed to fetch collections: ${error.message}`);
    }
  }

  async deleteAllCollections(tx = this.db) {
    try {
      const result = await tx.collection.deleteMany();
      return result;
    } catch (error) {
      logger.error("Error in deleteAllCollections:", { error });
      throw new Error(`Failed to delete all collections: ${error.message}`);
    }
  }

  async createManyCollections({ data, skipDuplicates = false }, tx = this.db) {
    try {
      const result = await tx.collection.createMany({
        data,
        ...(skipDuplicates ? { skipDuplicates: true } : {}),
      });
      return result; // No caching for bulk operations
    } catch (error) {
      logger.error("Error in createManyCollections:", { error, data, skipDuplicates });
      throw new Error(`Failed to create many collections: ${error.message}`);
    }
  }

  async createManyAndReturnCollections({ data, skipDuplicates = false }, tx = this.db) {
    try {
      const collections = await tx.collection.createManyAndReturn({
        data,
        ...(skipDuplicates ? { skipDuplicates: true } : {}),
      });
      return collections; // No caching for bulk operations
    } catch (error) {
      logger.error("Error in createManyAndReturnCollections:", { error, data, skipDuplicates });
      throw new Error(`Failed to create and return collections: ${error.message}`);
    }
  }

  async upsertCollection(data, tx = this.db) {
    const {
      legacyResourceId,
      title,
      handle,
      sortOrder,
      updatedAt,
      productsCount,
      shop,
    } = data;

    try {
      const collection = await tx.collection.upsert({
        where: { collectionID: legacyResourceId },
        create: {
          collectionID: legacyResourceId,
          title,
          handle,
          currentSorting: sortOrder,
          updatedAt,
          productsCount: productsCount.count,
          OOSCount: null,
          merchant: {
            connectOrCreate: {
              where: { shop },
              create: { shop },
            },
          },
        },
        update: {
          title,
          handle,
          currentSorting: sortOrder,
          updatedAt,
          productsCount: productsCount.count,
          OOSCount: null,
        },
      });

      return collection;
    } catch (error) {
      logger.error("Error in upsertCollection:", { error, data });
      if (error.code === "P2025") throw new Error(`Collection with ID ${legacyResourceId} not found for update`);
      throw new Error(`Failed to upsert collection: ${error.message}`);
    }
  }

  async updateCollection(id, data = {}, tx = this.db) {
    try {
      const collection = await tx.collection.update({
        where: { collectionID: id },
        data,
      });

      return collection;
    } catch (error) {
      logger.error("Error in updateCollection:", { error, id, data });
      if (error.code === "P2025") throw new Error(`Collection with ID ${id} not found`);
      throw new Error(`Failed to update collection: ${error.message}`);
    }
  }

  async updateManyAndReturnCollections(where, data, tx = this.db) {
    try {
      const collections = await tx.collection.updateManyAndReturn({
        where,
        data,
      });
      return collections; // No caching for bulk operations
    } catch (error) {
      logger.error("Error in updateManyAndReturnCollections:", { error, data });
      throw new Error(`Failed to update and return collections: ${error.message}`);
    }
  }

  async deleteCollection(id, tx = this.db) {
    try {
      const collection = await tx.collection.delete({
        where: { collectionID: id },
      });

      // Invalidate cache only if not in a transaction
      if (tx === this.db) {
        await this.invalidateCache(id);
      }

      return collection;
    } catch (error) {
      logger.error("Error in deleteCollection:", { error, id });
      if (error.code === "P2025") throw new Error(`Collection with ID ${id} not found`);
      throw new Error(`Failed to delete collection: ${error.message}`);
    }
  }

  async countCollection(where = {}, tx = this.db) {
    try {
      const count = await tx.collection.count({ where });
      return count;
    }
    catch (error) {
      logger.error("Error in countCollection:", { error, where });
      throw new Error(`Failed to count collections: ${error.message}`);
    } 
  }

  async deleteManyCollections(where, tx = this.db) {
    try {
      const result = await tx.collection.deleteMany({
        where,
      });

      return result;
    } catch (error) {
      logger.error("Error in deleteManyCollections:", { error, where });
      throw new Error(`Failed to delete many collections: ${error.message}`);
    }
  }

}