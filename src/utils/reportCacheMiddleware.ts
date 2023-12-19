import type { Request, Response } from "@tinyhttp/app";

const cache = new Map<string, string>();

export const invalidateReportCache = () => void cache.clear();

export const cacheReports = () => {
  return (req: Request, res: Response, next: () => void) => {
    if (req.method === "GET") {
      const key = req.url;

      const value = cache.get(key);

      if (value) {
        res.send(value);

        return;
      }

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const _send = res.send;

      res.send = (body: string) => {
        cache.set(key, body);

        return _send(body);
      };
    }

    next();
  };
};
