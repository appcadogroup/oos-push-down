// src/controllers/productController.js
import { 
  // getLogger,
  ProductService, 
  ProductGraphql } from "@acme/core/server";
import { retrieveAdminLegacyResourceID } from "@acme/core";

// Server Side Imports
import prisma from "@acme/db";

// const logger = getLogger('controller/product');

export class ProductController {
  constructor(admin) {
    this.productService = new ProductService(prisma);
    this.productGraphql = new ProductGraphql(admin);
  }

  async syncStoreProducts(shop, forceSync = false) {
    try {
      // logger.debug("Starting product synchronization");

      // Fetch product count from database
      const totalProduct = await this.productService.countProduct({ shop });
      const { productsCount } = await this.productGraphql.getProductsCount({});

      if (totalProduct === productsCount && !forceSync) {
        // logger.debug(
        //   `Product count in database is up to date: ${totalProduct}`,
        // );
        return {
          success: true,
          message: "Products already synchronized",
          count: totalProduct,
        };
      }

      // Fetch all products from Shopify
      const graphqlProducts = await this.productGraphql.getAllProducts({
        fields: `    
        legacyResourceId
        handle
        tags
        title
        status
        publishedAt
        createdAt
        updatedAt
        variantsCount {
          count
        }
        hasOutOfStockVariants`,
      });

      // Prepare products data for create many
      const productsData = graphqlProducts.map((product) => ({
        title: product.title,
        handle: product.handle,
        status: product.status,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        publishedAt: product.publishedAt,
        tags: product.tags,
        productID: product.legacyResourceId,
        variantsCount: product.variantsCount.count,
        shop: shop,
      }));

      let updatedProductsCount = 0;

      if (forceSync) {
        for (const productData of productsData) {
          // Upsert each product individually
          const { productID, ...data } = productData;

          await this.productService.upsertProduct(productID, data);

          // logger.debug(
          //   `Product ${productData.title} synchronized successfully`,
          // );
          updatedProductsCount++;
        }
      } else {
        // Create products in bulk
        const createdProducts = await this.productService.createManyProducts({
          data: productsData,
          skipDuplicates: true,
        });

        updatedProductsCount = createdProducts.count;
      }

      // logger.debug(
      //   `Total product: ${totalProduct}, products fetched: ${productsData.length}`,
      // );
      if (totalProduct > productsData.length) {
        // logger.debug(`Require delete extra products in DB`);
        const allDBProducts = await this.productService.getManyProducts(
          {},
          { productID: true },
        );
        // logger.debug(`Total products in DB: ${allDBProducts}`);
        // Delete products that should be removed in db
        const productsToDelete = allDBProducts.filter(
          (dbProduct) =>
            !productsData.some(
              (product) => product.legacyResourceId === dbProduct.productID,
            ),
        );

        if (productsToDelete.length > 0) {
          await this.productService.deleteManyProducts({
            productID: {
              in: productsToDelete.map((p) => p.productID),
            },
          });

          // logger.debug(
          //   `Deleted ${productsToDelete.length} products that are no longer in Shopify`,
          // );
        }
      }

      // Get latest product count
      const productCount = await prisma.product.count({
        where: { shop },
      });

      // Update merchant product count
      await prisma.merchant.update({
        where: { shop },
        data: { productCount },
      });

      // logger.info(`Successfully synchronized ${updatedProductsCount} products`);

      return {
        success: true,
        message: "Products synchronized successfully",
        count: graphqlProducts.length,
      };
    } catch (error) {
      // logger.error(`Failed synchronize products.`, error.message);
      throw new Error("Failed synchronize products.");
    }
  }

  async syncStorePublications(shop) {
    try {
      // logger.info("Starting publications synchronization");

      // Fetch all products from Shopify
      const { catalogs } = await this.productGraphql.getCatalogs();

      const publications = catalogs.filter((catalog) =>
        catalog.title.includes("Online Store"),
      );
      // Prepare products data for create many
      const publicationData = publications.map((catalog) => ({
        publicationID: retrieveAdminLegacyResourceID(
          catalog.publication.id,
          "Publication",
        ),
        title: catalog.title,
        shop: shop,
      }));

      // Create products in bulk
      const createdPublications =
        await this.productService.createManyPublications({
          data: publicationData,
          skipDuplicates: true,
        });

      // logger.info(
      //   `Successfully synchronized ${createdPublications.count} publications`,
      // );

      return {
        success: true,
        message: "Publications synchronized successfully",
        count: createdPublications.length,
      };
    } catch (error) {
      // logger.error(`Failed synchronize publications.`, error);
      throw new Error("Failed synchronize publications.");
    }
  }
}
