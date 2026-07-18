/*
  Warnings:

  - Added the required column `name` to the `Product` table without a default value. This is not possible if the table is not empty.
  - A unique constraint covering the columns `[name]` on the `Product` table will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the `Product` table will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable: add name with temporary default
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';

-- Remove the default
ALTER TABLE "Product" ALTER COLUMN "name" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Product_name_key" ON "Product"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Product_slug_key" ON "Product"("slug");
