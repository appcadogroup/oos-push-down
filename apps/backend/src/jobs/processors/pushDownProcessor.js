// Hide Product Processor for hide product queue
import { RateLimitError } from "bullmq";

import {
  BulkOperationService,
  BulkOperationGraphql,
  CollectionService,
  MerchantService,
  // getLogger,
} from "@acme/core/server";

import {
  BulkOperationAction,
  ProductCollectionSortValue,
  retrieveAdminGraphqlID,
  retrieveBulkOperationRestID,
  ProductUtils,
  SubscriptionUtils,
} from "@acme/core";
import { getAuthenticatedAdmin } from "../../app.js";

// const logger = getLogger('jobs/pushDown');

export const pushDownProcessor = async (job) => {
  const { shop, collectionID } = job.data;
  // logger.info(
  //   `[Processor] ${shop} | ${collectionID}`,
  // );

  try {
    console.log(`[Pushdown Processor] authenticating admin... | ${shop}`);
    const admin = await getAuthenticatedAdmin(shop);

    console.log(`[Pushdown Processor] authenticated admin ${admin} | ${shop}`);

    if (!admin) {
      return { ...job.data };
    }

    const bulkOperationService = new BulkOperationService(admin);
    const collectionService = new CollectionService();
    const bulkOperationGraphql = new BulkOperationGraphql(admin);
    const merchantService = new MerchantService();
    const merchant = await merchantService.getMerchant({
      shop,
      useCache: false,
    });

    if (
      !merchant ||
      !merchant.activePlan ||
      SubscriptionUtils.isOverPlanLimit(merchant, merchant.activePlan)
    ) {
      // logger.debug(
      //   "[Processor] Merchant is not found or over plan limit, skipping push down job",
      // );
      return { ...job.data };
    }


    // Check if we can process immediately
    const { currentBulkOperation } =
      await bulkOperationGraphql.getCurrentOperation();

    if (currentBulkOperation && currentBulkOperation.status === "RUNNING") {
      await job.moveToDelayed(Date.now() + 1000);
      throw new RateLimitError();
    }

      const collection = await collectionService.getCollection({
        id: collectionID,
        useCache: false,
      });
      if (!collection) {
        console.log(`Collection not found`);
        return { ...job.data };
      }
      const currentSortingFilter =
        ProductCollectionSortValue[collection.currentSorting];
      const admin_graphql_api_id = retrieveAdminGraphqlID(
        collectionID,
        "Collection",
      );

      const locationInventoryQuery = merchant?.selectedLocations?.length
        ? ProductUtils.getLocationsInventoryLevelQuery(merchant.selectedLocations)
        : null;

      const { bulkOperation, userErrors } =
        await bulkOperationGraphql.bulkOperationQueryCollectionWithSorting(
          admin_graphql_api_id,
          currentSortingFilter,
          locationInventoryQuery,
        );

      if (userErrors?.length) {
        if (userErrors[0].code === "OPERATION_IN_PROGRESS") {
          await job.moveToDelayed(Date.now() + 1000);
          throw new RateLimitError();
        } else {
          throw new Error(
            `Error starting bulk operation for shop ${shop}: ${userErrors[0].message}`,
          );
        }
      }

      const bulkOperationID = bulkOperation?.id;
      if (!bulkOperationID) {

        throw new Error(`Bulk operation ID not found`);
      }

      const operationID = retrieveBulkOperationRestID(bulkOperationID);

      await bulkOperationService.createBulkOperation({
        shop,
        createdAt: bulkOperation.createdAt,
        status: "CREATED",
        action: BulkOperationAction.PUSH_DOWN,
        operationID: operationID,
        jobData: {
          ...job.data,
          selectedLocations: merchant?.selectedLocations || [],
        },
      });

      await collectionService.updateCollection(collectionID, {
        lastRunAt: new Date(),
      });

      return { ...job.data, operationID };
    } catch (error) {
      // logger.error(`Error processing push down job for shop ${shop}: ${error}`);
      throw error;
    }
};
