import { formatFaxBotDatabase } from "./faxbot/managers/GithubManager.js";
import { ParentController } from "./ParentController.js";
import { App } from "@tinyhttp/app";

const controller = new ParentController();

await controller.startController();

const app = new App();

const username = controller.client.getUsername();
const userId = controller.client.getUserID();

app
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
