import { BotState } from "../../utils/Typings";
import { writeFileSync, readFileSync } from "fs";
import { getKolDay } from "../../utils/Utils";

const botStateFile = "./data/State.json";
let botState: BotState = {
  lastFaxed: 0,
  lastUpdatedMonsters: 0,
  faxRolloverDay: -1
};

export function setUpdatedMonsters() {
  botState.lastUpdatedMonsters = Math.round(Date.now() / 1000);
  saveState();
}

function saveState() {
  writeFileSync(botStateFile, JSON.stringify(botState, null, 2));
}

function loadState() {
  botState = JSON.parse(readFileSync(botStateFile).toString());
}

export function doingFaxRollover() {
  botState.faxRolloverDay = getKolDay();
  saveState();
}

export function getFaxRolloverDay() {
  return botState.faxRolloverDay;
}

export function isFaxRolloverConcerning() {
  return botState.faxRolloverDay >= getKolDay() - 1;
}

export function setFaxed() {
  botState.lastFaxed = Math.round(Date.now() / 1000);
  saveState();
}

loadState();
