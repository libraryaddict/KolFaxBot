import type { ParentController } from "../../ParentController.js";
import type { KoLClan, KoLUser } from "../../types.js";
import type { FaxCommand } from "./FaxCommand.js";

export class CommandRefresh implements FaxCommand {
  controller: ParentController;

  constructor(controller: ParentController) {
    this.controller = controller;
  }

  isRestricted(): boolean {
    return true;
  }

  name(): string {
    return `refresh`;
  }

  description(): string {
    return `'all' refreshes all clans with a whitelist, otherwise refreshes the clan the sender is currently in`;
  }

  async execute(sender: KoLUser, paramters: string): Promise<void> {
    let toCheck: KoLClan[] = [];

    if (paramters.length > 0) {
      if (paramters.toLowerCase() != `all`) {
        await this.controller.client.sendPrivateMessage(
          sender,
          `Unrecognized argument`
        );

        return;
      }

      toCheck = await this.controller.client.getWhitelists();
      await this.controller.client.sendPrivateMessage(
        sender,
        `Now refreshing all whitelisted clans..`
      );
    } else {
      const clan = await this.controller.client.getClanInfo(
        parseInt(sender.id)
      );

      if (clan == null) {
        await this.controller.client.sendPrivateMessage(
          sender,
          `Unable to load your clan`
        );

        return;
      }

      toCheck.push(clan);
      await this.controller.client.sendPrivateMessage(
        sender,
        `Now refreshing the clan '${clan.name}'`
      );
    }

    await this.controller.admin.refreshClans(toCheck);

    await this.controller.client.sendPrivateMessage(
      sender,
      `${toCheck.length} clans have been refreshed.`
    );
  }
}
