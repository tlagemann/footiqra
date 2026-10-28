import { describe, expect, it } from "vitest";
import { getServerEnv, requireEnv } from "./env";

describe("getServerEnv", () => {
  it("applies defaults", () => {
    const env = getServerEnv({ NODE_ENV: "test" } as NodeJS.ProcessEnv);
    expect(env.FOOTBALL_DATA_REQUESTS_PER_MINUTE).toBe(8);
    expect(env.DATABASE_URL).toBeUndefined();
  });

  it("reports invalid variable names without leaking values", () => {
    const secret = "postgres-but-not-a-url";
    expect(() =>
      getServerEnv({ NODE_ENV: "test", DATABASE_URL: secret } as NodeJS.ProcessEnv),
    ).toThrow(/DATABASE_URL/);
    try {
      getServerEnv({ NODE_ENV: "test", DATABASE_URL: secret } as NodeJS.ProcessEnv);
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
});

describe("requireEnv", () => {
  it("throws a clear error for missing values", () => {
    const env = getServerEnv({ NODE_ENV: "test" } as NodeJS.ProcessEnv);
    expect(() => requireEnv("FOOTBALL_DATA_API_TOKEN", env)).toThrow(
      "Missing required environment variable: FOOTBALL_DATA_API_TOKEN",
    );
  });

  it("returns present values", () => {
    const env = getServerEnv({
      NODE_ENV: "test",
      DATABASE_URL: "postgres://user:pass@localhost:5432/footiqra",
    } as NodeJS.ProcessEnv);
    expect(requireEnv("DATABASE_URL", env)).toContain("localhost");
  });
});
