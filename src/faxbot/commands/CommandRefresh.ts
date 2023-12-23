import type { ParentController } from "../../ParentController.js";
import type { KoLClan, KoLUser } from "../../types.js";
import { tryUpdateMonsters } from "../monsters.js";
import type { FaxCommand } from "./FaxCommand.js";

export class CommandRefresh implements FaxCommand {
  controller: ParentController;

  constructor(controller: ParentController) {
    this.controller = controller;
  }

  isRestricted(): boolean {
    return false;
  }

  name(): string {
    return `refresh`;
  }

  description(): string {
    return `'all' refreshes all clans with a whitelist, otherwise refreshes the clan the sender is currently in`;
  }

  async execute(
    sender: KoLUser,
    paramters: string,
    isAdmin: boolean
  ): Promise<void> {
    // If not an admin, or no parameters.
    if (isAdmin != true || paramters.length == 0) {
      await this.refreshClan(sender);
    } else if (paramters.toLowerCase() == "monsters") {
      const result = await tryUpdateMonsters();

      if (!result) {
        await this.controller.client.sendPrivateMessage(
          sender,
          `Unable to update monsters, too soon since last monster update`
        );
      } else {
        await this.controller.client.sendPrivateMessage(
          sender,
          `Monster list has been updated!`
        );
      }
    } else if (paramters.toLowerCase() == "all") {
      await this.refreshClans(sender);
    } else {
      await this.controller.client.sendPrivateMessage(
        sender,
        `Invalid parameter. Try monsters/all or no parameter to refresh clan`
      );
    }
  }

  async refreshClan(sender: KoLUser) {
    const clan = await this.controller.client.getClanInfo(parseInt(sender.id));

    if (clan == null) {
      await this.controller.client.sendPrivateMessage(
        sender,
        `Unable to load your clan`
      );

      return;
    }

    await this.controller.client.sendPrivateMessage(
      sender,
      `Now refreshing the clan '${clan.name}'`
    );

    await this.controller.admin.refreshClans([clan]);

    await this.controller.client.sendPrivateMessage(
      sender,
      `Your clan info has been refreshed`
    );
  }

  async refreshClans(sender: KoLUser) {
    const toCheck: KoLClan[] = await this.controller.client.getWhitelists();

    await this.controller.client.sendPrivateMessage(
      sender,
      `Now refreshing all whitelisted clans..`
    );

    await this.controller.admin.refreshClans(toCheck);

    await this.controller.client.sendPrivateMessage(
      sender,
      `${toCheck.length} clans have been refreshed.`
    );
  }
}
