import { describe, test } from "node:test";
import assert from "node:assert/strict";
import discoverHandler from "../pages/api/tmdb/discover";
import providersListHandler from "../pages/api/tmdb/providers-list";

type MockResponse = {
  statusCode: number;
  body: any;
  headers: Record<string, string | number | readonly string[]>;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
  setHeader: (name: string, value: string | number | readonly string[]) => void;
};

function createResponse(): MockResponse {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
  };
}

function response(body: unknown, options: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => body,
  } as Response;
}

function installFetch(
  t: { after: (callback: () => void) => void },
  implementation: typeof fetch
) {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.TMDB_API_KEY;
  globalThis.fetch = implementation;
  process.env.TMDB_API_KEY = "test-key";
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = originalApiKey;
  });
}

describe("providers-list route", () => {
  test("returns the usable source with a short cache when the other request rejects", async (t) => {
    installFetch(t, (async (input) => {
      const url = String(input);
      if (url.includes("/movie")) throw new Error("network unavailable");
      return response({
        results: [
          {
            provider_id: 8,
            provider_name: "Netflix",
            logo_path: "/n.jpg",
            display_priorities: { US: 1 },
          },
        ],
      });
    }) as typeof fetch);

    const res = createResponse();
    await providersListHandler(
      { method: "GET", query: { regions: "US" } } as any,
      res as any
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.providers.map((provider: any) => provider.id), [8]);
    assert.equal(res.headers["Cache-Control"], "s-maxage=300, stale-while-revalidate");
  });

  test("does not let malformed JSON from one source mask the valid source", async (t) => {
    installFetch(t, (async (input) => {
      const url = String(input);
      if (url.includes("/movie")) return response({ unexpected: true });
      return response({ results: [] });
    }) as typeof fetch);

    const res = createResponse();
    await providersListHandler(
      { method: "GET", query: { regions: "US" } } as any,
      res as any
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.providers, []);
    assert.equal(res.headers["Cache-Control"], "s-maxage=300, stale-while-revalidate");
  });

  test("returns 502 only when neither source is usable", async (t) => {
    installFetch(t, (async () => {
      throw new Error("network unavailable");
    }) as typeof fetch);

    const res = createResponse();
    await providersListHandler(
      { method: "GET", query: { regions: "US" } } as any,
      res as any
    );

    assert.equal(res.statusCode, 502);
  });
});

describe("discover route", () => {
  test("reports only successful regions and briefly caches degraded results", async (t) => {
    installFetch(t, (async (input) => {
      const url = new URL(String(input));
      const region = url.searchParams.get("watch_region");
      if (region === "US") throw new Error("region unavailable");
      if (url.pathname.endsWith("/tv")) return response({}, { ok: false, status: 503 });
      return response({
        results: [{ id: 10, title: "Available", poster_path: null, popularity: 9 }],
      });
    }) as typeof fetch);

    const res = createResponse();
    await discoverHandler(
      { method: "GET", query: { regions: "US,GB", providers: "8|337" } } as any,
      res as any
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.regionsUsed, ["GB"]);
    assert.deepEqual(res.body.results.map((item: any) => item.id), [10]);
    assert.equal(res.headers["Cache-Control"], "s-maxage=300, stale-while-revalidate");
  });

  test("uses the full cache only when every upstream request succeeds", async (t) => {
    installFetch(t, (async () => response({ results: [] })) as typeof fetch);

    const res = createResponse();
    await discoverHandler(
      { method: "GET", query: { regions: "US,GB", providers: "8|337" } } as any,
      res as any
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.regionsUsed, ["US", "GB"]);
    assert.equal(res.headers["Cache-Control"], "s-maxage=600, stale-while-revalidate");
  });

  test("rejects noncanonical provider permutations before making upstream requests", async (t) => {
    let fetchCalls = 0;
    installFetch(t, (async () => {
      fetchCalls += 1;
      return response({ results: [] });
    }) as typeof fetch);

    const res = createResponse();
    await discoverHandler(
      { method: "GET", query: { regions: "US", providers: "337|8|337" } } as any,
      res as any
    );

    assert.equal(res.statusCode, 400);
    assert.equal(fetchCalls, 0);
  });
});
