import { createWriteStream } from "fs";

const log_file = createWriteStream(`fax.log`, { flags: `a` });

export function addLog(line: string, writeToFile: boolean = false) {
  if (line == null) {
    return;
  }

  console.log(line);

  if (!writeToFile) {
    return;
  }

  const newLine = new Date(Date.now()).toLocaleString() + `\t` + line;

  log_file.write(newLine + `\n`);
}
