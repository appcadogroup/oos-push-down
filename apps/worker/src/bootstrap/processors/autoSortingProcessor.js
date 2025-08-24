// Hide Product Processor for hide product queue
import {
  MerchantService,
  CollectionService,
} from "@acme/core/server";

import { SubscriptionUtils } from "@acme/core";
import { enqueueBulkOperationForPushDownMany } from "@acme/queue";

export const autoSortingProcessor = async (job) => {
  const { shop } = job.data;

  console.log(`Auto scheduling push down jobs for shop ${shop}`);
  const merchantService = new MerchantService();
  const collectionService = new CollectionService();
  const merchant = await merchantService.getMerchant({
    shop,
    useCache: false,
  });

  const isOverLimit = SubscriptionUtils.isOverPlanLimit(
    merchant,
    merchant.activePlan,
  );

  if (isOverLimit) {
    return { ...job.data };
  }

  const activeCollections = await collectionService.getManyCollections({
    shop,
    isActive: true,
  }, {
    collectionID: true
  });

  await enqueueBulkOperationForPushDownMany(
    shop,
    activeCollections.map(({ collectionID }) => collectionID)
  );

  // ========= Deprecated ==========
  // ----- Add push down jobs
  // const jobs = activeCollections.map(({ collectionID }) => ({
  //   name: JOB_NAMES.PUSH_DOWN,
  //   data: { shop, collectionID },
  //   opts: {
  //     deduplication: { id: `PushDown:${collectionID}`, ttl: 4000 },
  //     delay: 4000,
  //   },
  // }));
  // await bulkOperationQueue.addBulk(jobs);
  // logger.info(`Scheduled ${jobs.length} push down jobs for shop ${shop}`);


  return { ...job.data };
};
