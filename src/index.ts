import { formatMonsterList } from "./faxbot/monsters.js";
import { ParentController } from "./ParentController.js";
import { cacheReports } from "./utils/reportCacheMiddleware.js";
import { App } from "@tinyhttp/app";

const controller = new ParentController();
await controller.startController();

const username = controller.client.getUsername();
const userId = controller.client.getUserID();

const app = new App();

app
  // Since every endpoint is a report, for the moment this middleware is just set up
  // to cache every endpoint.
  .use(cacheReports())
  .get(
    "/",
    (_, res) =>
      void res
        .header("Content-Type", "text/plain")
        .send(formatMonsterList("md", username, userId))
  )
  .get(
    "/onlyfax.xml",
    (_, res) =>
      void res
        .header("Content-Type", "application/xml")
        .send(formatMonsterList("xml", username, userId))
  )
  .get(
    "/onlyfax.json",
    (_, res) =>
      void res
        .header("Content-Type", "application/json")
        .send(formatMonsterList("json", username, userId))
  )
  .listen(3000);

await controller.startBotHeartbeat();
