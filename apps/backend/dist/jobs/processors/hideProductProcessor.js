// Hide Product Processor for hide product queue
// import { HidingChannel } from "prisma/client";
const HidingChannel = {
  ONLINE_STORE: "ONLINE_STORE",
  ALL: "ALL"
};
import { ProductService, MerchantService, ProductGraphql, getLogger } from "@acme/core/server";
import { retrieveAdminGraphqlID, isNotEmptyStringAndNull } from "@acme/core";
import { getAuthenticatedAdmin } from "../../app.js";
const logger = getLogger("jobs/hideProduct");
export const hideProductProcessor = async job => {
  const {
    shop,
    productID
  } = job.data;
  if (!shop || !productID) {
    throw new Error(`Missing shop or productID in job data`);
  }
  logger.info(`[Processor] ${shop} | ${productID}`);
  const admin = await getAuthenticatedAdmin(shop);
  if (!admin) {
    throw new Error(`Admin not found for shop ${shop}`);
  }
  const merchantService = new MerchantService();
  const productService = new ProductService();
  const productGraphql = new ProductGraphql(admin);
  const merchant = await merchantService.getMerchant({
    shop,
    useCache: false
  });
  const {
    enableHiding,
    hidingChannel,
    tagHiddenProduct,
    hiddenProductTag
  } = merchant;
  if (!enableHiding) {
    return null;
  }
  logger.debug(`[Processor] Hiding product | ${hidingChannel}`);
  if (hidingChannel === HidingChannel.ONLINE_STORE) {
    const publication = await productService.getFirstPublications({
      where: {
        shop
      }
    });
    if (!publication) {
      logger.info(`No publication found`);
      return null;
    }
    const result = await productGraphql.unpublishProduct({
      id: productID,
      productPublications: [{
        publicationId: retrieveAdminGraphqlID(publication.publicationID, "Publication")
      }]
    });
    logger.debug(`[Processor] Unpublished product | ${hidingChannel}`, {
      result
    });
  } else if (hidingChannel === HidingChannel.ALL) {
    const result = await productGraphql.updateProduct({
      id: productID,
      data: {
        status: "DRAFT"
      }
    });
    logger.debug(`[Processor] Updated product status to DRAFT | ${hidingChannel}`, {
      result
    });
  }
  await productService.updateProduct(productID, {
    hiddenAt: new Date(),
    scheduledHidden: null
  });
  if (tagHiddenProduct && isNotEmptyStringAndNull(hiddenProductTag)) {
    await productGraphql.addProductTags({
      id: productID,
      tags: hiddenProductTag
    });
    logger.info(`🏷️ Tagged product as hidden`, {
      tag: hiddenProductTag
    });
  }
  return {
    ...job.data
  };
};