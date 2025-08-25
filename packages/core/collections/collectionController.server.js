// src/controllers/collectionController.js
import prisma from "@acme/db";
import {
  // getLogger,
  CollectionService,
  CollectionGraphql,
  MerchantService,
  BulkOperationGraphql,
  ProductService,
} from "@acme/core/server";

import {
  ProductCollectionSortValue,
  CollectionSorting,
  ProductUtils,
  retrieveAdminGraphqlID,
} from "@acme/core";

import { removeAutoSortingSchedule, upsertAutoSortingSchedule } from "@acme/queue";

// const logger = getLogger('controller/collection');

export class CollectionController {
  constructor(admin, shop = null) {
    this.admin = admin;
    this.shop = shop;
    this.collectionService = new CollectionService();
    this.productService = new ProductService();
    this.merchantService = new MerchantService();
    this.collectionGraphql = new CollectionGraphql(admin);
    this.bulkOperationGraphql = new BulkOperationGraphql(admin);
  }

  async updateCollectionSortingRule(collectionID, currentSorting) {
    try {
      // logger.info(
      //   `📜 Updating collection sorting ruoverrideSortingle for ${collectionID}`,
      // );
      const updatedCollection = await this.collectionService.updateCollection(
        collectionID,
        { currentSorting: currentSorting },
      );

      if (updatedCollection.isActive) {
        await this.collectionGraphql.updateCollection({
          input: {
            id: `gid://shopify/Collection/${updatedCollection.collectionID}`,
            sortOrder: "MANUAL",
          },
        });
      }

      // logger.info(
      //   `✅ Successfully updated collection sorting rule for ${updatedCollection.collectionID}`,
      // );

      return {
        success: true,
        message: "Collection sorting rule updated successfully",
        updatedCollections: [updatedCollection],
      };
    } catch (error) {
      // logger.error(`Failed to update collection sorting rule.`, error);
      throw new Error("Failed to update collection sorting rule.");
    }
  }

  async enableCollections(collectionIDS) {
    try {
      // logger.info(`📜 Enabling ${collectionIDS.length} collections.`);

      const collections = await this.collectionService.getManyCollections(
        { collectionID: { in: collectionIDS } },
        { currentSorting: true, collectionID: true },
      );

      // id: `gid://shopify/Collection/${collection.collectionID}`,
      // sortOrder: CollectionSorting.MANUAL,

      const multipleUpdateInput = collections.map((collection) => {
        return `{
          id: "gid://shopify/Collection/${collection.collectionID}",
          sortOrder: ${CollectionSorting.MANUAL}
        }`;
      });

      const { success } = await this.collectionGraphql.updateCollections({
        updates: multipleUpdateInput,
        fields: "id\nsortOrder",
        MAX_MUTATIONS_PER_BATCH: 50,
      });

      if (!success) {
        return {
          error: "Failed to update collection status",
        };
      }

      const updatedCollections =
        await this.collectionService.updateManyAndReturnCollections(
          { collectionID: { in: collectionIDS } },
          { isActive: true },
        );

      // logger.info(
      //   `✅ Successfully enabled ${updatedCollections.length} collections`,
      // );

      if (this.shop) {
        await upsertAutoSortingSchedule(this.shop);
      }

      return {
        success: true,
        message: "Collections enable successfully",
        updatedCollections: updatedCollections,
      };
    } catch (error) {
      console.error(`Failed to enable collections.`, error);
      throw new Error("Failed to enable collections.");
    }
  }

