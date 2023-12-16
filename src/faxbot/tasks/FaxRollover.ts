import { config } from "../../config";
import type { ParentController } from "../../ParentController";
import { addLog } from "../../Settings";
import type { EquipSlot, FaxClanData } from "../../utils/Typings";
import { getKolDay } from "../../utils/Utils";
import { FaxOutcome, RolloverFaxRequest } from "../faxrequests/FaxRequest";
import {
  getRolloverFax,
  setFaxMonster,
  updateClan
} from "../managers/ClanManager";
import { getMonsterById } from "../managers/MonsterManager";

export class FaxRollover {
  controller: ParentController;
  lastFaxRollover?: number;

  constructor(controller: ParentController) {
    this.controller = controller;
  }

  getFaxRunner() {
    return this.controller.faxer;
  }

  getClient() {
    return this.controller.client;
  }

  async runFaxRollover() {
    if (!config.RUN_FAX_ROLLOVER) {
      return;
    }

    if (this.lastFaxRollover == getKolDay()) {
      return;
    }

    if (!this.getClient().isRolloverFaxTime()) {
      addLog(`Wanted to run a fax rollover, but we're not at rollover risk`);

      return;
    }

    if (this.getClient().isLoggedOut()) {
      addLog(`Wanted to run a fax rollover, but we're not logged in`);

      return;
    }

    this.lastFaxRollover = getKolDay();

    const status = await this.getClient().getStatus();

    if (status == null) {
      addLog(`Wanted to run a fax rollover, but status was invalid`);

      return;
    }

    const hasProtection =
      status != null &&
      (([`acc1`, `acc2`, `acc3`] as EquipSlot[]).some(
        (slot) => status.equipment.get(slot) == 5334
      ) ||
        status.effects.some((e) => e.duration > 0 && e.id == 1377));

    if (!hasProtection && !config.RUN_DANGEROUS_FAX_ROLLOVER) {
      addLog(
        `Wanted to run a fax rollover, but we do not have the effect 'Abyssal Sweat' active or Mesmereyes™ contact lenses`
      );

      return;
    }

    const cutoff = Math.floor(Date.now() / 1000);

    const getAttempter = () => {
      const rolloverFax = getRolloverFax();

      if (rolloverFax == null || rolloverFax.clanLastChecked > cutoff) {
        return null;
      }

      return rolloverFax;
    };

    let rolloverFax: FaxClanData;

    while (
      this.getClient().isRolloverFaxTime() &&
      (rolloverFax = getAttempter()) != null
    ) {
      const result = await this.attemptRolloverFax(rolloverFax);

      if (result || this.getClient().isStuckInFight()) {
        break;
      }
    }

    if (rolloverFax == null) {
      addLog(`Not doing a rollover fax, no targets? Nothing to do.`);

      return;
    }
  }

  async attemptRolloverFax(clan: FaxClanData): Promise<boolean> {
    clan.clanLastChecked = Math.round(Date.now() / 1000);

    updateClan(clan);

    const faxAttempt = new RolloverFaxRequest(clan);
    const status = await this.getFaxRunner().acquireFax(faxAttempt);

    // Return true, don't do anything more
    if (status == FaxOutcome.FAILED) {
      return true;
    }

    await this.getFaxRunner().joinDefaultClan();

    if (!faxAttempt.hasFax || status == FaxOutcome.TRY_AGAIN) {
      return false;
    }

    addLog(
      `Wanting to attempt a fax fight, logging instead of doing incase something bugged`
    );
    // TODO Uncomment for production
    const fightingMonster: number = null; // await this.getClient().startFaxFight();

    if (fightingMonster == null) {
      addLog(
        `Failed to start a fax fight against ${faxAttempt.getExpectedMonster()}`
      );

      return false;
    }

    const monster = getMonsterById(fightingMonster);

    setFaxMonster(clan, monster.name, fightingMonster);

    return true;
  }
}
