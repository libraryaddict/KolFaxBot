import { addLog } from "../../Settings";
import type {
  ClanType,
  FaxClanData,
  KoLClan,
  MonsterData,
  UserClan,
} from "../../utils/Typings";
import { loadClansFromDatabase, removeClan, saveClan } from "./DatabaseManager";
import { getMonster, getMonsterById } from "./MonsterManager";

// The clans we have access to. If we lose access to a clan, we will remove them from this list
const clans: FaxClanData[] = [];
let updateMonsterList: boolean = false;

export function setMonsterListUpdated() {
  updateMonsterList = false;
}

export function isMonsterListOutdated() {
  return updateMonsterList;
}

export function setMonsterListOutdated() {
  return updateMonsterList;
}

export function getClanById(id: number): UserClan {
  const def = clans.find((c) => c.clanId == id);

  if (def == null) {
    return null;
  }

  return {
    name: def.clanName,
    id: def.clanId,
    title: def.clanTitle,
  };
}

export function getClanDataById(id: number): FaxClanData {
  return clans.find((d) => d.clanId == id);
}

export function getClanType(clan: FaxClanData): ClanType {
  if ((clan.clanTitle ?? ``).toLowerCase().includes(`source`)) {
    return `Fax Source`;
  }

  return `Random Clan`;
}

export function getClanMonsterType(clan: FaxClanData): number {
  if (clan.clanTitle == null) {
    return null;
  }

  const match = clan.clanTitle.match(/Source: M(\d+)$/i);

  if (match == null) {
    return null;
  }

  return parseInt(match[1]);
}

/**
 * Use the first clan that perfectly or vaguely matches, return early if perfect match
 */
export function getClanByMonster(monster: MonsterData): FaxClanData {
  let usingClan: FaxClanData = null;
  let sMonster: boolean = false;
  let fSource: boolean = false;

  const isBetterPick = (specificMonster: boolean, faxSource: boolean) => {
    if (usingClan == null) {
      return true;
    }

    // We always prioritize the specific monster if possible
    if (sMonster != specificMonster) {
      // Replace if the replacement is the specific monster
      return specificMonster;
    }

    // If one of them is marked as a fax source and the other isn't
    if (faxSource != fSource) {
      // Replace if the replacement is the fax source
      return faxSource;
    }

    // Don't replace, they're equal
    return false;
  };

  const sorted = [...clans.filter((c) => c.faxMonster != null)];
  // Sort so the older faxes go first as they're more reliable
  sorted.sort((c1, c2) => {
    const t1 = c1.faxMonsterLastChanged;
    const t2 = c2.faxMonsterLastChanged;

    if (t1 == t2) {
      return 0;
    }

    if (t1 == null || t2 == null) {
      return t1 == null ? 1 : -1;
    }

    return t1 - t2;
  });

  for (const clan of sorted) {
    const faxSource = getClanType(clan) == `Fax Source`;
    const isMonster = clan.faxMonster == (monster.manualName ?? monster.name);
    let specificMonster = clan.faxMonsterId == monster.id;

    if (!specificMonster && !isMonster) {
      continue;
    }

    if (!monster.ambiguous) {
      specificMonster = true;
    }

    if (!isBetterPick(specificMonster, faxSource)) {
      continue;
    }

    fSource = faxSource;
    sMonster = specificMonster;
    usingClan = clan;
  }

  return usingClan;
}

export function getOutdatedClans() {
  const lastCheckedCutoff = Math.round(Date.now() / 1000) - 60 * 60 * 24 * 14; // 2 weeks

  return clans.filter((c) => c.clanLastChecked < lastCheckedCutoff);
}

export async function updateClan(clan: FaxClanData) {
  const existing = clans.find((c) => c.clanId == clan.clanId);

  if (existing != null) {
    existing.clanTitle = clan.clanTitle;
    existing.faxMonster = clan.faxMonster;
    existing.faxMonsterId = clan.faxMonsterId;
    existing.clanLastChecked = clan.clanLastChecked;
    existing.faxMonsterLastChanged = clan.faxMonsterLastChanged;
    clan = existing;
  } else {
    clans.push(clan);
    updateMonsterList = true;
  }

  if (clan.clanLastChecked == 0) {
    // If we haven't checked this clan, don't add it to the database yet..
    return;
  }

  await saveClan(clan);
}

