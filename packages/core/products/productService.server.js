// src/services/productService.js
import { redis } from "@acme/redis"; // Import shared Redis client
import prisma from "@acme/db"; // Import shared Prisma client

export class ProductService {
  constructor(db = prisma, redisClient = redis) {
    this.db = db;
    this.redis = redisClient; // Use shared Redis instance
    this.cacheTTL = 3600; // 1 hour TTL
    this.cachePrefix = "product:"; // Distinct cache prefix
  }

  getCacheKey(id) {
    return `${this.cachePrefix}${id}`;
  }

  async setCache(id, data) {
    try {
      await this.redis.setex(this.getCacheKey(id), this.cacheTTL, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to cache product:", { error, id });
    }
  }

  async setCacheBulk(products) {
    try {
      // Prepare key-value pairs for MSET
      const keyValuePairs = {};
      for (const product of products) {
        const key = this.getCacheKey(product.productID);
        keyValuePairs[key] = JSON.stringify(product);
      }

      // Use MSET to set all keys atomically
      await this.redis.mset(keyValuePairs);

      // Set expiration for each key (not atomic with MSET, but efficient enough)
      const pipeline = this.redis.pipeline();
      for (const key of Object.keys(keyValuePairs)) {
        pipeline.expire(key, this.cacheTTL);
      }
      await pipeline.exec();
      console.log(`Cached ${products.length} products in bulk`);
    } catch (error) {
      console.error("Error in setCacheBulk:", { error, productCount: products.length });
    }
  }

  async invalidateCache(id) {
    try {
      await this.redis.del(this.getCacheKey(id));
    } catch (error) {
      console.error("Error invalidating cache:", { error, id });
    }
  }

  async getProduct({ id, tx = this.db,useCache = true }) {
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
      const product = await tx.product.findUnique({
        where: { productID: id },
      });

      // Cache the result only if not in a transaction and product exists
      if (tx === this.db && product && useCache) {
        await this.setCache(id, product);
      }

      return product;
    } catch (error) {
      console.error("Error in getProduct:", { error, id });
      throw new Error(`Failed to fetch product: ${error.message}`);
    }
  }

  async getManyProducts(where, select = {}, tx = this.db) {
    // Fetch from database
    try {
      const products = await tx.product.findMany({
        where: where,
        select: select,
      });
      return products;
    } catch (error) {
      console.error("Error in getManyProducts:", { error, ids });
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  }

  async createProduct(data, tx = this.db) {
    try {
      const product = await tx.product.create({
        data: data,
      });
      return product; // Cache deferred to caller
    } catch (error) {
      console.error("Error in createProduct:", { error, data });
      throw new Error(`Failed to create product: ${error.message}`);
    }
  }

  async createManyProducts({ data, skipDuplicates = false }, tx = this.db) {
    try {
      const result = await tx.product.createMany({
        data: data,
        ...(skipDuplicates ? { skipDuplicates: true } : {}),
      });
      return result; // Cache updates deferred to caller
    } catch (error) {
      console.error("Error in createManyProducts:", { error, data, skipDuplicates });
      throw new Error(`Failed to create many products: ${error.message}`);
    }
  }

  async createManyAndReturnProducts({ data, skipDuplicates = false }, tx = this.db) {
    try {
      const products = await tx.product.createManyAndReturn({
        data: data,
        ...(skipDuplicates ? { skipDuplicates: true } : {}),
      });
      return products; // Cache updates deferred to caller
    } catch (error) {
      console.error("Error in createManyAndReturnProducts:", { error, data, skipDuplicates });
      throw new Error(`Failed to create and return products: ${error.message}`);
    }
  }

  async upsertProduct(id, data = {}, tx = this.db) {
    try {
      const product = await tx.product.upsert({
        where: { productID: id },
        create: {
          productID: id,
          ...data, // Spread to allow partial updates
        },
        update: data,
      });
      return product; // Cache deferred to caller
    } catch (error) {
      console.error("Error in upsertProduct:", { error, id, data });
      throw new Error(`Failed to upsert product: ${error.message}`);
    }
  }

  async updateProduct(id, data = {}, tx = this.db) {
    try {
      const product = await tx.product.update({
        where: { productID: id },
        data: data,
      });
      return product; // Cache deferred to caller
    } catch (error) {
      console.error("Error in updateProduct:", { error, id, data });
      if (error.code === "P2025") throw new Error(`Product with ID ${id} not found`);
      throw new Error(`Failed to update product: ${error.message}`);
    }
  }

  async updateManyProducts(where, data, tx = this.db) {
    try {
      const result = await tx.product.updateMany({
        where: where,
        data: data,
      });
      return result; // Cache invalidation deferred to caller if needed
    } catch (error) {
      console.error("Error in updateManyProducts:", { error, where, data });
      throw new Error(`Failed to update many products: ${error.message}`);
    }
  }

  async countProduct(where = {}, tx = this.db) {
    try {
      const count = await tx.product.count({ where });
      return count;
    }
    catch (error) {
      console.error("Error in countProduct:", { error, where });
      throw new Error(`Failed to count product: ${error.message}`);
    } 
  }

  async getFirstPublications({ where, select = {}, tx = this.db }) {
    try {
      const publications = await tx.publication.findFirst({
        where: where,
      });
      return publications;
    } catch (error) {
      console.error("Error in getFirstPublications:", { error, where });
      throw new Error(`Failed to fetch first publication: ${error.message}`);
    }
  }


  async createManyPublications({ data, skipDuplicates = false }, tx = this.db) {
    try {
      const result = await tx.publication.createMany({
        data: data,
        ...(skipDuplicates ? { skipDuplicates: true } : {}),
      });
      return result; // Cache updates deferred to caller
    } catch (error) {
      console.error("Error in createManyPublications:", { error, data, skipDuplicates });
      throw new Error(`Failed to create many publications: ${error.message}`);
    }
  }

  async deleteManyProducts(where, tx = this.db) {
    try {
      const result = await tx.product.deleteMany({
        where: where,
      });
      return result; // Cache invalidation deferred to caller if needed
    } catch (error) {
      console.error("Error in deleteManyProducts:", { error, where });
      throw new Error(`Failed to delete many products: ${error.message}`);
    }
  }

}