const assert = require("node:assert/strict");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createApp } = require("./server");

function startTestServer() {
  const usersFile = path.join(os.tmpdir(), `ai-learn-users-${Date.now()}-${Math.random()}.json`);
  const app = createApp({
    usersFile,
    jwtSecret: "test-secret",
    geminiApiKey: "",
    rateLimit: false,
    codeTimeoutMs: 5000,
  });

  const server = http.createServer(app);

  return new Promise((resolve) => {
    server.listen(0, () => {
      const { port } = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

test("health route reports service status", async (t) => {
  const server = await startTestServer();
  t.after(server.close);

  const response = await fetch(`${server.baseUrl}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.service, "AI Learn backend");
});

test("signup creates a user and duplicate usernames are rejected", async (t) => {
  const server = await startTestServer();
  t.after(server.close);

  const payload = {
    username: "learner",
    email: "learner@example.com",
    password: "secret12",
  };

  const first = await fetch(`${server.baseUrl}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const second = await fetch(`${server.baseUrl}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  assert.equal(first.status, 200);
  assert.equal(await first.text(), "User registered successfully!");
  assert.equal(second.status, 409);
});

test("login returns a session token header for valid credentials", async (t) => {
  const server = await startTestServer();
  t.after(server.close);

  await fetch(`${server.baseUrl}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "session-user",
      email: "session@example.com",
      password: "secret12",
    }),
  });

  const response = await fetch(`${server.baseUrl}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "session-user",
      password: "secret12",
    }),
  });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "Login successful!");
  assert.match(response.headers.get("x-auth-token"), /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
});

test("run-code executes JavaScript without shell interpolation", async (t) => {
  const server = await startTestServer();
  t.after(server.close);

  const response = await fetch(`${server.baseUrl}/run-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: "JavaScript",
      code: 'console.log("safe output");',
    }),
  });

  assert.equal(response.status, 200);
  assert.equal((await response.text()).trim(), "safe output");
});
