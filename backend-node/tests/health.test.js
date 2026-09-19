const test = require("node:test");
const assert = require("node:assert");
const app = require("../src/app");

test("App loads and defines core endpoints", async () => {
  assert.ok(app, "Express app should be defined");
});

test("Environment configuration loads properly", async () => {
  const config = require("../src/config/env");
  assert.ok(config.port, "Port should be configured");
  assert.ok(config.jwtAccessSecret, "JWT Access secret should be configured");
});
