import { createWriteStream, readFileSync } from "fs";
import { FaxbotSettings } from "./utils/Typings";

export function getAccountLogins(): FaxbotSettings {
  return JSON.parse(readFileSync("./data/Settings.json", "utf-8") || "{}");
}

const log_file = createWriteStream("fax.log", { flags: "a" });

export function addLog(line: string, writeToFile: boolean = true) {
  if (line == null) {
    return;
  }

  const newLine = new Date(Date.now()).toLocaleString() + "\t" + line;

  console.log(newLine);

  if (writeToFile) {
    log_file.write(newLine + "\n");
  }
}
