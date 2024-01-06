import { config } from "../../config.js";
import type {
  DepositedFax,
  FaxClanData,
  KoLClan,
  KoLUser,
  MonsterData,
} from "../../types.js";
import type { KoLClient } from "../../utils/KoLClient.js";
import type { FaxMessages } from "../../utils/messages.js";
import { getClanByMonster } from "../managers/clans.js";

export enum FaxOutcome {
  FAILED,
  TRY_AGAIN,
  SUCCESS,
}

export interface FaxRequest {
  hasFax: boolean;
  targetClan: KoLClan;

  notifyUpdate(message: FaxMessages): Promise<void>;

  getFaxSource(): FaxClanData;

  getExpectedMonster(): string;

  getRequester(): string;
}

export class RolloverFaxRequest implements FaxRequest {
  hasFax: boolean;
  clan: FaxClanData;
  targetClan: KoLClan;
  monsterName: string;

  constructor(clan: FaxClanData) {
    this.clan = clan;
    this.monsterName = clan.faxMonster;
    this.targetClan = { id: clan.clanId, name: clan.clanName };
  }

  async notifyUpdate(message: FaxMessages) {}

  getFaxSource(): FaxClanData {
    return this.clan;
  }

  getExpectedMonster(): string {
    return this.monsterName;
  }

  getRequester(): string {
    return `<Fax Rollover>`;
  }
}

export class PlayerFaxRequest implements FaxRequest {
  client: KoLClient;
  player: KoLUser;
  monster: MonsterData;
  targetClan: KoLClan;
  faxAttempt: DepositedFax;
  hasFax: boolean;
  faxSource: FaxClanData;

  constructor(
    client: KoLClient,
    player: KoLUser,
    monster: MonsterData,
    clan: KoLClan,
    fax: DepositedFax
  ) {
    this.client = client;
    this.player = player;
    this.monster = monster;
    this.targetClan = clan;
    this.faxAttempt = fax;
    this.faxAttempt.clanId = clan.id;
    this.faxAttempt.clanName = clan.name;
  }

  async notifyUpdate(message: FaxMessages) {
    let msg = message.replaceAll(`{monster}`, this.monster.name);
    msg = msg.replaceAll(`{operator}`, config.FAXBOT_OPERATOR);
    msg = msg.replaceAll(`{clan}`, this.faxAttempt?.clanName ?? `Unknown Clan`);

    await this.client.sendPrivateMessage(this.player, msg);

    this.faxAttempt.outcome = message;
  }

  setFaxSource(clan: FaxClanData) {
    this.faxSource = clan;

    if (clan != null) {
      this.faxAttempt.faxClan = clan.clanId;
    }
  }

  getFaxSource(): FaxClanData {
    if (this.faxSource != null) {
      return this.faxSource;
    }

    const clan = getClanByMonster(this.monster);

    if (clan != null) {
      this.faxAttempt.faxClan = clan.clanId;
    }

    return clan;
  }

  getExpectedMonster(): string {
    return this.monster.name;
  }

  getRequester(): string {
    return this.player.name;
  }
}
