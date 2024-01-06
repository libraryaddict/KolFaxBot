import type { WriteStream } from "fs";
import { createWriteStream } from "fs";

let log_file: WriteStream = null;

export function addLog(line: string, writeToFile: boolean = false) {
  if (line == null) {
    return;
  }

  console.log(line);

  if (!writeToFile) {
    return;
  }

  if (log_file == null) {
    log_file = createWriteStream(`fax.log`, { flags: `a` });
  }

  const newLine = new Date(Date.now()).toLocaleString() + `\t` + line;

  log_file.write(newLine + `\n`);
}
