import { createWriteStream } from "fs";

const log_file = createWriteStream(`fax.log`, { flags: `a` });

export function addLog(line: string, writeToFile: boolean = true) {
  if (line == null) {
    return;
  }

  const newLine = new Date(Date.now()).toLocaleString() + `\t` + line;

  console.log(newLine);

  if (writeToFile) {
    log_file.write(newLine + `\n`);
  }
}
