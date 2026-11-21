import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const vercel = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"));
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const workflow = readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
const headers = vercel.headers.flatMap(rule => rule.headers || []);
const header = name => headers.find(item => item.key.toLowerCase() === name.toLowerCase())?.value;

test("production hosting config keeps scripts same-origin and blocks active content",()=>{
  const policy = header("Content-Security-Policy") || "";
  assert.match(policy,/default-src 'self'/);
  assert.match(policy,/script-src 'self'/);
  assert.match(policy,/object-src 'none'/);
  assert.match(policy,/base-uri 'self'/);
  assert.match(policy,/frame-ancestors 'none'/);
  assert.doesNotMatch(policy,/unsafe-eval/);
});

test("production hosting config includes browser security headers",()=>{
  assert.equal(header("X-Content-Type-Options"),"nosniff");
  assert.equal(header("X-Frame-Options"),"DENY");
  assert.match(header("Referrer-Policy")||"",/strict-origin/);
  assert.match(header("Permissions-Policy")||"",/camera=\(\)/);
  assert.match(header("Strict-Transport-Security")||"",/max-age=\d+/);
});

test("hashed static assets receive immutable caching while the app shell revalidates",()=>{
  const assetRule=vercel.headers.find(rule=>rule.source==="/assets/(.*)");
  const rootRule=vercel.headers.find(rule=>rule.source==="/");
  assert.match(assetRule?.headers?.find(item=>item.key==="Cache-Control")?.value||"",/immutable/);
  assert.match(rootRule?.headers?.find(item=>item.key==="Cache-Control")?.value||"",/must-revalidate/);
});

test("declared Node runtime is within the supported CI matrix",()=>{
  assert.equal(packageJson.engines.node,">=22 <27");
  assert.match(workflow,/node-version: \[22, 24, 26\]/);
});
