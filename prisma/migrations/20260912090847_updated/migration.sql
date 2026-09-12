-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "tipAmount" DECIMAL(65,30) DEFAULT 0;

-- CreateTable
CREATE TABLE "tips" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "baristaId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "message" TEXT,
    "payType" "PayType" DEFAULT 'CARD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tips_orderId_key" ON "tips"("orderId");

-- AddForeignKey
ALTER TABLE "tips" ADD CONSTRAINT "tips_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tips" ADD CONSTRAINT "tips_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tips" ADD CONSTRAINT "tips_baristaId_fkey" FOREIGN KEY ("baristaId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
