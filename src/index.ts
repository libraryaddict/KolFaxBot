import { formatMonsterList } from "./faxbot/monsters.js";
import { ParentController } from "./ParentController.js";
import { cacheReports } from "./utils/reportCacheMiddleware.js";
import { App } from "@tinyhttp/app";

try {
  const controller = new ParentController();
  await controller.startController();

  const username = controller.client.getUsername();
  const userId = controller.client.getUserID();

  const app = new App();

  app
    // Since every endpoint is a report, for the moment this middleware is just set up
    // to cache every endpoint.
    .use(cacheReports())
    .get("/", async (_, res) => {
      const html = await formatMonsterList("html", username, userId);
      void res.type("html").send(html);
    })
    .get(
      "/onlyfax.xml",
      async (_, res) =>
        void res
          .type("xml")
          .send(await formatMonsterList("xml", username, userId))
    )
    .get(
      "/onlyfax.json",
      async (_, res) =>
        void res
          .type("json")
          .send(await formatMonsterList("json", username, userId))
    )
    .listen(3000);

  await controller.startBotHeartbeat();
} catch (e) {
  console.error(e);
  throw e;
}
