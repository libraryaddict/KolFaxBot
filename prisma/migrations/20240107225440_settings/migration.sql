-- CreateTable
CREATE TABLE "CustomSetting" (
    "id" SERIAL NOT NULL,
    "author" INTEGER NOT NULL,
    "created" INTEGER NOT NULL,
    "monster" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "CustomSetting_pkey" PRIMARY KEY ("id")
);
