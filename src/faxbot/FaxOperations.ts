import { config } from "../config";
import type { ParentController } from "../ParentController";
import { addLog } from "../Settings";
import { FaxMessages } from "../utils/FaxMessages";
import type {
  ClanJoinAttempt,
  DepositedFax,
  FaxClanData,
  KoLClan,
  KOLMessage,
  KoLUser
} from "../utils/Typings";
import type { FaxRequest } from "./faxrequests/FaxRequest";
import { FaxOutcome, PlayerFaxRequest } from "./faxrequests/FaxRequest";
import {
  getClanById,
  getClanByMonster,
  getClanDataById,
  setFaxMonster,
  updateClan
} from "./managers/ClanManager";
import { addFaxLog } from "./managers/DatabaseManager";
import { getMonster, tryUpdateMonsters } from "./managers/MonsterManager";
import type { FaxAdministration } from "./tasks/FaxAdministration";

export class FaxOperations {
  privateMessages: KOLMessage[] = [];
  controller: ParentController;
  administration: FaxAdministration;

  constructor(controller: ParentController) {
    this.controller = controller;
    this.administration = controller.admin;
  }

  getClient() {
    return this.controller.client;
  }

  async handleFaxRequestWrapper(player: KoLUser, message: string) {
    let faxAttempt: PlayerFaxRequest;

    try {
      faxAttempt = await this.handleFaxRequest(player, message);
    } catch (e) {
      addLog(`Error: `, e);
      this.getClient().sendPrivateMessage(
        player,
        FaxMessages.ERROR_INTERNAL_ERROR
      );
    } finally {
      if (faxAttempt != null) {
        faxAttempt.faxAttempt.completed = Math.round(Date.now() / 1000);
        await addFaxLog(faxAttempt.faxAttempt);

        this.administration.faxes.push(faxAttempt.faxAttempt);

        if (faxAttempt.hasFax) {
          await this.dumpFax(faxAttempt, true);
        }
      }
    }

    await this.joinDefaultClan();
  }

  async handleFaxRequest(
    player: KoLUser,
    message: string
  ): Promise<PlayerFaxRequest> {
    let monsters = getMonster(message);

    if (monsters.length == 0) {
      this.getClient().sendPrivateMessage(
        player,
        FaxMessages.ERROR_MONSTER_UNKNOWN
      );

      return null;
    }

    if (monsters.length > 1) {
      monsters = monsters.filter((m) => getClanByMonster(m) != null);

      if (monsters.length == 0) {
        this.getClient().sendPrivateMessage(
          player,
          FaxMessages.ERROR_MULTIPLE_MONSTER_MATCHES_NOT_IN_NETWORK
        );

        return null;
      } else if (monsters.length > 1) {
        this.getClient().sendPrivateMessage(
          player,
          FaxMessages.ERROR_MULTIPLE_MONSTER_MATCHES
        );

        return null;
      }
    }

    const clan = getClanByMonster(monsters[0]);

    if (clan == null) {
      this.getClient().sendPrivateMessage(
        player,
        FaxMessages.ERROR_MONSTER_NOT_IN_FAX_NETWORK.replaceAll(
          `{monster}`,
          monsters[0].name
        )
      );

      return null;
    }

    const clanInfo = this.getClient().getClanInfo(parseInt(player.id));
    const faxData: DepositedFax = {
      requester: player,
      fax: monsters[0],
      requested: Math.round(Date.now() / 1000),
      outcome: FaxMessages.ERROR_INTERNAL_ERROR,
      request: message
    };

    const faxAttempt = new PlayerFaxRequest(
      this.getClient(),
      player,
      monsters[0],
      clanInfo,
      faxData
    );

    addLog(
      `Grabbing fax for ${player.name}: ${faxAttempt.getExpectedMonster()}`
    );

    let status: FaxOutcome = FaxOutcome.TRY_AGAIN;

    // While the situation is manageable
    while (status == FaxOutcome.TRY_AGAIN) {
      // Attempt to acquire the fax
      status = await this.acquireFax(faxAttempt);

      // If the acquiration didn't go perfectly, go back to step 1. Which will cancel the loop if it went badly
      if (status != FaxOutcome.SUCCESS) {
        continue;
      }

      // Ensure we don't replace a fax immediately
      await this.administration.ensureClanTimeout(faxAttempt);

      // Attempt to send the fax
      status = await this.sendFax(faxAttempt);

      // If we still have the fax, and the fax dump fails. Break the loop
      if (faxAttempt.hasFax && !(await this.dumpFax(faxAttempt))) {
        break;
      }

      // If its a fail or success, the loop while will stop
      // Otherwise if its a try again, loop will begin again
    }

    return faxAttempt;
  }

  async joinDefaultClan() {
    if (this.getClient().getCurrentClan()?.id == config.DEFAULT_CLAN) {
      return;
    }

    await this.getClient().joinClanForcibly(
      getClanById(config.DEFAULT_CLAN),
      `be in default clan`
    );
  }

