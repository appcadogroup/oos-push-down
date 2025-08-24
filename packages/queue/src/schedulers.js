import { getQueue } from "./queue-factory.js";
import { QUEUES } from "./constant.js";

/**
 * Ensure a repeatable auto-sorting job is scheduled for a shop.
 *
 * @param {string} shop - shop domain
 * @param {object} [options]
 *   - pattern: cron pattern string (default "0 * * * *" = every hour)
 *   - removeOnComplete: how many completions to keep (default 10)
 *   - removeOnFail: how many fails to keep (default 20)
 */
export async function upsertAutoSortingSchedule(shop, {
  pattern = "* * * * *", // Every 1 hour
  removeOnComplete = 10,
  removeOnFail = 20,
} = {}) {
  const q = getQueue(QUEUES.AUTO_SORTING);

  return q.upsertJobScheduler(
    shop,                                   // unique key for this schedule
    { pattern },                            // cron expression
    {
      name: "autoSorting",                  // processor name
      data: { shop },                       // payload
      opts: { removeOnComplete, removeOnFail }
    }
  );
}

/**
 * Remove the repeatable schedule for a shop.
 */
export async function removeAutoSortingSchedule(shop) {
  const q = getQueue(QUEUES.AUTO_SORTING);
  return q.removeJobScheduler(shop);
}