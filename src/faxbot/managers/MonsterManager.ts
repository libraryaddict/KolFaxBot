import { addLog } from "../../Settings";
import type { FaxbotDatabaseMonster, MonsterData } from "../../utils/Typings";
import { getFaxSourceClans, setMonsterListOutdated } from "./ClanManager";
import { loadMonstersFromDatabase, saveMonsters } from "./DatabaseManager";
import axios from "axios";

const monsters: MonsterData[] = [];

/**
 * Only invoked when we encounter a monster ID we don't know. Should probably also invoke it every X while. Like every other week.
 */
async function updateMonsterData() {
  addLog(`Now rebuilding monsters from kolmafia..`);
  const fetchedFile = (
    await axios(
      `https://raw.githubusercontent.com/kolmafia/kolmafia/main/src/data/monsters.txt`,
      {
        method: `GET`,
        maxRedirects: 0,
        validateStatus: (status) => status === 200
      }
    )
  ).data;

  await loadMonstersByString(fetchedFile.toString());
  await loadMonsters();
  setMonsterListOutdated();
}

async function loadMonstersByString(monstersFile: string) {
  monsters.splice(0);

  for (const line of monstersFile.split(/[\r\n]+/)) {
    if (line.startsWith(`#`)) {
      continue;
    }

    const match = line.match(/^([^\t]*)\t(-?\d+)\t[^\t]*\t([^\t]*)/);

    if (match == null) {
      continue;
    }

    const manual = match[2].match(/Manuel: (?:([^ ]*)|"(.*?)"(?:$| ))/);

    const data: MonsterData = {
      id: parseInt(match[2]),
      name: match[1],
      manualName: manual == null ? null : manual[1] ?? manual[2],
      category: line.includes(`NOWISH`) ? `Unwishable` : null
    };

    monsters.push(data);
  }

  await saveMonsters(monsters);
}

let lastUpdate = 0;

export async function tryUpdateMonsters() {
  if (lastUpdate + 12 * 60 * 60 * 1000 > Date.now()) {
    return;
  }

  addLog(`Found unrecognized monster, trying to update our list of monsters..`);
  lastUpdate = Date.now();

  await updateMonsterData();
}

export async function loadMonsters() {
  const dbMonsters = await loadMonstersFromDatabase();

  if (dbMonsters.length == 0) {
    await updateMonsterData();

    return;
  }

  monsters.splice(0);
  monsters.push(...dbMonsters);

  const couldMatch = (name1: string, name2: string) => {
    if ((name1 ?? ``) == `` || (name2 ?? ``) == ``) {
      return false;
    }

    // Turn [32]goblin into goblin
    // Turn goblin (blind) into goblin
    name1 = name1
      .toLowerCase()
      .replaceAll(/[([].+?[\])]/g, ``)
      .replaceAll(/[^a-z0-9]/g, ``);
    name2 = name2
      .toLowerCase()
      .replaceAll(/[([].+?[\])]/g, ``)
      .replaceAll(/[^a-z0-9]/g, ``);

    return name1 == name2;
  };

  for (const monster of monsters) {
    const matches = monsters.filter((m) => {
      if (m.id == monster.id) {
        return false;
      }

      for (const m1 of [monster.name, monster.manualName]) {
        for (const m2 of [m.name, m.manualName]) {
          if (couldMatch(m1, m2)) {
            return true;
          }
        }
      }

      return false;
    });

    monster.ambiguous = matches.length > 0;
  }

  addLog(`Loaded ${monsters.length} monsters`);
}

export function getMonsterById(id: number): MonsterData {
  return monsters.find((m) => m.id == id);
}

/**
 *
 */
export function getMonster(identifier: string): MonsterData[] {
  // Lowercase it then replace any spaces with no-spaces
  // We're not going to get smarter about this yet
  identifier = identifier.replaceAll(` `, ``).toLowerCase();

  if (identifier.match(/^\[\d+\]/)) {
    identifier = identifier.match(/(\d+)/)[1];
  }

  let result = monsters.filter((m) => m.id.toString() == identifier);

  if (result.length >= 1) {
    return result;
  }

  result = monsters.filter(
    (m) =>
      m.manualName &&
      m.manualName.replaceAll(` `, ``).toLowerCase() == identifier
  );

  if (result.length == 1) {
    return result;
  }

  result = monsters.filter(
    (m) => m.name && m.name.replaceAll(` `, ``).toLowerCase() == identifier
  );

  if (result.length > 0) {
    return result;
  }

  result = monsters.filter(
    (m) =>
      m.manualName &&
      m.manualName.replaceAll(` `, ``).toLowerCase().startsWith(identifier)
  );

  if (result.length > 0) {
    return result;
  }

  result = monsters.filter(
    (m) =>
      m.name && m.name.replaceAll(` `, ``).toLowerCase().startsWith(identifier)
  );

  if (result.length > 0) {
    return result;
  }

  // Finally just find any monsters that contain this monster name
  result = monsters.filter(
    (m) =>
      m.manualName &&
      m.manualName.replaceAll(` `, ``).toLowerCase().includes(identifier)
  );

  if (result.length == 0) {
    result = monsters.filter(
      (m) =>
        m.name && m.name.replaceAll(` `, ``).toLowerCase().includes(identifier)
    );
  }

  return result;
}

export function createMonsterList(): FaxbotDatabaseMonster[] {
  const validClans = getFaxSourceClans();
  const monsterList: FaxbotDatabaseMonster[] = [];

  for (const clan of validClans) {
    const monsterData =
      clan.faxMonsterId != null
        ? getMonsterById(clan.faxMonsterId)
        : getMonster(clan.faxMonster)[0];

    if (monsterData == null) {
      addLog(
        `Unable to find a monster '${clan.faxMonster}'. We have ${monsters.length} monsters loaded`
      );
      continue;
    }

    const monster: FaxbotDatabaseMonster = {
      name: monsterData.name,
      actual_name: monsterData.name,
      command: `[${monsterData.id}]${monsterData.name}`,
      category: monsterData.category ?? `None`
    };

    monsterList.push(monster);
  }

  return monsterList;
}

export function getMonsters() {
  return monsters;
}
