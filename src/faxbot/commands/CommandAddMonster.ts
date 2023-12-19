import type { ParentController } from "../../ParentController";
import type { KoLUser } from "../../utils/Typings";
import { getSpecificFaxSources, setFaxMonster } from "../managers/ClanManager";
import { getMonster, getMonsterById } from "../managers/MonsterManager";
import type { FaxCommand } from "./FaxCommand";

export class CommandAddMonster implements FaxCommand {
  controller: ParentController;

  constructor(controller: ParentController) {
    this.controller = controller;
  }

  isRestricted(): boolean {
    return false;
  }

  name(): string {
    return `addfax`;
  }

  description(): string {
    return `Joins your clan, grabs fax from machine, adds to an empty fax clan that was previously setup for that monster. Fax clan has title given 'Source: M1234' where 1234 is monster ID`;
  }

  async execute(sender: KoLUser, paramters: string): Promise<any> {
    if (paramters == `which`) {
      await this.which(sender);

      return;
    }

    if (paramters == `run`) {
      try {
        await this.run(sender);
      } finally {
        await this.controller.faxer.dumpFax(null, true);
        await this.controller.faxer.joinDefaultClan();
      }

      return;
    }

    if (paramters.length > 0) {
      const monsters = getMonster(paramters);

      if (monsters.length > 0) {
        const clans = getSpecificFaxSources().filter(([c, id]) =>
          monsters.some(
            (m) =>
              m.id == id &&
              (getMonsterById(id).manualName ?? getMonsterById(id).name) !=
                c.faxMonster
          )
        );

        if (clans.length == 0) {
          await this.controller.client.sendPrivateMessage(
            sender,
            `I do not need that monster thanks!`
          );
        } else {
          await this.controller.client.sendPrivateMessage(
            sender,
            `It appears that monster would fit nicely into my fax network, use 'run' to tell me to grab that monster from your fax machine.`
          );
        }
      } else {
        await this.controller.client.sendPrivateMessage(
          sender,
          `I do not recognize that argument. Did you mean 'which' or 'run'? You can also just send me the monster name/ID to check if I need that one.`
        );
      }

      return;
    }

    await this.controller.client.sendPrivateMessage(
      sender,
      `Unknown argument, send 'which' to find what I'm looking for or 'run' to ask me to look in your fax machine to try process it`
    );
  }

  async which(sender: KoLUser) {
    const clans = getSpecificFaxSources().filter(
      ([c, id]) =>
        c.faxMonster == null ||
        c.faxMonster !=
          (getMonsterById(id).manualName ?? getMonsterById(id).name)
    );

    if (clans.length == 0) {
      await this.controller.client.sendPrivateMessage(
        sender,
        `Thanks for your interest, but I don't need any monsters!`
      );

      return;
    }

    // We're sorting this by newest clans first
    clans.sort(([c1], [c2]) => c2.clanFirstAdded - c1.clanFirstAdded);

    const desired: string[] = [];

    for (const [, monsterId] of clans) {
      const monster = getMonsterById(monsterId);

      const name = `[${monster.id}]${monster.name}`;

      if (desired.includes(name)) {
        continue;
      }

      desired.push(name);
    }

    if (desired.length > 10) {
      await this.controller.client.sendPrivateMessage(
        sender,
        `Too many monsters in demand, reducing to the first 10`
      );
      desired.splice(10);
    }

    await this.controller.client.sendPrivateMessage(
      sender,
      `I'm looking for: ${desired.join(`, `)}`
    );
  }

  async run(sender: KoLUser) {
    const clan = await this.controller.client.getClanInfo(parseInt(sender.id));

    if (clan == null) {
      await this.controller.client.sendPrivateMessage(
        sender,
        `Unable to retrieve your clan info`
      );

      return;
    }

    const joinResult = await this.controller.client.joinClanForcibly(
      clan,
      `Grab Fax`
    );

    if (joinResult != `Joined`) {
      await this.controller.client.sendPrivateMessage(
        sender,
        `Error while trying to join your clan: ${joinResult}`
      );

      return;
    }

    let fax = await this.controller.client.useFaxMachine(`receivefax`);

    if (fax != `Grabbed Fax`) {
      await this.controller.client.sendPrivateMessage(
        sender,
        `Error while grabbing the fax: ${fax}`
      );

      return;
    }

    const photo = await this.controller.client.getPhotoInfo();

    if (photo == null) {
      await this.controller.client.sendPrivateMessage(
        sender,
        `Error while examining the fax, it was null`
      );

      return;
    }

    const monsters = getMonster(photo.name);

    if (monsters.length != 1) {
      await this.controller.client.sendPrivateMessage(
        sender,
        `Error while looking at monster name. Expected a single monster to match, ${monsters.length} matched the name instead`
      );

      return;
    }

    const monster = monsters[0];
    // Filter to only the clans that are empty or mismatch in monster
    const clans = getSpecificFaxSources().filter(
      ([c, id]) =>
        c.faxMonster != (monster.manualName ?? monster.name) && id == monster.id
    );

    if (clans.length == 0) {
      await this.controller.client.sendPrivateMessage(
        sender,
        `Error, I have no clans that are looking for the monster: [${monster.id}] ${monster.name}`
      );

      return;
    }

    for (let i = 0; i < clans.length; i++) {
      const faxClan = clans[i][0];

      const joinResult = await this.controller.client.joinClanForcibly(
        { id: faxClan.clanId, name: faxClan.clanName },
        `Add Monster to Fax`
      );

      if (joinResult != `Joined`) {
        await this.controller.client.sendPrivateMessage(
          sender,
          `Failed to join the clan ${faxClan.clanName}`
        );
        continue;
      }

      fax = await this.controller.client.useFaxMachine(`sendfax`, true);

      if (fax != `Sent Fax`) {
        await this.controller.client.sendPrivateMessage(
          sender,
          `Error while trying to deposit fax in ${faxClan.clanName}: ${fax}`
        );

        // If it isn't a harmless error, never continue
        if (fax != `No Fax Machine`) {
          const remaining = clans.length - (i + 1);

          if (remaining > 0) {
            await this.controller.client.sendPrivateMessage(
              sender,
              `Skipped remaining ${remaining} clans`
            );
          }

          return;
        }

        continue;
      }

      await setFaxMonster(faxClan, monster.name, monster.id);
      await this.controller.client.sendPrivateMessage(
        sender,
        `Updated a source clan to contain the monster ${monster.name}. Thank you!`
      );

      // If we're not done yet
      if (i + 1 < clans.length) {
        await this.controller.client.useFaxMachine(`receivefax`);
      }
    }

    await this.controller.client.sendPrivateMessage(
      sender,
      `Now returning to base, job complete!`
    );
  }
}
