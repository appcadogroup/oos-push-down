-- CreateEnum
CREATE TYPE "CollectionSorting" AS ENUM ('ALPHA_ASC', 'ALPHA_DESC', 'BEST_SELLING', 'CREATED', 'CREATED_DESC', 'MANUAL', 'PRICE_ASC', 'PRICE_DESC');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DRAFT');

-- CreateEnum
CREATE TYPE "BulkOperationAction" AS ENUM ('PUSH_DOWN', 'SYNC_COLLECTIONS', 'SYNC_PRODUCTS');

-- CreateEnum
CREATE TYPE "BulkOperationErrorCode" AS ENUM ('ACCESS_DENIED', 'INTERNAL_SERVER_ERROR', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "BulkOperationStatus" AS ENUM ('CANCELED', 'COMPLETED', 'CREATED', 'EXPIRED', 'FAILED', 'RUNNING', 'PENDING');

-- CreateEnum
CREATE TYPE "OOSSortOrder" AS ENUM ('PRIMARY_ORDER', 'NEWEST_AT_TOP');

-- CreateEnum
CREATE TYPE "HidingChannel" AS ENUM ('ONLINE_STORE', 'ALL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'DECLINED', 'EXPIRED', 'FROZEN');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "accessToken" TEXT NOT NULL,
    "expires" TIMESTAMP(3),
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Merchant" (
    "id" SERIAL NOT NULL,
    "shop" TEXT NOT NULL,
    "shopID" BIGINT,
    "activePlan" TEXT NOT NULL DEFAULT 'Free Subscription',
    "timezone" TEXT,
    "isCollectionSynced" BOOLEAN NOT NULL DEFAULT false,
    "collectionCount" INTEGER NOT NULL DEFAULT 0,
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "OOSSortOrder" "OOSSortOrder" NOT NULL DEFAULT 'PRIMARY_ORDER',
    "autoEnableCollection" BOOLEAN NOT NULL DEFAULT false,
    "continueSellingAsOOS" BOOLEAN NOT NULL DEFAULT false,
    "tagOOSProduct" BOOLEAN NOT NULL DEFAULT false,
    "OOSProductTag" TEXT,
    "excludePushDown" BOOLEAN NOT NULL DEFAULT false,
    "excludePushDownTags" JSONB NOT NULL DEFAULT '[]',
    "enableHiding" BOOLEAN NOT NULL DEFAULT false,
    "hideAfterDays" INTEGER NOT NULL DEFAULT 0,
    "hidingChannel" "HidingChannel" NOT NULL DEFAULT 'ONLINE_STORE',
    "republishHidden" BOOLEAN NOT NULL DEFAULT false,
    "tagHiddenProduct" BOOLEAN NOT NULL DEFAULT false,
    "hiddenProductTag" TEXT,
    "excludeHiding" BOOLEAN NOT NULL DEFAULT false,
    "excludeHideTags" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "trialEnd" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("shop")
);

-- CreateTable
CREATE TABLE "Product" (
    "productID" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "status" "ProductStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "variantsCount" INTEGER NOT NULL DEFAULT 0,
    "hasOutOfStockVariants" BOOLEAN NOT NULL DEFAULT false,
    "hasContinueSelling" BOOLEAN NOT NULL DEFAULT false,
    "OOS" BOOLEAN NOT NULL DEFAULT false,
    "OOSAt" TIMESTAMP(3),
    "pushedDown" BOOLEAN NOT NULL DEFAULT false,
    "pushedDownAt" TIMESTAMP(3),
    "hiddenAt" TIMESTAMP(3),
    "scheduledHidden" TIMESTAMP(3),
    "tags" JSONB NOT NULL DEFAULT '[]',
    "shop" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("productID")
);

-- CreateTable
CREATE TABLE "Collection" (
    "title" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "currentSorting" "CollectionSorting",
    "collectionID" BIGINT NOT NULL,
    "OOSCount" INTEGER,
    "productsCount" INTEGER,
    "shop" TEXT NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("collectionID")
);

-- CreateTable
CREATE TABLE "Publication" (
    "publicationID" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "shop" TEXT NOT NULL,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("publicationID")
);

-- CreateTable
CREATE TABLE "BulkOperation" (
    "id" SERIAL NOT NULL,
    "operationID" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "BulkOperationAction" NOT NULL,
    "status" "BulkOperationStatus" NOT NULL,
    "errorCode" "BulkOperationErrorCode",
    "jobData" JSONB,
    "completedAt" TIMESTAMP(3),
    "objectCount" INTEGER,
    "shop" TEXT NOT NULL,

    CONSTRAINT "BulkOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingJob" (
    "id" SERIAL NOT NULL,
    "shopId" TEXT NOT NULL,
    "collectionData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_shop_key" ON "Merchant"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "BulkOperation_operationID_key" ON "BulkOperation"("operationID");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Merchant"("shop") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Merchant"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Merchant"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Merchant"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkOperation" ADD CONSTRAINT "BulkOperation_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Merchant"("shop") ON DELETE CASCADE ON UPDATE CASCADE;
