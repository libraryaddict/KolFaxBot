import { Mutex } from "async-mutex";
import { addLog, getAccountLogins } from "./Settings";
import { KoLClient } from "./utils/KoLClient";
import { FaxbotSettings } from "./utils/Typings";
import { FaxOperations } from "./faxbot/FaxOperations";
import { FortuneTeller } from "./faxbot/tasks/FortuneTeller";
import { FaxHeartbeat } from "./faxbot/FaxHeartbeat";
import {
  getKolDay,
  getSecondsElapsedInDay,
  getSecondsToNearestRollover,
  getSecondsToRollover
} from "./utils/Utils";
import { updateGithub } from "./faxbot/managers/GithubManager";
import { isUnknownMonsterInClanData } from "./faxbot/managers/ClanManager";
import { tryUpdateMonsters } from "./faxbot/managers/MonsterManager";
import { FaxAdministration } from "./faxbot/tasks/FaxAdministration";
import { setupLogging } from "./utils/DiscordUtils";

export class ParentController {
  settings: FaxbotSettings;
  fortune: FortuneTeller;
  faxer: FaxOperations;
  faxHeartbeat: FaxHeartbeat;
  client: KoLClient;
  admin: FaxAdministration;
  lastSeenDay: number = 0;

  async startController() {
    this.settings = getAccountLogins();
    setupLogging(this.settings);

    this.client = new KoLClient(this.settings.username, this.settings.password);

    await this.client.start();

    this.admin = new FaxAdministration(this);
    this.faxHeartbeat = new FaxHeartbeat(this);
    this.faxer = new FaxOperations(this);
    this.fortune = new FortuneTeller(this.client, this.settings.defaultClan);

    await this.onNewDay();
    this.startBotHeartbeat();
  }

  async startBotHeartbeat() {
    let increments = 0;
    await this.onHeartbeat(increments++);

    // This is what controls the schedulers, so no other intervals or timeouts
    const ensureExclusive = new Mutex();

    setInterval(() => {
      if (ensureExclusive.isLocked()) {
        return;
      }

      increments = ++increments % 100;

      ensureExclusive.runExclusive(() => this.onHeartbeat(increments));
    }, 3000);
  }

  async onHeartbeat(increments: number) {
    // If RO in 10 seconds or if rollover less than 5min ago
    if (getSecondsToRollover() < 10 || getSecondsElapsedInDay() < 60 * 5) {
      this.client.setLoggedOut();

      return;
    }

    // If currently logged out
    if (this.client.isLoggedOut()) {
      // Don't try login every 3 seconds, but 30 seconds
      if (increments % 10 != 0) {
        return;
      }

      // Try to login
      await this.client.logIn();

      // If login failed, return
      if (this.client.isLoggedOut()) {
        return;
      }
    }

    // If new day, run new day code
    if (this.lastSeenDay != getKolDay()) {
      await this.onNewDay();

      return;
    }

    // Finally, let the rest of the bot operate
    this.faxHeartbeat.doFaxbotHeartbeat();
  }

  async onNewDay() {
    // Keep some accounts active by logging in, if near rollover; then wait 30 minutes
    setTimeout(
      () => this.keepAccountsActive(),
      this.client.isRolloverRisk(15) ? 30 * 60 * 1000 : 1
    );

    // If we're currently in a fight
    if (this.client.isStuckInFight()) {
      // If less than 5 minutes to the nearest rollover
      if (getSecondsToNearestRollover() < 5 * 60) {
        addLog(`Too soon to RO to try escape the fight we're currently in..`);

        return;
      }

      addLog(
        `We seem to be stuck in a fight and it's the start of a new day.. Let us leave!`
      );

      // Attempt to get out of the fight
      await this.client.tryToEscapeFight(`Stuck in fight after rollover`);

      // If failed to escape fight
      if (this.client.isStuckInFight()) {
        addLog(`Am stuck in fight, not doing rest of new day..`);

        return;
      }
    }

    // If we don't know what our current clan is, fetch it
    if (this.client.getCurrentClan() == null) {
      await this.client.myClan();
    }

    // We are not in a clan, or are not in the normal clan. Join the default clan
    if (
      this.client.getCurrentClan() == null ||
      this.client.getCurrentClan().id != this.settings.defaultClan
    ) {
      await this.faxer.joinDefaultClan();
    }

    // Check out our whitelists
    await this.admin.processWhitelists();
    // Check fortune teller
    await this.fortune.checkFortuneTeller();

    // If unknown clan, update clan data as mafia might've updated by now
    if (isUnknownMonsterInClanData()) {
      await tryUpdateMonsters();
    }

    // Update the day we've last seen
    this.lastSeenDay = getKolDay();
    // Update github and our list of monsters
    // TODO Update github when we update our monsters during course of a day
    updateGithub(this.client.getUsername(), this.client.getUserID());
    addLog(`Finished running new day..`);
  }

  async keepAccountsActive() {
    if (this.client.isRolloverRisk(13)) {
      return;
    }

    const accounts = this.settings.maintainLeadership;

    for (const accountName of Object.keys(accounts)) {
      if (accountName.match(/[^a-zA-Z\d _]/)) {
        addLog(`Not going to try logging into '${accountName}'`);
        continue;
      }

      const accountPass = accounts[accountName];

      if (typeof accountPass != "string") {
        continue;
      }

      const client = new KoLClient(accountName, accountPass);
      await client.logIn();
    }
  }

  checkSettings(): boolean {
    let issues = false;

    if ((this.settings.botOperator ?? "").length < 3) {
      issues = true;
      addLog(
        `Error! Bot Operator in settings hasn't been configured properly!`
      );
    }

    if (!(this.settings.defaultClan ?? "").match(/^\d{3,}$/)) {
      issues = true;
      addLog(
        `Error! Default Clan in settings hasn't been configured properly!`
      );
    }

    if (!(this.settings.faxDumpClan ?? "").match(/^\d{3,}$/)) {
      issues = true;
      addLog(
        `Error! Default Clan in settings hasn't been configured properly!`
      );
    }

    if (![true, false].includes(this.settings.runFaxRollover)) {
      issues = true;
      addLog(
        `Error! Run Fax Rollover in settings hasn't been configured properly!`
      );
    }

    if (![true, false].includes(this.settings.runFaxRolloverBurnTurns)) {
      issues = true;
      addLog(
        `Error! Run Fax Rollover in settings hasn't been configured properly!`
      );
    }

    if (
      this.settings.discordWebhook != null &&
      !this.settings.discordWebhook.startsWith(
        "https://discord.com/api/webhooks/"
      ) &&
      !this.settings.discordWebhook.startsWith("#")
    ) {
      issues = true;
      addLog(
        `Error! Discord Webhook in settings hasn't been configured properly! Either set it to 'null', prefix with a # or properly configure it!`
      );
    }

    if (!(this.settings.username ?? "").match(/^[a-zA-Z][\da-zA-Z _]{2,}$/)) {
      issues = true;
      addLog(`Error! Username hasn't been configured properly!`);
    }

    if (
      (this.settings.password ?? "").length < 6 ||
      this.settings.username == this.settings.password
    ) {
      issues = true;
      addLog(
        `Error! Password hasn't been configured properly or is incredibly insecure!`
      );
    }

    if (
      this.settings.allowedRefreshers == null ||
      Array.isArray(this.settings.allowedRefreshers)
    ) {
      issues = true;
      addLog(`Error! allowedRefreshers hasn't been configured!`);
    }

    return issues;
  }
}
