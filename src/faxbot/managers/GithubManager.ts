import type {
  FaxbotDatabase,
  FaxbotDatabaseMonster,
} from "../../utils/Typings.js";
import { createMonsterList } from "./MonsterManager.js";
import { encodeXML } from "entities";
import { dedent } from "ts-dedent";

const constSpace = `\t`;

export function formatFaxBotDatabase(
  format: "xml" | "json" | "md",
  botName: string,
  botId: string
): string {
  const monsterList = createMonsterList().sort((s1, s2) =>
    s1.name.localeCompare(s2.name)
  );

  if (format === "md") {
    return dedent`
      ${botName} (#${botId})
      ===

      ${monsterList.map((m) => m.command).join("\n")}
    `;
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
    strings.push(...createField(`faxbot`, data, ``));

    return strings.join(`\n`);
  }

  return JSON.stringify(data);
}

type NestedValue =
  | string
  | FaxbotDatabaseMonster
  | { [x: string]: NestedValue }
  | NestedValue[];

function createField(
  name: string,
  value: NestedValue,
  spacing: string
): string[] {
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
  } else if (typeof value == `object`) {
    strings.push(`${spacing}<${name}>`);

    for (const key of Object.keys(value)) {
      const values = createField(key, value[key], spacing + constSpace);

      strings.push(...values);
    }

    strings.push(`${spacing}</${name}>`);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    strings.push(`${spacing}<${name}>${encodeXML(value.toString())}</${name}>`);
  }

  return strings;
}