  async dumpFax(
    faxAttempt: FaxRequest,
    silent: boolean = false
  ): Promise<boolean> {
    addLog(`Now getting rid of the fax on hand`);
    const dumpClan = getClanById(config.FAX_DUMP_CLAN);
    const joinSource = await this.getClient().joinClanForcibly(
      dumpClan,
      `dump fax`
    );

    if (joinSource != `Joined`) {
      addLog(`Failed to join fax dump clan: ${joinSource}`);

      if (!silent && faxAttempt != null) {
        faxAttempt.notifyUpdate(FaxMessages.ERROR_FAILED_DUMP_FAX);
      }

      return false;
    }

    const result = await this.getClient().useFaxMachine(`sendfax`);
    const hasFax = result != `Sent Fax` && result != `Illegal Clan`;

    if (faxAttempt != null) {
      faxAttempt.hasFax = hasFax;
    }

    if (!hasFax) {
      return true;
    }

    if (!silent && faxAttempt != null) {
      faxAttempt.notifyUpdate(FaxMessages.ERROR_FAILED_DUMP_FAX);
    }

    addLog(`Failed to dump fax: ${result}`);

    return false;
  }

  async acquireFax(faxAttempt: FaxRequest): Promise<FaxOutcome> {
    const monsterClan: FaxClanData = faxAttempt.getFaxSource();

    if (monsterClan == null) {
      // We got to this point and we thought it was available, unfortunately it is not available
      faxAttempt.notifyUpdate(FaxMessages.ERROR_MONSTER_REMOVED_FAX_NETWORK);
      addLog(
        `Failed to grab fax, ${faxAttempt.getExpectedMonster()} is no longer in the fax network`
      );

      return FaxOutcome.FAILED;
    }

    if (faxAttempt.hasFax) {
      // If failed to dump fax, exit
      if (!(await this.dumpFax(faxAttempt))) {
        return FaxOutcome.FAILED;
      }
    }

    const joinSource = await this.getClient().joinClanForcibly(
      {
        id: monsterClan.clanId,
        name: monsterClan.clanName
      },
      `grab fax`
    );

    const joinedFaxClan = await this.joinedFaxClanCleanly(
      monsterClan,
      joinSource,
      faxAttempt
    );

    if (joinedFaxClan != FaxOutcome.SUCCESS) {
      return joinedFaxClan;
    }

    const receivedFax = await this.receivedFaxProperly(monsterClan, faxAttempt);

    if (receivedFax != FaxOutcome.SUCCESS) {
      return receivedFax;
    }

    // Get photo info early, so we don't have to wait on this
    const examinePhoto = this.getClient().getPhotoInfo();
    await faxAttempt.getClan();

    if ((await faxAttempt.getClan()) == null) {
      faxAttempt.notifyUpdate(FaxMessages.ERROR_CANNOT_FIND_YOUR_CLAN);
      addLog(
        `Unable to find ${faxAttempt.getRequester()}'s clan in their profile`
      );

      return FaxOutcome.FAILED;
    }

    const joinedDest = await this.joinedDestClanCleanly(faxAttempt);

    if (joinedDest != FaxOutcome.SUCCESS) {
      return joinedDest;
    }

    const photo = await examinePhoto;

    if (photo == null || photo.name != monsterClan.faxMonster) {
      if (!(await this.dumpFax(faxAttempt))) {
        return FaxOutcome.FAILED;
      }

      setFaxMonster(monsterClan, photo == null ? null : photo.name, null);

      addLog(
        `Fax was not as expected, expected ${
          monsterClan.faxMonster
        } but received ${photo == null ? null : photo.name}. Removing ${
          monsterClan.clanName
        } from network`
      );

      return FaxOutcome.TRY_AGAIN;
    }

    return FaxOutcome.SUCCESS;
  }

  async receivedFaxProperly(
    monsterClan: FaxClanData,
    faxAttempt: FaxRequest
  ): Promise<FaxOutcome> {
    const fax = await this.getClient().useFaxMachine(`receivefax`);
    faxAttempt.hasFax =
      faxAttempt.hasFax || fax == `Already have fax` || fax == `Grabbed Fax`;

    if (fax == `Already have fax`) {
      addLog(`Had a fax on hand unexpectably, now dumping`);

      if (await this.dumpFax(faxAttempt)) {
        return await this.acquireFax(faxAttempt);
      }
    } else if (fax == `No Fax Loaded` || fax == `No Fax Machine`) {
      setFaxMonster(monsterClan, null, null);

      addLog(
        `The fax source clan ${monsterClan.clanName} had an invalid state: ${fax}`
      );

      return FaxOutcome.TRY_AGAIN;
    } else if (fax == `Unknown`) {
      faxAttempt.notifyUpdate(FaxMessages.ERROR_UNKNOWN_FAX_MACHINE_STATE);
      addLog(`Unknown fax machine state, no further information`);

      return FaxOutcome.FAILED;
    }

    return FaxOutcome.SUCCESS;
  }

