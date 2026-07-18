/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Size` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Size_name_key" ON "Size"("name");
