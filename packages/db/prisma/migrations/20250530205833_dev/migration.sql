-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_shop_fkey";

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "selectedLocations" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "Location" (
    "locationID" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL,
    "shop" TEXT NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("locationID")
);

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Merchant"("shop") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_shop_fkey" FOREIGN KEY ("shop") REFERENCES "Merchant"("shop") ON DELETE CASCADE ON UPDATE CASCADE;
