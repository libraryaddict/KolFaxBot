import { encodeXML } from "entities";
import { FaxbotDatabase } from "../../utils/Typings";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { createMonsterList } from "./MonsterManager";
import { setMonsterListUpdated } from "./ClanManager";

const constSpace = "\t";

function createXml(botName: string, botId: string) {
  const toSerialize: FaxbotDatabase = {
    botdata: {
      name: botName,
      playerid: botId
    },
    monsterlist: { monsterdata: createMonsterList() }
  };

  toSerialize.monsterlist.monsterdata.sort((s1, s2) =>
    s1.name.localeCompare(s2.name)
  );

  const strings: string[] = [`<?xml version="1.0" encoding="UTF-8"?>`];
  strings.push(...createField("faxbot", toSerialize, ""));

  return strings.join("\n");
}

function createTxt() {
  const monsters = createMonsterList();

  monsters.sort((s1, s2) => s1.name.localeCompare(s2.name));

  return monsters.map((m) => m.command).join("\n");
}

function createField(name: string, value: any, spacing: string): string[] {
  const strings: string[] = [];

  if (Array.isArray(value)) {
    for (const arrayEntry of value) {
      strings.push(`${spacing}<${name}>`);

      for (const key of Object.keys(arrayEntry)) {
        const values = createField(key, arrayEntry[key], spacing + constSpace);

        strings.push(...values);
      }

      strings.push(`${spacing}</${name}>`);
    }
  } else if (typeof value == "object") {
    strings.push(`${spacing}<${name}>`);

    for (const key of Object.keys(value)) {
      const values = createField(key, value[key], spacing + constSpace);

      strings.push(...values);
    }

    strings.push(`${spacing}</${name}>`);
  } else {
    strings.push(`${spacing}<${name}>${encodeXML(value.toString())}</${name}>`);
  }

  return strings;
}

export function updateGithub(botName: string, botId: string) {
  const xmlDest = `./github/${botName}.xml`;
  const xml = createXml(botName, botId);
  const txtDest = `./github/${botName}.txt`;
  const txt = createTxt();
  let modified = false;

  if (!existsSync(xmlDest) || readFileSync(xmlDest, "utf-8") != xml) {
    writeFileSync(xmlDest, xml);
    modified = true;
  }

  if (!existsSync(txtDest) || readFileSync(txtDest, "utf-8") != txt) {
    writeFileSync(txtDest, txt);
    modified = true;
  }

  setMonsterListUpdated();
}