  async joinedDestClanCleanly(faxAttempt: FaxRequest): Promise<FaxOutcome> {
    const joinTarget = await this.getClient().joinClan(
      await faxAttempt.getClan(),
      `deliver fax`
    );

    if (joinTarget == `Not Whitelisted`) {
      faxAttempt.notifyUpdate(FaxMessages.ERROR_NOT_WHITELISTED_YOUR_CLAN);
      addLog(`Not whitelisted to clan '${(await faxAttempt.getClan()).name}'`);

      return FaxOutcome.FAILED;
    } else if (joinTarget == `Am Clan Leader`) {
      faxAttempt.notifyUpdate(FaxMessages.ERROR_TRAPPED_IN_CLAN);
      addLog(`Failed to join target clan, I am clan leader and trapped`);

      return FaxOutcome.FAILED;
    } else if (joinTarget != `Joined`) {
      faxAttempt.notifyUpdate(FaxMessages.ERROR_JOINING_YOUR_CLAN);
      addLog(
        `Unknown error while trying to join target clan, no further information`
      );

      return FaxOutcome.FAILED;
    }

    return FaxOutcome.SUCCESS;
  }

  async joinedFaxClanCleanly(
    monsterClan: FaxClanData,
    joinSource: ClanJoinAttempt,
    faxAttempt: FaxRequest
  ): Promise<FaxOutcome> {
    if (joinSource == `Not Whitelisted`) {
      setFaxMonster(monsterClan, null, null);
      addLog(
        `Removed ${monsterClan.clanName} from fax network, we're not whitelisted`
      );

      return FaxOutcome.TRY_AGAIN;
    } else if (joinSource == `Am Clan Leader`) {
      faxAttempt.notifyUpdate(FaxMessages.ERROR_TRAPPED_IN_CLAN);
      addLog(`I am trapped in the clan as clan leader`);

      return FaxOutcome.FAILED;
    } else if (joinSource != `Joined`) {
      faxAttempt.notifyUpdate(FaxMessages.ERROR_UNABLE_JOIN_SOURCE_CLAN);
      addLog(`Unable to join clan, no further information known`);

      return FaxOutcome.FAILED;
    }

    return FaxOutcome.SUCCESS;
  }

  async sendFax(faxAttempt: PlayerFaxRequest): Promise<FaxOutcome> {
    const faxResult = await this.getClient().useFaxMachine(`sendfax`);
    faxAttempt.hasFax =
      faxResult != `Sent Fax` && faxResult != `Have no fax to send`;

    if (faxResult == `Sent Fax`) {
      faxAttempt.notifyUpdate(FaxMessages.FAX_READY);
      addLog(
        `Completed fax request from ${faxAttempt.player.name} for monster ${faxAttempt.monster.name}`
      );

      return FaxOutcome.SUCCESS;
    }

    // If we got this far, its a failure
    if (faxResult == `No Fax Machine`) {
      faxAttempt.notifyUpdate(FaxMessages.ERROR_NO_FAX_MACHINE);
      addLog(`Failed to send fax, they do not have a fax machine`);
    } else if (faxResult == `Illegal Clan`) {
      faxAttempt.notifyUpdate(FaxMessages.ERROR_ILLEGAL_CLAN);
      addLog(`Attempted to send a fax to a source fax clan`);
    } else if (faxResult == `No Clan Info`) {
      faxAttempt.notifyUpdate(FaxMessages.ERROR_UNKNOWN_CLAN);
      addLog(`Failed to send fax, unknown clan information`);
    }

    return FaxOutcome.FAILED;
  }

  async checkClanInfo(clan: KoLClan) {
    addLog(`Now checking up on clan ${clan.name}`);

    const state = await this.getClient().joinClanForcibly(
      clan,
      `fetch clan info`
    );

    // Not sure what's up, lets get out of here
    if (state != `Joined`) {
      addLog(`Failed to join ${clan.name}: ${state}`);

      return;
    }

    const newClan = await this.getClient().myClan();

    if (newClan == null || newClan.id != clan.id) {
      // We didn't join them properly, lets get out of here
      return;
    }

    const fax = await this.getClient().useFaxMachine(`receivefax`);

    // We bugged out somewhere, lets just go
    if (fax == `Already have fax` || fax == `Unknown`) {
      addLog(
        `Unexpectably bugged out somewhere when checking clan fax: ${fax}`
      );
      await this.dumpFax(null);

      return;
    }

    const oldData = getClanDataById(newClan.id);

    const data: FaxClanData = {
      clanId: newClan.id,
      clanName: newClan.name,
      clanTitle: newClan.title ?? ``,
      clanLastChecked: Math.round(Date.now() / 1000),
      clanFirstAdded: Math.round(Date.now() / 1000)
    };

    if (fax == `Grabbed Fax`) {
      const photo = await this.getClient().getPhotoInfo();

      if (photo == null || photo.name == null) {
        // We bugged out somewhere, lets just log it and move on
        addLog(`Failed to find fax information in clan ${newClan.name}`);
        await this.dumpFax(null);

        return;
      }

      await this.dumpFax(null);

      if (getMonster(photo.name) == null) {
        await tryUpdateMonsters();
      }

      setFaxMonster(data, photo.name, null);
    } else if (oldData != null && oldData.faxMonster != null) {
      // Something went wrong, lets not get into it
      return;
    }

    // The rest of the error states should be non-issues. They probably don't have a fax machine.

    updateClan(data);
  }
}