  async disableCollections(collectionIDS) {
    try {
      // logger.info(`📜 Disabling ${collectionIDS.length} collections.`);

      const collections = await this.collectionService.getManyCollections(
        { collectionID: { in: collectionIDS } },
        { currentSorting: true, collectionID: true },
      );

      const multipleUpdateInput = collections.map((collection) => {
        return `{
          id: "gid://shopify/Collection/${collection.collectionID}",
          sortOrder: ${collection.currentSorting}
        }`;
      });

      const { success } = await this.collectionGraphql.updateCollections({
        updates: multipleUpdateInput,
        fields: "id\nsortOrder",
        MAX_MUTATIONS_PER_BATCH: 50,
      });

      if (!success) {
        return {
          error: "Failed to update collection sorting rule.",
        };
      }

      const updatedCollections =
        await this.collectionService.updateManyAndReturnCollections(
          { collectionID: { in: collectionIDS } },
          { isActive: false, OOSCount: null },
        );

      // logger.info(
      //   `✅ Successfully disabled ${updatedCollections.length} collections`,
      // );

      if (this.shop) {
        // Check active collections count
        const activeCollectionsCount =
          await this.collectionService.countCollection({
            shop: this.shop,
            isActive: true,
          });
        if (activeCollectionsCount === 0) {
          const removeResult = await removeAutoSortingSchedule(this.shop);
          console.log(
            `Removed auto sorting job scheduler for shop ${this.shop}`,
            {
              removeResult,
            },
          );
        } else {
          // logger.debug(
          //   `There are still ${activeCollectionsCount} active collections. Not removing auto sorting job scheduler.`,
          // );
        }
      }

      return {
        success: true,
        message: "Collections disable successfully",
        updatedCollections: updatedCollections,
      };
    } catch (error) {
      console.error(`Failed to disable collections.`, error);
      throw new Error("Failed to disable collections.");
    }
  }

  async sortCollection(collectionID, shop) {
    try {
      // logger.info(`📜 Sorting ${collectionID} collection.`);

      const collection = await this.collectionService.getCollection({
        id: collectionID,
        useCache: false,
      });
      const merchant = await this.merchantService.getMerchant({
        shop,
        useCache: false,
      });

      const {
        continueSellingAsOOS,
        excludePushDown,
        excludePushDownTags,
        enableHiding,
        excludeHiding,
        excludeHideTags,
        hideAfterDays,
        selectedLocations = [],
      } = merchant;

      const { currentSorting } = collection;
      const currentSortingFilter = ProductCollectionSortValue[currentSorting];
      const productFilter = `sortKey: ${currentSortingFilter.sortKey}${currentSortingFilter?.reverse ? `, reverse: ${currentSortingFilter?.reverse}` : ``}`;
      const admin_graphql_api_id = retrieveAdminGraphqlID(
        collectionID,
        "Collection",
      );

      const productAggregation = await prisma.product.aggregate({
        _max: {
          variantsCount: true,
        },
      });

      const maxVariantCount = productAggregation?._max?.variantsCount || 10;
      const productsCount = collection?.productsCount || 250;

      const locationInventoryQuery = merchant?.selectedLocations?.length
        ? ProductUtils.getLocationsInventoryLevelQuery(
            merchant.selectedLocations,
          )
        : null;

      let { allProducts } =
        await this.bulkOperationGraphql.fetchShopifyCollectionData(
          admin_graphql_api_id,
          productFilter,
          maxVariantCount,
          productsCount > 250 ? 250 : productsCount,
          locationInventoryQuery,
        );

      // Destructure remove nodes level from variants
      allProducts = allProducts.map((product) => {
        const { variants, ...rest } = product;
        return {
          ...rest,
          variants: variants.nodes,
        };
      });

      // Store Should Push Down Items
      const instockItems = allProducts.filter(
        (p) =>
          !ProductUtils.shouldPushDown(
            p,
            continueSellingAsOOS,
            excludePushDown,
            excludePushDownTags,
            selectedLocations,
          ),
      );
      const OOSItems = allProducts.filter((p) =>
        ProductUtils.shouldPushDown(
          p,
          continueSellingAsOOS,
          excludePushDown,
          excludePushDownTags,
          selectedLocations,
        ),
      );

      const sortedProducts = [...instockItems, ...OOSItems];

      const moves = [];
      for (let i = 0; i < sortedProducts.length; i++) {
        moves.push({
          id: sortedProducts[i].id,
          newPosition: String(i),
        });
      }

      if (moves.length > 0) {
        const { userErrors } =
          await this.collectionGraphql.reorderCollectionProducts({
            id: admin_graphql_api_id,
            moves: moves,
          });

        if (userErrors?.length > 0) {
          // logger.error(`Failed to reorder collection products.`, userErrors);
          return {
            error: "Failed to reorder collection products.",
          };
        }
      }

      const updatedCollection = await this.collectionService.updateCollection(
        collectionID,
        {
          OOSCount: OOSItems.length,
          lastRunAt: new Date(),
        },
      );

      // logger.info(`✅ Successfully pushed down ${collectionID} collections`);
      // logger.debug(`Process hiding for OOS products`, {enableHiding})
      // if (enableHiding) {
      //   for (const OOSItem of OOSItems) {
      //     const productTags = OOSItem.tags || [];
      //     const shouldhide = shouldHideProduct(productTags, excludeHiding, excludeHideTags)
      //     logger.debug(`Should hide product ${OOSItem.legacyResourceId}: ${shouldhide}`)
      //     if (shouldhide) {
      //       await this.scheduleHideProductJobs(
      //         OOSItem.legacyResourceId,
      //         hideAfterDays,
      //       );
      //     }
      //   }
      // }

      return {
        success: true,
        message: "Collections sorted successfully",
        updatedCollections: [updatedCollection],
      };
    } catch (error) {
      // logger.error(`Failed to sort collections.`, error);
      throw new Error("Failed to sort collections.");
    }
  }

