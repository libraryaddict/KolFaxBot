import type { ParentController } from "../../ParentController";
import type { KoLClan, KoLUser } from "../../utils/Typings";
import type { FaxCommand } from "./FaxCommand";

export class FaxCommandRefresh implements FaxCommand {
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
        this.controller.client.sendPrivateMessage(
          sender,
          `Unrecognized argument`
        );

        return;
      }

      toCheck = await this.controller.client.getWhitelists();
      this.controller.client.sendPrivateMessage(
        sender,
        `Now refreshing all whitelisted clans..`
      );
    } else {
      const clan = await this.controller.client.getClanInfo(
        parseInt(sender.id)
      );

      if (clan == null) {
        this.controller.client.sendPrivateMessage(
          sender,
          `Unable to load your clan`
        );

        return;
      }

      toCheck.push(clan);
      this.controller.client.sendPrivateMessage(
        sender,
        `Now refreshing the clan '${clan.name}'`
      );
    }

    await this.controller.admin.refreshClans(toCheck);

    this.controller.client.sendPrivateMessage(
      sender,
      `${toCheck.length} clans have been refreshed.`
    );
  }
}
