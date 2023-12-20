import type { Request, Response } from "@tinyhttp/app";

const cache = new Map<string, string>();
const cacheHeaders = new Map<string, string>();

export const invalidateReportCache = () => void cache.clear();

export const cacheReports = () => {
  return (req: Request, res: Response, next: () => void) => {
    if (req.method === "GET") {
      const key = req.url;

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
