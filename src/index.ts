import { formatFaxBotDatabase } from "./faxbot/managers/GithubManager.js";
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
    (_, res) => void res.send(formatFaxBotDatabase("md", username, userId))
  )
  .get(
    "/onlyfax.xml",
    (_, res) =>
      void res
        .header("Content-Type", "text/xml")
        .send(formatFaxBotDatabase("xml", username, userId))
  )
  .get(
    "/onlyfax.json",
    (_, res) =>
      void res
        .header("Content-Type", "application/json")
        .send(formatFaxBotDatabase("json", username, userId))
  )
  .listen(3000);

await controller.startBotHeartbeat();
