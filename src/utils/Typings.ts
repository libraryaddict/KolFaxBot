import { FaxMessages } from "./FaxMessages";

export type KOLCredentials = {
  sessionCookies: string;
  pwdhash: string;
};

export interface KoLUser {
  name: string;
  id: string;
}

export interface ChatUser extends KoLUser {
  color?: string;
}

export type MessageType = "private" | "public" | "event" | "system";
export type MessageFormat = null | "0" | "1" | "2" | "3" | "4" | "98" | "99";
export type PublicMessageType =
  | "normal"
  | "emote"
  | "system"
  | "mod warning"
  | "mod announcement"
  | "event"
  | "welcome";

export type KOLMessage = {
  type: MessageType;
  time?: string;
  channel?: string;
  mid?: string;
  who?: ChatUser;
  for?: ChatUser;
  format?: MessageFormat;
  msg?: string;
  link?: string;
  notnew?: string; // Only seen "1"
};

export interface DepositedFax {
  requester: KoLUser;
  clanId?: string;
  clanName?: string;
  fax: MonsterData;
  requested: number;
  completed?: number;
  outcome: FaxMessages;
}

export type EquipSlot =
  | "hat"
  | "shirt"
  | "pants"
  | "weapon"
  | "offhand"
  | "acc1"
  | "acc2"
  | "acc3"
  | "fakehands"
  | "cardsleeve";

export type KoLStatus = {
  playerid: string;
  name: string;
  turnsPlayed: number;
  adventures: number;
  full: number;
  drunk: number;
  spleen: number;
  rollover: number;
  hp: number;
  mp: number;
  maxHP: number;
  maxMP: number;
  equipment: Map<EquipSlot, number>;
  familiar?: number;
  meat: number;
  level: number;
  effects: KoLEffect[];
  daynumber: number;
};

export type KoLEffect = {
  name: string;
  duration: number;
  id: number;
};

export type CombatMacro = {
  name: string;
  id: string;
};

export type FaxMachine =
  | "Illegal Clan"
  | "No Clan Info"
  | "No Fax Loaded"
  | "Grabbed Fax"
  | "Already have fax"
  | "Sent Fax"
  | "No Fax Machine"
  | "Have no fax to send"
  | "Unknown";
export type ClanJoinAttempt =
  | "Joined"
  | "Not Whitelisted"
  | "Am Clan Leader"
  | "Unknown";

export type ClanType = "Fax Source" | "Random Clan";

export interface FaxClanData {
  clanId: string;
  clanName: string;
  clanTitle: string; // Title we were given in the clan, null if title unknown
  faxMonster?: string; // The monster name of the fax machine, this is the raw kol provided name
  faxMonsterId?: number; // The monster ID of the fax machine, will only be undefined if several monsters have this name and we haven't identified which monster it is yet
  faxMonsterLastChanged?: number;
  clanFirstAdded: number; // UNIX seconds
  clanLastChecked: number; // UNIX seconds
}

export interface MonsterData {
  id: number;
  name: string; // Name as written in mafia data, this isn't to be relied on for direct comparison with kol monster names as kolmafia adds info to monster names when there's dupes and stuff
  manualName?: string; // Name as reported in manual, more reliable than `name`
  ambiguous?: boolean; // If there's possibly another monster that could conflict in name
  category?: string;
}

export interface BotState {
  lastFaxed: number; // KOL Day we last did a fax fight
  lastUpdatedMonsters: number; // KOL Day we last updated monsters source file
  faxRolloverDay: number; // Kol day we're doing a fax rollover on, reset to -1 when it's not a concern anymore
}

export type UserInfo = {
  name: string;
  id: number;
  clan?: UserClan;
};

export type KoLClan = {
  name: string;
  id: string;
};

export interface UserClan extends KoLClan {
  title?: string;
}
export type PhotoInfo = {
  name: string;
};

export type FaxbotSettings = {
  username: string;
  password: string;
  botOperator: string;
  defaultClan: string;
  faxDumpClan: string;
  runFaxRollover: boolean;
  runFaxRolloverBurnTurns: boolean;
  maintainLeadership: { [string: string]: string };
  discordWebhook: string;
  allowedRefreshers: string[];
};

export interface FaxbotDatabaseMonsterList {
  monsterdata: FaxbotDatabaseMonster[];
}
export interface FaxbotDatabaseMonster {
  name: string; // The name for cosmetic purposes
  actual_name: string; // A mafia recognized monster
  command: string; // What to tell the faxbot to show this monster
  category: string; // What category this monster belongs in
}

export interface FaxbotDatabaseBot {
  name: string;
  playerid: string;
}

export interface FaxbotDatabase {
  botdata: FaxbotDatabaseBot;
  monsterlist: FaxbotDatabaseMonsterList;
}
