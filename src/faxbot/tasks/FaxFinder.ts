import type { FaxClanData, MonsterData } from "../../types.js";
import { FaxMessages } from "../../utils/messages.js";
import { getClanByMonster, getFaxClans } from "../managers/clans.js";
import {
  getMonsterById,
  getMonsters,
  PHOTOCOPIED_BUTT_ID
} from "../monsters.js";

export class FaxFinder {
  private faxRequestMessage: string;
  private clan: FaxClanData;
  private monster: MonsterData;
  private errorMessage: FaxMessages | string = FaxMessages.ERROR_INTERNAL_ERROR;

  constructor(faxRequestMessage: string) {
    this.faxRequestMessage = faxRequestMessage;
  }

  getClan(): FaxClanData {
    return this.clan;
  }

  getMonster(): MonsterData {
    return this.monster;
  }

  getError(): FaxMessages | string {
    return this.errorMessage;
  }

  tryFindMonster(): boolean {
    const partialSuccess = this.findNormalMonster();

    // If no success at all, attempt to resolve via butt monster
    if (!partialSuccess) {
      // If this fails, we'll use the error message from the first normal monster search
      this.findButtMonster();
    }

    return this.monster != null;
  }

  private findButtMonster() {
    const clanMatch: FaxClanData[] = getFaxClans(
      `Fax Source`,
      `Random Clan`
    ).filter(
      (c) =>
        c.faxMonsterId == PHOTOCOPIED_BUTT_ID &&
        (c.clanTitle ?? "")
          .toLowerCase()
          .replaceAll(` `, ``)
          .includes(this.faxRequestMessage.replace(` `, ``).toLowerCase())
    );

    const validName = (title: string) => {
      const match = (title ?? "").toLowerCase().match(/source: (.*?'s butt)$/);

      if (match == null) {
        return false;
      }

      return match[1]
        .replaceAll(` `, ``)
        .includes(this.faxRequestMessage.replaceAll(` `, ``).toLowerCase());
    };

    // Sort clans to have the correct title syntax, then for the oldest clans to go first
    clanMatch.sort((c1, c2) => {
      const valid1 = validName(c1.clanTitle);
      const valid2 = validName(c2.clanTitle);

      if (valid1 == valid2) {
        return c1.faxMonsterLastChanged - c2.faxMonsterLastChanged;
      }

      return valid1 ? -1 : 1;
    });

    if (clanMatch.length == 0) {
      return;
    }

    this.clan = clanMatch[0];
    this.monster = getMonsterById(PHOTOCOPIED_BUTT_ID);
  }

  /**
   * Attempts to find a monster, returns true if no further searches are required
   */
  private findNormalMonster(): boolean {
    let monsters = getMonsters(this.faxRequestMessage);

    if (monsters.length == 0) {
      this.errorMessage = FaxMessages.ERROR_MONSTER_UNKNOWN;

      return false;
    }

    // We know what the monster is, but there are multiple matches
    // We handle that seperately to provide a better error message
    if (monsters.length > 1) {
      // Filter monsters to monsters we have in network
      monsters = monsters.filter((m) => getClanByMonster(m) != null);

      // No monsters in network
      if (monsters.length == 0) {
        this.errorMessage =
          FaxMessages.ERROR_MULTIPLE_MONSTER_MATCHES_NOT_IN_NETWORK;

        return false;
        // Multiple monsters in network
      } else if (monsters.length > 1) {
        this.errorMessage = FaxMessages.ERROR_MULTIPLE_MONSTER_MATCHES;

        return true;
      }
    }

    // Arrow is now a size 1
    const monster = monsters[0];
    // Ensure that the monster is in network
    const clan = getClanByMonster(monster);

    // Monster was not in network
    if (clan == null) {
      this.errorMessage =
        FaxMessages.ERROR_MONSTER_NOT_IN_FAX_NETWORK.replaceAll(
          `{monster}`,
          monster.name
        );

      return false;
    }

    // Resolution success
    this.monster = monster;

    return true;
  }
}
