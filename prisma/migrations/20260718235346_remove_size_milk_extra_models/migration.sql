-- DropForeignKey
ALTER TABLE "ProductExtra" DROP CONSTRAINT "ProductExtra_extraId_fkey";

-- DropForeignKey
ALTER TABLE "ProductMilk" DROP CONSTRAINT "ProductMilk_milkId_fkey";

-- DropForeignKey
ALTER TABLE "ProductSize" DROP CONSTRAINT "ProductSize_sizeId_fkey";

-- AlterTable
ALTER TABLE "ProductExtra" DROP COLUMN "extraId";

-- AlterTable
ALTER TABLE "ProductMilk" DROP COLUMN "milkId";

-- AlterTable
ALTER TABLE "ProductSize" DROP COLUMN "sizeId";

-- DropTable
DROP TABLE "Extra";

-- DropTable
DROP TABLE "Milk";

-- DropTable
DROP TABLE "Size";
