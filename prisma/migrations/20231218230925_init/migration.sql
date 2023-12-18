-- CreateTable
CREATE TABLE "FaxClan" (
    "clanId" INTEGER NOT NULL,
    "clanName" TEXT NOT NULL,
    "clanTitle" TEXT,
    "faxMonster" TEXT,
    "faxMonsterId" INTEGER,
    "faxMonsterLastChanged" INTEGER,
    "clanFirstAdded" INTEGER NOT NULL,
    "clanLastChecked" INTEGER NOT NULL,

    CONSTRAINT "FaxClan_pkey" PRIMARY KEY ("clanId")
);

-- CreateTable
CREATE TABLE "MonsterData" (
    "monsterId" INTEGER NOT NULL,
    "mafiaName" TEXT NOT NULL,
    "manualName" TEXT,

    CONSTRAINT "MonsterData_pkey" PRIMARY KEY ("monsterId")
);

-- CreateTable
CREATE TABLE "FaxRecord" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "playerClan" INTEGER,
    "faxClan" INTEGER,
    "faxRequest" TEXT NOT NULL,
    "started" INTEGER NOT NULL,
    "completed" INTEGER,
    "outcome" TEXT NOT NULL,

    CONSTRAINT "FaxRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FaxClan_clanId_key" ON "FaxClan"("clanId");

-- CreateIndex
CREATE UNIQUE INDEX "FaxClan_clanName_key" ON "FaxClan"("clanName");

-- CreateIndex
CREATE UNIQUE INDEX "MonsterData_monsterId_key" ON "MonsterData"("monsterId");
