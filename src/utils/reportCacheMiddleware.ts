import type { Request, Response } from "@tinyhttp/app";

const cache = new Map<string, { body: string; contentType?: string }>();

export const invalidateReportCache = () => void cache.clear();

export const cacheReports = () => {
  return (req: Request, res: Response, next: () => void) => {
    if (req.method === "GET") {
      const key = req.url;

      if (cache.has(key)) {
        const { body, contentType } = cache.get(key);
        console.log("Serving from cache", contentType, body);
        res.header("Content-Type", contentType).send(body);

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
