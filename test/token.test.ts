import { test } from "node:test";
import assert from "node:assert/strict";
import { CODE_RE, issue, verify, TOKEN_TTL_SECONDS } from "../src/token.ts";

const secret = "s3cret";
const created = new Date("2019-05-04T10:00:00Z");
const now = new Date("2026-09-13T12:00:00Z");

test("round trip", () => {
  const tok = issue(secret, "Alice_X", created, "0123456789", now);
  assert.match(tok, /^ERV1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  const p = verify(secret, tok, now);
  assert.ok(p);
  assert.equal(p.u, "Alice_X");
  assert.equal(p.c, Math.floor(created.getTime() / 1000));
  assert.equal(p.e, "0123456789");
  assert.equal(p.x - p.i, TOKEN_TTL_SECONDS);
});

test("wrong secret, tampering, expiry", () => {
  const tok = issue(secret, "alice", created, "0123456789", now);
  assert.equal(verify("other", tok, now), null);
  const [h, body, sig] = tok.split(".");
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), u: "mallory" })).toString("base64url");
  assert.equal(verify(secret, `${h}.${forged}.${sig}`, now), null);
  assert.equal(verify(secret, tok, new Date(now.getTime() + (TOKEN_TTL_SECONDS + 1) * 1000)), null);
  assert.equal(verify(secret, "garbage", now), null);
});

test("code format", () => {
  assert.ok(CODE_RE.test("0a1b2c3d4e"));
  assert.ok(!CODE_RE.test("0A1B2C3D4E"));
  assert.ok(!CODE_RE.test("0a1b2c3d4"));
});
