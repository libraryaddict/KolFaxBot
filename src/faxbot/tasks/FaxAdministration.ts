import { config } from "../../config";
import type { ParentController } from "../../ParentController";
import { addLog } from "../../Settings";
import type { DepositedFax } from "../../utils/Typings";
import type { FaxRequest } from "../faxrequests/FaxRequest";
import { PlayerFaxRequest } from "../faxrequests/FaxRequest";
import {
  getClanById,
  getOutdatedClans,
  getUnknownClans,
  removeInaccessibleClans,
  updateClan
} from "../managers/ClanManager";

export class FaxAdministration {
  controller: ParentController;
  faxes: DepositedFax[] = []; // Automatically cleared 30m after insert
  lastAdministration: number = 0;

  constructor(controller: ParentController) {
    this.controller = controller;
  }

  getFaxRunner() {
    return this.controller.faxer;
  }

  getClient() {
    return this.controller.client;
  }

  async refreshAll() {
    const whitelists = await this.getClient().getWhitelists();

    try {
      for (const clan of whitelists) {
        await this.getFaxRunner().checkClanInfo(clan);
      }
    } finally {
      await this.getFaxRunner().joinDefaultClan();
    }
  }

  async processWhitelists() {
    const whitelists = await this.getClient().getWhitelists();

    removeInaccessibleClans(whitelists);
    const unknown = getUnknownClans(whitelists);

    if (unknown.length == 0) {
      return;
    }

    for (const preprocess of [config.DEFAULT_CLAN, config.FAX_DUMP_CLAN]) {
      const clan = getClanById(preprocess);

      if (clan != null) {
        continue;
      }

      const data = unknown.find((d) => d.id == preprocess);

      if (data == null) {
        throw `Expected a whitelist to the clan for ${preprocess} as defined in our settings`;
      }

      await this.getFaxRunner().checkClanInfo(clan);
    }

    try {
      for (const clan of unknown) {
        await this.getFaxRunner().checkClanInfo(clan);
      }
    } finally {
      await this.getFaxRunner().joinDefaultClan();
    }
  }

  async runAdministration() {
    // If we've processed a request in the last 10min
    if (
      this.faxes.length > 0 &&
      this.faxes[this.faxes.length - 1].requested + 10 * 60 > Date.now() / 1000
    ) {
      return;
    }

    // If we already ran this in the last 2 hours
    if (this.lastAdministration + 60 * 60 * 120 > Date.now() / 1000) {
      return;
    }

    const outdated = getOutdatedClans();

    if (outdated.length > 0) {
      const clan = outdated[0];

      try {
        await this.controller.faxer.checkClanInfo({
          id: clan.clanId,
          name: clan.clanName
        });
      } catch (e) {
        // As we errored, just set it to have been checked and we'll skip it
        clan.clanLastChecked = Math.round(Date.now() / 1000);
        updateClan(clan);

        addLog(`Errored while checking ${clan.clanName}: ${e}`);
      }
    }

    // We only process one at the time before leaving, so we don't hold up any faxes
    if (outdated.length > 1) {
      return;
    } else if (outdated.length > 0) {
      // Join the default clan
      await this.controller.faxer.joinDefaultClan();
    }

    // Check fortune teller
    await this.controller.fortune.checkFortuneTeller();
    this.lastAdministration = Date.now() / 1000;
  }

  pruneFaxes() {
    // Prune all entries more than 30min old
    while (
      this.faxes.length > 0 &&
      this.faxes[0].completed + 60 * 30 < Date.now() / 1000
    ) {
      this.faxes.shift();
    }
  }

  async ensureClanTimeout(newFax: FaxRequest): Promise<void> {
    if (!(newFax instanceof PlayerFaxRequest)) {
      return;
    }

    const faxData = newFax.faxAttempt;

    if (faxData == null) {
      return;
    }

    const clan = await newFax.getClan();

    if (clan == null) {
      return;
    }

    const now = Math.round(Date.now() / 1000);

    for (const fax of this.faxes) {
      if (fax.clanId != clan.id) {
        continue;
      }

      // Its the same monster, no wait
      if (fax.fax.id == faxData.fax.id) {
        return;
      }

      const expires = (fax.completed ?? fax.requested) + 10;
      const delay = now - expires;

      // If the last fax has already elapsed, don't worry about it
      if (delay <= 0) {
        return;
      }

      // Wait for {delay} seconds before finishing
      await new Promise((res) => setTimeout(res, delay * 1000));
      break;
    }
  }
}
