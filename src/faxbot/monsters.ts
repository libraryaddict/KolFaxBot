import { config } from "../config.js";
import { addLog } from "../Settings.js";
import type {
  FaxbotDatabase,
  FaxbotDatabaseMonster,
  MonsterCategory,
  MonsterData,
} from "../types.js";
import { invalidateReportCache } from "../utils/reportCacheMiddleware.js";
import { formatNumber } from "../utils/utilities.js";
import {
  getClanStatistics,
  getFaxSourceClans,
} from "./managers/ClanManager.js";
import {
  getFaxStatistics,
  loadMonstersFromDatabase,
  saveMonsters,
} from "./managers/DatabaseManager.js";
import axios from "axios";
import { encodeXML } from "entities";
import { readFileSync } from "fs";
import { marked } from "marked";

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
        validateStatus: (status) => status === 200,
      }
    )
  ).data as string;

  await loadMonstersByString(fetchedFile.toString());
  await loadMonsters();
  invalidateReportCache();
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
    let category: MonsterCategory = `Other`;

    if (line.includes(`NOWISH`)) {
      category = `Unwishable`;
    }

    const data: MonsterData = {
      id: parseInt(match[2]),
      name: match[1],
      manualName: manual == null ? null : manual[1] ?? manual[2],
      category: category,
    };

    monsters.push(data);
  }

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
    const isAmbiguous = monsters.some((m) => {
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

    if (!isAmbiguous) {
      continue;
    }

    monster.category = `Ambiguous`;
  }

  await saveMonsters(monsters);
}

let lastUpdate = 0;

export async function tryUpdateMonsters(): Promise<boolean> {
  if (lastUpdate + 12 * 60 * 60 * 1000 > Date.now()) {
    return false;
  }

  addLog(`Found unrecognized monster, trying to update our list of monsters..`);
  lastUpdate = Date.now();

  await updateMonsterData();

  return true;
}

export async function loadMonsters() {
  const dbMonsters = await loadMonstersFromDatabase();

  if (dbMonsters.length == 0) {
    await updateMonsterData();

    return;
  }

  monsters.splice(0);
  monsters.push(...dbMonsters);

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

    // Prevent dupes
    if (monsterList.some((list) => list.actual_name == monsterData.name)) {
      continue;
    }

    const monster: FaxbotDatabaseMonster = {
      name: monsterData.name,
      actual_name: monsterData.name,
      command: `[${monsterData.id}]${monsterData.name}`,
      category: monsterData.category,
    };

    monsterList.push(monster);
  }

  if (config.TESTING) {
    for (let i = 0; i < 5; i++) {
      monsterList.push({
        name: `Test Monster ${i}`,
        actual_name: `Test Monster ${i}`,
        command: `[100${i}]Test Monster ${i}`,
        category: "Test",
      });
    }
  }

  return monsterList;
}

export function getMonsters() {
  return monsters;
}

const constSpace = `\t`;

export async function formatMonsterList(
  format: "xml" | "json" | "html",
  botName: string,
  botId: string
): Promise<string> {
  const monsterList = createMonsterList().sort((s1, s2) =>
    s1.name.localeCompare(s2.name)
  );

  if (format === "html") {
    let md = readFileSync("./data/main.md", "utf-8");
    md = md.replaceAll("{Bot Info}", `${botName} (#${botId})`);
    md = md.replaceAll(
      "{Monster List}",
      monsterList
        .map((m) => {
          const match = m.command.match(/^(?:\[(\d+)\])?(.*)$/);

          if (match == null) {
            return "";
          }

          return `|${match[1] ?? "N/A"}|${match[2]}|${m.command}|`;
        })
        .join("\n")
    );
    const clanStats = getClanStatistics();
    const faxStats = await getFaxStatistics();
    md = md.replaceAll("{Source Clans}", formatNumber(clanStats.sourceClans));
    md = md.replaceAll("{Other Clans}", formatNumber(clanStats.otherClans));
    md = md.replaceAll("{Faxes Served}", formatNumber(faxStats.faxesServed));
    md = md.replaceAll(
      "{Top Requests}",
      faxStats.topFaxes
        .map((m) => {
          return `|${m.name}|${formatNumber(m.count)}|`;
        })
        .join("\n")
    );
    const inlineHtml = await marked.parse(md, { breaks: true, async: false });
    let html = readFileSync("./data/main.html", "utf-8");
    html = html.replaceAll("{Bot Info}", `${botName} (#${botId})`);
    html = html.replaceAll("{Inline Html}", inlineHtml);

    return html;
  }

  const data = {
    botdata: {
      name: botName,
      playerid: botId,
    },
    monsterlist: { monsterdata: monsterList },
  } satisfies FaxbotDatabase;

  if (format === "xml") {
    const strings: string[] = [`<?xml version="1.0" encoding="UTF-8"?>`];
    strings.push(...createXMLField(`faxbot`, data, ``));

    return strings.join(`\n`);
  }

  return JSON.stringify(data);
}

type NestedValue =
  | string
  | number
  | FaxbotDatabaseMonster
  | { [x: string]: NestedValue }
  | NestedValue[];

function createXMLField(
  name: string,
  value: NestedValue,
  spacing: string
): string[] {
  const strings: string[] = [];

  if (Array.isArray(value)) {
    for (const arrayEntry of value) {
      strings.push(`${spacing}<${name}>`);

      for (const key of Object.keys(arrayEntry)) {
        const values = createXMLField(
          key,
          arrayEntry[key],
          spacing + constSpace
        );

        strings.push(...values);
      }

      strings.push(`${spacing}</${name}>`);
    }
  } else if (typeof value == `object`) {
    strings.push(`${spacing}<${name}>`);

    for (const key of Object.keys(value)) {
      const values = createXMLField(key, value[key], spacing + constSpace);

      strings.push(...values);
    }

    strings.push(`${spacing}</${name}>`);
  } else {
    strings.push(`${spacing}<${name}>${encodeXML(value.toString())}</${name}>`);
  }

  return strings;
}
