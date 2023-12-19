import type {
  DepositedFax,
  FaxClanData,
  MonsterData,
} from "../../utils/Typings.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function loadClansFromDatabase(): Promise<FaxClanData[]> {
  const clans = await prisma.faxClan.findMany();
  const list: FaxClanData[] = [];

  for (const clan of clans) {
    list.push({
      ...clan,
    });
  }

  return list;
}

export async function saveClan(faxClan: FaxClanData) {
  await prisma.faxClan.upsert({
    where: { clanId: faxClan.clanId },
    update: {
      clanTitle: faxClan.clanTitle,
      faxMonster: faxClan.faxMonster,
      faxMonsterId: faxClan.faxMonsterId,
      faxMonsterLastChanged: faxClan.faxMonsterLastChanged,
      clanLastChecked: faxClan.clanLastChecked,
    },
    create: {
      clanId: faxClan.clanId,
      clanName: faxClan.clanName,
      clanTitle: faxClan.clanTitle,
      faxMonster: faxClan.faxMonster,
      faxMonsterId: faxClan.faxMonsterId,
      faxMonsterLastChanged: faxClan.faxMonsterLastChanged,
      clanFirstAdded: faxClan.clanFirstAdded,
      clanLastChecked: faxClan.clanLastChecked,
    },
  });
}

export async function removeClan(clanId: number) {
  await prisma.faxClan.delete({ where: { clanId } });
}

export async function addFaxLog(fax: DepositedFax) {
  await prisma.faxRecord.create({
    data: {
      playerId: parseInt(fax.requester.id),
      faxClan: fax.faxClan,
      playerClan: fax.clanId,
      completed: fax.completed,
      started: fax.requested,
      outcome: fax.outcome,
      faxRequest: fax.request,
    },
  });
}

export async function loadMonstersFromDatabase(): Promise<MonsterData[]> {
  const monsters = await prisma.monsterData.findMany();
  const list: MonsterData[] = [];

  for (const monsterData of monsters) {
    list.push({
      id: monsterData.monsterId,
      name: monsterData.mafiaName,
      manualName: monsterData.manualName,
    });
  }

  return list;
}

export async function saveMonsters(monsters: MonsterData[]) {
  for (const monster of monsters) {
    await prisma.monsterData.upsert({
      where: { monsterId: monster.id },
      create: {
        monsterId: monster.id,
        mafiaName: monster.name,
        manualName: monster.manualName,
      },
      update: {
        mafiaName: monster.name,
        manualName: monster.manualName,
      },
    });
  }
}
