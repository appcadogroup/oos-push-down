// Global singleton guard so multiple imports won't re-init Shopify
const g = globalThis;
export function getGlobal(key, factory) {
  if (!g.__ACME_SINGLETONS__) g.__ACME_SINGLETONS__ = new Map();
  if (!g.__ACME_SINGLETONS__.has(key)) g.__ACME_SINGLETONS__.set(key, factory());
  return g.__ACME_SINGLETONS__.get(key);
}
