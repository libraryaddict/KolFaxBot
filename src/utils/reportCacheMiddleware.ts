import type { Request, Response } from "@tinyhttp/app";

const invalidateCacheAfter = 12 * 60 * 60 * 1000; // 12 hours
const cache = new Map<string, string>();
const cacheHeaders = new Map<string, string>();
let lastInvalidated = Date.now();

export const invalidateReportCache = () => {
  cache.clear();
  lastInvalidated = Date.now();
};

export const cacheReports = () => {
  return (req: Request, res: Response, next: () => void) => {
    if (req.method === "GET") {
      const key = req.url;

      if (lastInvalidated + invalidateCacheAfter < Date.now()) {
        invalidateReportCache();
      }

      const value = cache.get(key);

      if (value) {
        if (cacheHeaders.has(key)) {
          res.header("Content-Type", cacheHeaders.get(key));
        }

        res.send(value);

        return;
      }

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const _send = res.send;

      res.send = (body: string) => {
        if (typeof res.getHeader("Content-Type") == "string") {
          cacheHeaders.set(key, res.getHeader("Content-Type") as string);
        }

        cache.set(key, body);

        return _send(body);
      };
    }

    next();
  };
};
