import type { Request, Response } from "@tinyhttp/app";

const cache = new Map<string, { body: string; contentType?: string }>();
let lastCacheReset = Date.now();

export const invalidateReportCache = () => {
  cache.clear();
  lastCacheReset = Date.now();
};

export const cacheReports = () => {
  return (req: Request, res: Response, next: () => void) => {
    if (req.method === "GET") {
      // Reset cache every 12 hours
      if (lastCacheReset + 12 * 60 * 60 * 1000 < Date.now()) {
        invalidateReportCache();
      }

      const key = req.url;

      if (cache.has(key)) {
        const { body, contentType } = cache.get(key);

        try {
          res.header("Content-Type", contentType).send(body);
        } catch (error) {
          console.log("Error while serving from cache", contentType, body);
        }

        return;
      }

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const _send = res.send;

      res.send = (body: string) => {
        cache.set(key, {
          body,
          contentType: res.getHeader("Content-Type")?.toString() ?? undefined,
        });

        return _send(body);
      };
    }

    next();
  };
};
