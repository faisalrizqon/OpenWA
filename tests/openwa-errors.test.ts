/**
 * Unit tests untuk OpenWA error classes & classifiers.
 * 
 * Test coverage:
 *  - `httpErrorFromResponse`: mapping status code → typed error
 *  - `classifyFetchError`: network timeout/exception → typed error
 *  - `isRetryable`: retry logic per error type
 */

import { describe, it, expect } from "vitest";
import { OpenWAError, httpErrorFromResponse, classifyFetchError, isRetryable } from "@/lib/openwa-errors";

// --- httpErrorFromResponse ---

describe("httpErrorFromResponse", () => {
  const dummyPath = "/api/test";

  it("returns AUTH_INVALID for 401/403", () => {
    const err401 = httpErrorFromResponse(401, "", dummyPath);
    expect(err401.code).toBe("AUTH_INVALID");
    expect(err401.retryable).toBe(false);
    expect(err401.httpStatus).toBe(401);

    const err403 = httpErrorFromResponse(403, "Forbidden", dummyPath);
    expect(err403.code).toBe("AUTH_INVALID");
    expect(err403.message).toContain("403");
  });

  it("returns SESSION_NOT_FOUND for 404 on session endpoint", () => {
    const err = httpErrorFromResponse(404, "Session not found", "/api/sessions/xxx");
    expect(err.code).toBe("SESSION_NOT_FOUND");
    expect(err.retryable).toBe(false);
    expect(err.message).toContain("tidak ditemukan");
  });

  it("returns GATEWAY_HTTP for 404 on other endpoints", () => {
    const err = httpErrorFromResponse(404, "Not found", "/api/something-else");
    expect(err.code).toBe("GATEWAY_HTTP");
  });

  it("returns RATE_LIMITED for 429 with retryable=true", () => {
    const err = httpErrorFromResponse(429, "Too many requests", dummyPath);
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.retryable).toBe(true);
    expect(err.httpStatus).toBe(429);
  });

  it("marks 5xx errors as retryable", () => {
    const err500 = httpErrorFromResponse(500, "Internal server error", dummyPath);
    expect(err500.retryable).toBe(true);
    expect(err500.code).toBe("GATEWAY_HTTP");

    const err502 = httpErrorFromResponse(502, "Bad gateway", dummyPath);
    expect(err502.retryable).toBe(true);
  });

  it("includes body snippet in message when available", () => {
    const body = JSON.stringify({ error: "Unauthorized access attempt" });
    const err = httpErrorFromResponse(401, body, dummyPath);
    expect(err.message).toContain("Unauthorized");
  });
});

// --- classifyFetchError ---

describe("classifyFetchError", () => {
  const url = "http://localhost:2785/api/test";

  it("classifies TimeoutError as GATEWAY_TIMEOUT", () => {
    const timeoutErr = new DOMException("The operation was aborted.", "TimeoutError");
    const classified = classifyFetchError(timeoutErr, url, 10_000);
    expect(classified.code).toBe("GATEWAY_TIMEOUT");
    expect(classified.retryable).toBe(true);
    expect(classified.message).toContain("10000ms");
  });

  it("classifies connection refused (ECONNREFUSED) as GATEWAY_UNREACHABLE", () => {
    const connErr = Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
    const classified = classifyFetchError(connErr, url, 10_000);
    expect(classified.code).toBe("GATEWAY_UNREACHABLE");
    expect(classified.retryable).toBe(true);
    expect(classified.message).toContain("ECONNREFUSED");
  });

  it("classifies DNS error as GATEWAY_UNREACHABLE without code hint", () => {
    const dnsErr = Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } });
    const classified = classifyFetchError(dnsErr, url, 10_000);
    expect(classified.code).toBe("GATEWAY_UNREACHABLE");
    expect(classified.message).toContain("ENOTFOUND");
  });

  it("defaults to GATEWAY_UNREACHABLE for unknown errors", () => {
    const unknownErr = new Error("Random network issue");
    const classified = classifyFetchError(unknownErr, url, 10_000);
    expect(classified.code).toBe("GATEWAY_UNREACHABLE");
    expect(classified.retryable).toBe(true);
    expect(classified.message).toContain(url);
  });

  it("handles non-Error objects gracefully", () => {
    const classified = classifyFetchError("string error", url, 10_000);
    expect(classified.code).toBe("GATEWAY_UNREACHABLE");
  });
});

// --- isRetryable ---

describe("isRetryable", () => {
  it("returns true for retryable OpenWAError", () => {
    const retryableErr = new OpenWAError("Transient failure", "GATEWAY_UNREACHABLE", { retryable: true });
    expect(isRetryable(retryableErr)).toBe(true);
  });

  it("returns false for non-retryable OpenWAError", () => {
    const nonRetryableErr = new OpenWAError("Auth failed", "AUTH_INVALID", { retryable: false });
    expect(isRetryable(nonRetryableErr)).toBe(false);
  });

  it("returns false for non-OpenWAError values", () => {
    expect(isRetryable("error")).toBe(false);
    expect(isRetryable(new Error("generic"))).toBe(false);
  });
});

// --- Integration tests with real scenarios ---

describe("Real-world scenarios", () => {
  it("simulates network outage during message send", () => {
    const netErr = Object.assign(new TypeError("Network request failed"), { cause: { code: "ENETUNREACH" } });
    const classified = classifyFetchError(netErr, "http://localhost:2785/api/messages/send-text", 30_000);
    expect(classified.code).toBe("GATEWAY_UNREACHABLE");
    expect(isRetryable(classified)).toBe(true);
  });

  it("simulates rate limit from gateway", () => {
    const rateLimitBody = JSON.stringify({ message: "Too many messages sent" });
    const err = httpErrorFromResponse(429, rateLimitBody, "/api/sessions/x/messages/send-text");
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.retryable).toBe(true);
    expect(err.message).toContain("Too many messages");
  });

  it("simulates session not found during startSession call", () => {
    const notFoundBody = JSON.stringify({ error: "Session does not exist" });
    const err = httpErrorFromResponse(
      404,
      notFoundBody,
      "/api/sessions/non-existent-id/start",
    );
    expect(err.code).toBe("SESSION_NOT_FOUND");
    expect(err.retryable).toBe(false); // Session errors should not be retried
  });
});
