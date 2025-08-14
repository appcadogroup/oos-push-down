// Hide Product Processor for hide product queue
import { MerchantService, CollectionService, getLogger, bulkOperationQueue } from "@acme/core/server";
import { SubscriptionUtils, JOB_NAMES } from "@acme/core";
const logger = getLogger('jobs/autoSorting');
export const autoSortingProcessor = async job => {
  const {
    shop
  } = job.data;
  logger.debug(`Starting auto sorting job for shop ${shop}`);
  const merchantService = new MerchantService();
  const collectionService = new CollectionService();
  const merchant = await merchantService.getMerchant({
    shop,
    useCache: false
  });
  const isOverLimit = SubscriptionUtils.isOverPlanLimit(merchant, merchant.activePlan);
  if (isOverLimit) {
    return {
      ...job.data
    };
  }
  const activeCollections = await collectionService.getManyCollections({
    shop,
    isActive: true
  });
  const jobs = activeCollections.map(({
    collectionID
  }) => ({
    name: JOB_NAMES.PUSH_DOWN,
    data: {
      shop,
      collectionID
    },
    opts: {
      deduplication: {
        id: `PushDown:${collectionID}`,
        ttl: 4000
      },
      delay: 4000
    }
  }));
  await bulkOperationQueue.addBulk(jobs);
  logger.info(`Scheduled ${jobs.length} push down jobs for shop ${shop}`);
  return {
    ...job.data
  };
};