export async function removeInaccessibleClans(clansWeCanAccess: KoLClan[]) {
  const toRemove = clans.filter(
    (c) => !clansWeCanAccess.some((c1) => c1.id == c.clanId)
  );

  if (toRemove.length == 0) {
    return;
  }

  for (const clan of toRemove) {
    const index = clans.indexOf(clan);

    clans.splice(index, 1);
    await removeClan(clan.clanId);
  }

  updateMonsterList = true;
}

export function getUnknownClans(whitelistedClans: KoLClan[]): KoLClan[] {
  // Return every clan we do not know of, or do not know the title of
  return whitelistedClans.filter((clan) => {
    const found = clans.find((c) => c.clanId == clan.id);

    return found == null || found.clanTitle == null;
  });
}

export async function setFaxMonster(
  clan: FaxClanData,
  monsterName: string,
  monsterId: number
) {
  if (
    clan.faxMonster != monsterName ||
    (clan.faxMonsterId != null && clan.faxMonsterId != monsterId)
  ) {
    clan.faxMonsterLastChanged = Math.round(Date.now() / 1000);
  }

  if (clan.faxMonster != monsterName || monsterId != null) {
    clan.faxMonsterId = monsterId;
  }

  clan.faxMonster = monsterName;
  updateMonsterList = true;
  await updateClan(clan);
}

export function getRolloverFax(): FaxClanData {
  // First we filter by monsters we don't know the ID of
  const clanTargets = clans
    .filter(
      (c) =>
        getClanType(c) == `Fax Source` &&
        c.faxMonster != null &&
        c.faxMonsterId == null
    )
    .filter((c) => {
      const monsters = getMonster(c.faxMonster);

      // Loop through the monsters that this fax could be
      for (const m of monsters) {
        // If this monster isn't ambiguous, bit weird if we have multiple matches but ok!
        if (!m.ambiguous) {
          continue;
        }

        // If we already know a clan that has this possible monster
        const alreadyHave = clans.some((c) => c.faxMonsterId == m.id);

        // Then we don't need to check this monster specifically
        if (alreadyHave) {
          continue;
        }

        // One of the possible monsters this could be, is not known in our network
        return true;
      }

      // We failed to find a monster that is ambigious
      return false;
    });

  // No possible targets
  if (clanTargets.length == 0) {
    return null;
  }

  // Sort from oldest checked to newest checked
  clanTargets.sort((c1, c2) => c1.clanLastChecked - c2.clanLastChecked);

  // Return first matching
  return clanTargets[0];
}

export function getFaxSourceClans(): FaxClanData[] {
  return clans.filter(
    (c) => getClanType(c) == `Fax Source` && c.faxMonster != null
  );
}

export function isUnknownMonsterInClanData(): boolean {
  return clans.some(
    (c) => c.faxMonster != null && getMonster(c.faxMonster).length == 0
  );
}

export function getSpecificFaxSources(): [FaxClanData, number][] {
  const mapped: [FaxClanData, number][] = clans.map((c) => [
    c,
    getClanMonsterType(c),
  ]);

  return mapped.filter(
    ([c, type]) => type != null && getMonsterById(type) != null
  );
}

export async function loadClans() {
  clans.splice(0);

  clans.push(...(await loadClansFromDatabase()));

  const faxSources = clans.filter((c) => getClanType(c) == `Fax Source`);
  const monsters = [];
  faxSources.forEach((c) => {
    if (c.faxMonster == null || monsters.includes(c.faxMonster)) {
      return;
    }

    monsters.push(c.faxMonster);
  });

  addLog(
    `Loaded ${clans.length} clans, of which ${faxSources.length} are fax sources and contain ${monsters.length} different monsters.`
  );
}