  async syncStoreCollections(shop, forceSync = false) {
    try {
      // logger.info("📜 Starting collection synchronization");

      // Fetch collection count from database
      const totalCollection = await this.collectionService.countCollection({
        shop,
      });
      const { collectionCount } =
        await this.collectionGraphql.getCollectionCount();

      // logger.info(
      //   `totalCollection: ${totalCollection}, collectionCount: ${collectionCount}`,
      // );

      if (totalCollection === collectionCount && !forceSync) {
        // logger.info(
        //   `No need to synchronize collections. Already synchronized.`,
        // );
        return {
          success: true,
          message: "No need to synchronize collections.",
          count: totalCollection,
        };
      }

      // Fetch collections from Shopify
      const graphqlCollections = await this.collectionGraphql.getAllCollections(
        {
          fields: `
          id
          legacyResourceId
          title
          handle
          updatedAt
          productsCount {
            count
            precision
          }
          sortOrder`,
        },
      );

      // Prepare collections data for create many
      const collectionsData = graphqlCollections.map((collection) => ({
        collectionID: collection.legacyResourceId,
        title: collection.title,
        handle: collection.handle,
        currentSorting: collection.sortOrder,
        updatedAt: collection.updatedAt,
        productsCount: collection.productsCount.count,
        shop,
      }));

      // Create collections in bulk
      const createdCollections =
        await this.collectionService.createManyCollections({
          data: collectionsData,
          skipDuplicates: true,
        });

      
      // logger.debug(
      //   `Total product: ${totalCollection}, collections fetched: ${collectionsData.length}`,
      // );
      if (totalCollection > collectionsData.length) {
        // logger.debug(`Require delete extra products in DB`);
        const allDBCollections = await this.collectionService.getManyCollections(
          {},
          { collectionID: true },
        );
        // logger.debug(`Total collections in DB: ${allDBCollections}`);
        // Delete products that should be removed in db
        const collectionsToDelete = allDBCollections.filter(
          (dbCollection) =>
            !collectionsData.some(
              (collection) => collection.legacyResourceId === dbCollection.collectionID,
            ),
        );

        if (collectionsToDelete.length > 0) {
          await this.collectionService.deleteManyCollections({
            collectionID: {
              in: collectionsToDelete.map((c) => c.collectionID),
            },
          });

          // logger.debug(
          //   `Deleted ${collectionsToDelete.length} collections that are no longer in Shopify`,
          // );
        }
      }

      // Get latest collection count
      const latestCollectionCount =
        await this.collectionService.countCollection({ shop });

      // Update merchant collection count
      await this.merchantService.updateMerchant(shop, {
        collectionCount: latestCollectionCount,
      });
      // logger.info(
      //   `✅ Successfully synchronized ${createdCollections.count} collections`,
      // );

      return {
        success: true,
        message: "Collections synchronized successfully",
        count: graphqlCollections.length,
      };
    } catch (error) {
      // logger.error(`Failed synchronize collections.`, error);
      throw new Error("Failed synchronize collections.");
    }
  }
}
