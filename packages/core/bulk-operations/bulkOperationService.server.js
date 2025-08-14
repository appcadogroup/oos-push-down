// src/bulk-operations/bulkOperationService.server.js
import prisma from "@acme/db";
import { redis } from "@acme/redis"; // Import shared Redis client

import {
  getLogger,
  BulkOperationGraphql,
} from "@acme/core/server";


import {
  ProductCollectionSortValue,
  retrieveAdminGraphqlID,
  retrieveBulkOperationRestID,
} from "@acme/core";

const logger = getLogger('services/bulkOp');

export class BulkOperationService {
  constructor(admin = null, db = prisma, redisClient = redis) {
    this.db = db;
    this.redis = redisClient;
    this.admin = admin;
    this.cacheTTL = 3600;
    this.cachePrefix = "bulkOperation:";
  }

  async acquireBulkOperationLock(shop) {
    const lockKey = `BOLock:${shop}`;
    const lockTimeout = 3600; // 1 minute TTL
    const acquired = await redis.set(
      lockKey,
      "active",
      "NX",
      "EX",
      lockTimeout,
    );
    if (acquired) {
      return true;
    } else {
      // If we couldn't acquire the lock, it means Shopify is busy
      return false;
    }
  }

  async releaseLock(shop) {
    const lockKey = `BOLock:${shop}`;
    await redis.del(lockKey);
  }

  async updateBulkOperation({ id, data = {} }) {
    return await this.db.bulkOperation.update({
      where: { id },
      data,
    });
  }

  async createBulkOperation(data, tx = this.db) {
    try {
      const bulkOperation = await tx.bulkOperation.create({
        data: data,
      });
      return bulkOperation; // Cache deferred to caller
    } catch (error) {
      throw new Error(`Failed to create bulk operation: ${error.message}`);
    }
  }

  async processPendingJobsForShop(shop) {
    try {
      const job = await this.db.pendingJob.findFirst({
        where: { shopId: shop, status: "pending" },
        orderBy: { createdAt: "asc" },
      });

      if (!job) {
        // await this.releaseLock(shop);
        return;
      }

      const { collectionID, operationType } = job.collectionData;
      const bulkOperationGraphql = new BulkOperationGraphql(this.admin);
      const currentSortingFilter = ProductCollectionSortValue.BEST_SELLING;
      const admin_graphql_api_id = retrieveAdminGraphqlID(
        collectionID,
        "Collection",
      );
      const { bulkOperation, userErrors } =
        await bulkOperationGraphql.bulkOperationQueryCollectionWithSorting(
          admin_graphql_api_id,
          currentSortingFilter,
        );

      if (userErrors?.length) {
        if (userErrors[0].code === "OPERATION_IN_PROGRESS") {
        } else {
          logger.error(
            `Error creating bulk operation for shop ${shop}:`,
            userErrors,
          );
          return;
        }
        // await this.releaseLock(shop);
        return;
      }

      // Mark as processing
      await this.db.pendingJob.update({
        where: { id: job.id },
        data: { status: "processing" },
      });

      const adminGraphqlID = bulkOperation.id;
      const operationID = retrieveBulkOperationRestID(adminGraphqlID);
      logger.info(`Started bulk operation ${operationID}`);
    } catch (error) {
      logger.error(`Error processing bulk operation for shop ${shop}:`, error);
      // await this.releaseLock(shop);
      // await bulkOperationService.releaseBulkOperationLock(shop);
      throw error;
    }
  }
}
