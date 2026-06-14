// Load environment variables from .env file if it exists
try {
  require("dotenv").config();
} catch {
  // dotenv not installed, skip loading .env file
}

const crypto = require("crypto");
const { spawn } = require("child_process");
const fs = require("fs");
const fsp = fs.promises;
const http = require("http");
const os = require("os");
const path = require("path");

const cors = require("cors");
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const DEFAULT_PORT = 5000;
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:5173",
  "http://localhost:5500",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5500",
];

function getEnvList(name, fallback = []) {
  const value = process.env[name];
  if (!value) return fallback;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function createToken(payload, secret, expiresInMs = 1000 * 60 * 60 * 24) {
  const header = { alg: "HS256", typ: "JWT" };
  const body = {
    ...payload,
    exp: Date.now() + expiresInMs,
  };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedBody = base64Url(JSON.stringify(body));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedBody}.${signature}`;
}

function verifyToken(token, secret) {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedBody, signature] = parts;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest("base64url");

  const provided = Buffer.from(signature);
  const calculated = Buffer.from(expected);
  if (provided.length !== calculated.length) return null;
  if (!crypto.timingSafeEqual(provided, calculated)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedBody, "base64url").toString("utf8"),
    );
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function hashPassword(password) {
  const iterations = 120000;
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, iterations, 32, "sha256")
    .toString("hex");
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== "string") return false;

  const [algorithm, rawIterations, salt, expectedHash] = storedHash.split("$");
  if (
    algorithm !== "pbkdf2_sha256" ||
    !rawIterations ||
    !salt ||
    !expectedHash
  ) {
    return false;
  }

  const iterations = Number(rawIterations);
  if (!Number.isInteger(iterations) || iterations < 10000) return false;

  const actualHash = crypto
    .pbkdf2Sync(password, salt, iterations, 32, "sha256")
    .toString("hex");

  const provided = Buffer.from(actualHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return (
    provided.length === expected.length &&
    crypto.timingSafeEqual(provided, expected)
  );
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(value) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizeAiText(value) {
  return String(value || "")
    .trim()
    .slice(0, 12000);
}

function stripCodeFence(value) {
  const text = String(value || "").trim();
  const match = text.match(/^```[a-zA-Z0-9+#.-]*\s*([\s\S]*?)\s*```$/);
  return match ? match[1].trim() : text;
}

function createUserStore(usersFile) {
  let writeQueue = Promise.resolve();

  async function ensureFile() {
    await fsp.mkdir(path.dirname(usersFile), { recursive: true });
    try {
      await fsp.access(usersFile);
    } catch {
      await fsp.writeFile(usersFile, "[]\n", "utf8");
    }
  }

  async function readUsers() {
    await ensureFile();
    const raw = await fsp.readFile(usersFile, "utf8");
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  }

  async function writeUsers(users) {
    await fsp.mkdir(path.dirname(usersFile), { recursive: true });
    const tempFile = `${usersFile}.${process.pid}.tmp`;
    await fsp.writeFile(
      tempFile,
      `${JSON.stringify(users, null, 2)}\n`,
      "utf8",
    );
    await fsp.rename(tempFile, usersFile);
  }

  async function mutateUsers(mutator) {
    writeQueue = writeQueue.then(async () => {
      const users = await readUsers();
      const result = await mutator(users);
      await writeUsers(users);
      return result;
    });

    return writeQueue;
  }

  return {
    readUsers,
    mutateUsers,
  };
}

function createRateLimiter({
  enabled = true,
  max = 120,
  windowMs = 15 * 60 * 1000,
} = {}) {
  const buckets = new Map();

  return function rateLimiter(req, res, next) {
    if (!enabled) return next();

    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > max) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
      return res
        .status(429)
        .send("Too many requests. Please try again shortly.");
    }

    return next();
  };
}

function runProcess(command, args, options = {}) {
  const timeoutMs = options.timeoutMs || 8000;
  const maxOutputBytes = options.maxOutputBytes || 100000;

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let finished = false;

    const child = spawn(command, args, {
      cwd: options.cwd,
      shell: false,
      windowsHide: true,
      env: createProcessEnv(options),
    });

    const timer = setTimeout(() => {
      if (!finished) {
        child.kill("SIGKILL");
        finished = true;
        resolve({
          ok: false,
          code: null,
          command,
          unavailable: false,
          output: `Execution timed out after ${timeoutMs}ms.`,
        });
      }
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      if (Buffer.byteLength(stdout + stderr, "utf8") > maxOutputBytes) {
        child.kill("SIGKILL");
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
      if (Buffer.byteLength(stdout + stderr, "utf8") > maxOutputBytes) {
        child.kill("SIGKILL");
      }
    });

    child.on("error", (error) => {
      if (finished) return;
      clearTimeout(timer);
      finished = true;
      resolve({
        ok: false,
        code: null,
        command,
        unavailable: error.code === "ENOENT",
        output:
          error.code === "ENOENT"
            ? `Runtime not available: ${command}. Install it or choose another language.`
            : error.message,
      });
    });

    child.on("close", (code) => {
      if (finished) return;
      clearTimeout(timer);
      finished = true;

      const output = `${stdout}${stderr}`.trim();
      resolve({
        ok: code === 0,
        code,
        command,
        unavailable: isRuntimeUnavailableOutput(output),
        output: output || (code === 0 ? "Code executed successfully." : `Process exited with code ${code}.`),
      });
    });
  });
}

function createProcessEnv(options = {}) {
  const env = {
    ...process.env,
    NODE_OPTIONS: "",
  };
  const pathAdditions = normalizeCommandList(options.pathAdditions);

  if (pathAdditions.length > 0) {
    const pathKey =
      Object.keys(env).find((key) => key.toLowerCase() === "path") || "PATH";
    env[pathKey] = [pathAdditions.join(path.delimiter), env[pathKey] || ""]
      .filter(Boolean)
      .join(path.delimiter);
  }

  return env;
}

function getCompileTimeoutMs(timeoutMs) {
  return Math.max(Number(timeoutMs) || 8000, 20000);
}

function isRuntimeUnavailableOutput(output) {
  const text = String(output || "");
  return [
    /Runtime not available:/i,
    /Python was not found; run without arguments to install from the Microsoft Store/i,
    /No installed Python found/i,
    /No suitable Python runtime found/i,
  ].some((pattern) => pattern.test(text));
}

function normalizeCommandList(commands = []) {
  return Array.from(
    new Set(
      (Array.isArray(commands) ? commands : [])
        .filter(Boolean)
        .map((item) => String(item).trim()),
    ),
  );
}

function getRuntimeCandidates() {
  const home = os.homedir();
  const javaHome = process.env.JAVA_HOME;
  const localToolchainBin = path.join(
    __dirname,
    "..",
    "tools",
    "llvm-mingw-20260519-ucrt-x86_64",
    "bin",
  );

  return {
    Python: normalizeCommandList([
      path.join(
        home,
        "AppData",
        "Local",
        "Programs",
        "Python",
        "Python312",
        "python.exe",
      ),
      path.join(
        home,
        "AppData",
        "Local",
        "Programs",
        "Python",
        "Python311",
        "python.exe",
      ),
      path.join("C:", "Program Files", "Python312", "python.exe"),
      path.join("C:", "Program Files", "Python311", "python.exe"),
      process.env.PYTHON_BIN,
      "python",
      "python3",
      "py",
      "python3.12",
      "python3.11",
      "python3.10",
      path.join(
        home,
        "AppData",
        "Local",
        "Microsoft",
        "WindowsApps",
        "python.exe",
      ),
    ]),
    JavaCompile: normalizeCommandList([
      javaHome && path.join(javaHome, "bin", "javac.exe"),
      path.join(
        "C:",
        "Program Files",
        "Eclipse Adoptium",
        "jdk-21.0.11.10-hotspot",
        "bin",
        "javac.exe",
      ),
      path.join(
        "C:",
        "Program Files",
        "Eclipse Adoptium",
        "jdk-21.0.11-hotspot",
        "bin",
        "javac.exe",
      ),
      path.join(
        "C:",
        "Program Files",
        "Java",
        "jdk-21.0.11",
        "bin",
        "javac.exe",
      ),
      "javac",
    ]),
    JavaRun: normalizeCommandList([
      javaHome && path.join(javaHome, "bin", "java.exe"),
      path.join(
        "C:",
        "Program Files",
        "Eclipse Adoptium",
        "jdk-21.0.11.10-hotspot",
        "bin",
        "java.exe",
      ),
      path.join(
        "C:",
        "Program Files",
        "Eclipse Adoptium",
        "jdk-21.0.11-hotspot",
        "bin",
        "java.exe",
      ),
      path.join(
        "C:",
        "Program Files",
        "Java",
        "jdk-21.0.11",
        "bin",
        "java.exe",
      ),
      "java",
    ]),
    Cpp: normalizeCommandList([
      process.env.CXX_BIN,
      path.join(localToolchainBin, "clang++.exe"),
      path.join(localToolchainBin, "x86_64-w64-mingw32-clang++.exe"),
      path.join(localToolchainBin, "g++.exe"),
      path.join(localToolchainBin, "x86_64-w64-mingw32-g++.exe"),
      path.join("C:", "Program Files", "LLVM", "bin", "clang++.exe"),
      path.join("C:", "Program Files", "LLVM", "bin", "clang.exe"),
      path.join("C:", "Program Files", "LLVM", "bin", "clang-cl.exe"),
      path.join("C:", "Program Files (x86)", "LLVM", "bin", "clang++.exe"),
      path.join("C:", "Program Files (x86)", "LLVM", "bin", "clang-cl.exe"),
      path.join("C:", "Program Files", "LLVM MinGW", "bin", "clang++.exe"),
      path.join("C:", "Program Files", "LLVM MinGW", "bin", "g++.exe"),
      path.join("C:", "Program Files", "LLVM", "bin", "g++.exe"),
      "clang++",
      "clang-cl.exe",
      "g++",
      "cl.exe",
    ]),
    Go: normalizeCommandList([
      path.join("C:", "Program Files", "Go", "bin", "go.exe"),
      path.join("C:", "Program Files (x86)", "Go", "bin", "go.exe"),
      path.join("C:", "Go", "bin", "go.exe"),
      path.join(home, "go", "bin", "go.exe"),
      path.join(home, "AppData", "Local", "Programs", "Go", "bin", "go.exe"),
      "go",
    ]),
  };
}

async function runProcessTryMultiple(commands, args, options = {}) {
  const candidates = normalizeCommandList(commands);
  let lastUnavailable = null;

  for (const command of candidates) {
    const result = await runProcess(command, args, options);
    if (result.ok) {
      return result;
    }

    if (result.unavailable) {
      lastUnavailable = result;
      continue;
    }

    return result;
  }

  return (
    lastUnavailable || {
      ok: false,
      code: null,
      unavailable: true,
      output: "Runtime not available. Install it or choose another language.",
    }
  );
}

async function detectRuntime(language) {
  const candidates = getRuntimeCandidates();
  const commandGroups = {
    Python: candidates.Python,
    Java: candidates.JavaCompile,
    "C++": candidates.Cpp,
    Go: candidates.Go,
  };

  const commands = commandGroups[language] || [];
  for (const command of normalizeCommandList(commands)) {
    const probeArgs = getRuntimeProbeArgs(language, command);
    const result = await runProcess(command, probeArgs, { timeoutMs: 2000 });

    if (isSuccessfulRuntimeProbe(language, command, result)) {
      availableRuntimes.add(language);
      return true;
    }
  }

  return false;
}

function getRuntimeProbeArgs(language, command = "") {
  const executable = path.basename(String(command)).toLowerCase();
  if (language === "C++" && executable === "cl.exe") return [];

  return (
    {
      Python: ["--version"],
      Java: ["-version"],
      "C++": ["--version"],
      Go: ["version"],
    }[language] || ["--version"]
  );
}

function isSuccessfulRuntimeProbe(language, command, result) {
  if (!result || result.unavailable) return false;

  const output = String(result.output || "");
  const executable = path.basename(String(command)).toLowerCase();

  if (language === "Python") {
    return result.ok && /\bPython\s+3\.\d+/i.test(output);
  }

  if (language === "C++" && executable === "cl.exe") {
    return /Microsoft.*C\/C\+\+|Microsoft.*Compiler/i.test(output);
  }

  return result.ok;
}

async function compileCpp(commands, sourcePath, outputPath, options = {}) {
  const candidates = normalizeCommandList(commands);
  let lastUnavailable = null;

  for (const command of candidates) {
    const args = command.toLowerCase().endsWith("cl.exe")
      ? [sourcePath, `/Fe:${outputPath}`]
      : [sourcePath, "-o", outputPath];

    const result = await runProcess(command, args, options);
    if (result.ok) {
      return result;
    }

    if (result.unavailable) {
      lastUnavailable = result;
      continue;
    }

    return result;
  }

  return (
    lastUnavailable || {
      ok: false,
      code: null,
      unavailable: true,
      output: "C++ compiler not available. Install LLVM, MinGW, or Visual Studio Build Tools.",
    }
  );
}

function prepareRunnableCode(language, code) {
  const source = String(code || "");

  if (language === "Java" && !/\bclass\s+Main\b/.test(source)) {
    return `public class Main {\n  public static void main(String[] args) {\n${source
      .split("\n")
      .map((line) => `    ${line}`)
      .join("\n")}\n  }\n}\n`;
  }

  if (language === "C++" && !/\bint\s+main\s*\(/.test(source)) {
    return `#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n${source
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n")}\n  return 0;\n}\n`;
  }

  if (language === "Go" && !/^package\s+main/m.test(source)) {
    return `package main\n\nimport "fmt"\n\nfunc main() {\n${source
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n")}\n}\n`;
  }

  return source;
}

// Check available runtimes on startup
const availableRuntimes = new Set(["JavaScript"]); // Node.js is always available

async function checkRuntimes() {
  for (const language of ["Python", "Java", "C++", "Go"]) {
    await detectRuntime(language);
  }

  const available = Array.from(availableRuntimes).sort().join(", ");
  console.log(`Available code runtimes: ${available}`);
}

async function executeCode({ language, code, timeoutMs, maxCodeBytes }) {
  const supportedLanguages = ["Python", "JavaScript", "Java", "C++", "Go"];
  if (!supportedLanguages.includes(language)) {
    return { ok: false, output: "Language not supported." };
  }

  if (!availableRuntimes.has(language)) {
    const runtimeAvailable = await detectRuntime(language);
    if (!runtimeAvailable) {
      const available = Array.from(availableRuntimes).join(", ");
      const installInstructions = {
        Python:
          "Python 3 from https://python.org or 'winget install Python.Python.3.12'",
        Java: "OpenJDK from https://adoptium.net or 'winget install EclipseAdoptium.Temurin.21.JDK'",
        "C++": "LLVM from https://llvm.org or 'winget install LLVM.LLVM'",
        Go: "Go from https://golang.org/dl or 'winget install GoLang.Go'",
      };

      return {
        ok: false,
        output: `${language} runtime is not installed.\n\nCurrently available: ${available}\n\nInstall ${language}:\n${installInstructions[language] || "Visit official website"}\n\nAfter installation, restart the server.\n\nFor now, you can practice with: ${available}`,
      };
    }
  }

  const byteLength = Buffer.byteLength(String(code || ""), "utf8");
  if (byteLength > maxCodeBytes) {
    return {
      ok: false,
      output: `Code is too large. Maximum size is ${maxCodeBytes} bytes.`,
    };
  }

  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "ai-learn-run-"));

  try {
    const preparedCode = prepareRunnableCode(language, code);

    const runtimeCandidates = getRuntimeCandidates();

    if (language === "Python") {
      const filePath = path.join(tempDir, "main.py");
      await fsp.writeFile(filePath, preparedCode, "utf8");
      return await runProcessTryMultiple(runtimeCandidates.Python, [filePath], {
        cwd: tempDir,
        timeoutMs,
      });
    }

    if (language === "JavaScript") {
      const filePath = path.join(tempDir, "main.js");
      await fsp.writeFile(filePath, preparedCode, "utf8");
      return await runProcess("node", [filePath], { cwd: tempDir, timeoutMs });
    }

    if (language === "Java") {
      const filePath = path.join(tempDir, "Main.java");
      await fsp.writeFile(filePath, preparedCode, "utf8");
      const compile = await runProcessTryMultiple(
        runtimeCandidates.JavaCompile,
        [filePath],
        {
          cwd: tempDir,
          timeoutMs,
        },
      );
      if (!compile.ok) return compile;
      return await runProcessTryMultiple(
        runtimeCandidates.JavaRun,
        ["-cp", tempDir, "Main"],
        {
          cwd: tempDir,
          timeoutMs,
        },
      );
    }

    if (language === "C++") {
      const filePath = path.join(tempDir, "main.cpp");
      const outputPath = path.join(
        tempDir,
        process.platform === "win32" ? "main.exe" : "main",
      );
      await fsp.writeFile(filePath, preparedCode, "utf8");
      const compile = await compileCpp(
        runtimeCandidates.Cpp,
        filePath,
        outputPath,
        {
          cwd: tempDir,
          timeoutMs,
        },
      );
      if (!compile.ok) return compile;
      return await runProcess(outputPath, [], {
        cwd: tempDir,
        timeoutMs,
        pathAdditions: [path.dirname(compile.command)],
      });
    }

    if (language === "Go") {
      const filePath = path.join(tempDir, "main.go");
      const outputPath = path.join(
        tempDir,
        process.platform === "win32" ? "main.exe" : "main",
      );
      await fsp.writeFile(filePath, preparedCode, "utf8");
      const compile = await runProcessTryMultiple(
        runtimeCandidates.Go,
        ["build", "-o", outputPath, filePath],
        {
          cwd: tempDir,
          timeoutMs: getCompileTimeoutMs(timeoutMs),
        },
      );
      if (!compile.ok) return compile;
      return await runProcess(outputPath, [], { cwd: tempDir, timeoutMs });
    }
  } finally {
    fsp.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

function createAiClient(apiKey, modelName) {
  let model = null;

  return {
    async generate(prompt) {
      if (!apiKey) {
        // Fallback: if no AI key is configured, provide a helpful message.
        // The endpoints using this client will attempt their own lightweight fallbacks.
        const error = new Error(
          "AI service is not configured on the server. Falling back to local helpers.",
        );
        error.statusCode = 503;
        throw error;
      }

      if (!model) {
        const genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({ model: modelName });
      }

      const result = await model.generateContent(prompt);
      return result.response.text();
    },
  };
}

function fallbackExplain(code, language) {
  const lines = String(code || "").split(/\r?\n/).map((l) => l.trim());
  const nonEmpty = lines.filter(Boolean);
  const summaryParts = [];

  if (nonEmpty.length === 0) {
    summaryParts.push(`No code provided to explain.`);
  } else {
    summaryParts.push(`This is a ${language} code snippet with ${nonEmpty.length} non-empty lines.`);

    const imports = nonEmpty.filter((l) => /^(import\s|from\s|#include\s|using\s)/i.test(l));
    if (imports.length) summaryParts.push(`It imports or includes ${imports.length} modules.`);

    const funcs = nonEmpty.filter((l) => /\bdef\s+\w+\s*\(|function\s+\w+\s*\(|\bfunc\s+\w+\s*\(/i.test(l));
    if (funcs.length) summaryParts.push(`It defines ${funcs.length} function(s).`);

    const classes = nonEmpty.filter((l) => /\bclass\s+\w+/i.test(l));
    if (classes.length) summaryParts.push(`It defines ${classes.length} class(es).`);

    const prints = nonEmpty.filter((l) => /\bprint\s*\(|console\.log\s*\(/i.test(l));
    if (prints.length) summaryParts.push(`It writes output to the console ${prints.length} time(s).`);
  }

  const purpose = `Purpose: Provide a beginner-friendly explanation of the code.`;
  const behavior = `Step-by-step: ${summaryParts.join(" ")}`;
  const concepts = `Key concepts: ${[language, "functions", "I/O", "control flow"].join(", ")}.`;
  const expected = nonEmpty.some((l) => /\bprint\s*\(|console\.log\s*\(/i.test(l))
    ? `Expected output: The program prints text to the console.`
    : `Expected output: No console output detected; the code may perform internal computation.`;

  return `${purpose}\n\n${behavior}\n\n${concepts}\n\n${expected}`;
}

function fallbackFix(code, language) {
  let text = String(code || "");
  // Simple deterministic cleanups that often fix trivial issues.
  // 1) Replace smart quotes with straight quotes
  text = text.replace(/[\u2018\u2019\u201C\u201D]/g, (c) => (c === '“' || c === '”' ? '"' : "'"));
  // 2) Convert tabs to 4 spaces
  text = text.replace(/\t/g, "    ");
  // 3) Trim trailing whitespace on each line
  text = text.split(/\r?\n/).map((l) => l.replace(/[ \t]+$/g, "")).join("\n");
  // 4) Ensure file ends with newline
  if (!text.endsWith("\n")) text += "\n";

  // 5) Try to fix simple unmatched quotes and parentheses
  const countChars = (s, ch) => (s.split(ch).length - 1);
  const doubleQuotes = countChars(text, '"');
  const singleQuotes = countChars(text, "'");
  const openPar = countChars(text, '(');
  const closePar = countChars(text, ')');

  if (doubleQuotes % 2 === 1) {
    text = text + '"\n';
  }
  if (singleQuotes % 2 === 1) {
    text = text + "'\n";
  }
  if (openPar > closePar) {
    text = text + ')\n'.repeat(openPar - closePar);
  }

  // Return cleaned code; if no changes were made, include a note so frontend can inform the user.
  return text;
}

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function createApp(options = {}) {
  const app = express();
  const port = Number(options.port || process.env.PORT || DEFAULT_PORT);
  const usersFile =
    options.usersFile ||
    process.env.USERS_FILE ||
    path.join(__dirname, "data", "users.json");
  const jwtSecret =
    options.jwtSecret ||
    process.env.JWT_SECRET ||
    "development-only-secret-change-before-deployment";
  const maxCodeBytes = Number(
    options.maxCodeBytes || process.env.MAX_CODE_BYTES || 20000,
  );
  const codeTimeoutMs = Number(
    options.codeTimeoutMs || process.env.CODE_TIMEOUT_MS || 8000,
  );
  const allowedOrigins = getEnvList("CLIENT_ORIGIN", DEFAULT_ALLOWED_ORIGINS);
  const userStore = createUserStore(usersFile);
  const ai = createAiClient(
    options.geminiApiKey !== undefined
      ? options.geminiApiKey
      : process.env.GEMINI_API_KEY,
    options.geminiModel || process.env.GEMINI_MODEL || "gemini-2.5-flash",
  );

  app.disable("x-powered-by");
  app.set("port", port);

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    next();
  });

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked origin: ${origin}`));
      },
      exposedHeaders: ["X-Auth-Token", "X-User-Name"],
    }),
  );

  app.use(express.json({ limit: "1mb", strict: true }));
  app.use(
    createRateLimiter({
      enabled: options.rateLimit !== false,
      max: Number(process.env.RATE_LIMIT_MAX || 160),
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    }),
  );

  const frontendDir = path.join(__dirname, "..", "frontend");
  if (fs.existsSync(frontendDir)) {
    app.use(express.static(frontendDir, { extensions: ["html"], index: "index.html" }));
    app.use("/app", express.static(frontendDir, { extensions: ["html"], index: "index.html" }));
    app.get("/app", (req, res) => res.redirect("/app/index.html"));
  }

  function issueAuthHeaders(res, user) {
    const token = createToken(
      {
        sub: user.id,
        username: user.username,
        email: user.email || "",
      },
      jwtSecret,
    );

    res.setHeader("X-Auth-Token", token);
    res.setHeader("X-User-Name", user.username);
  }

  function authenticate(req, res, next) {
    const authHeader = req.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const payload = verifyToken(token, jwtSecret);

    if (!payload) {
      return res.status(401).send("Authentication required.");
    }

    req.user = payload;
    return next();
  }

  app.get("/", (req, res) => {
    res.send("Server is running!");
  });

  app.get(["/health", "/api/health"], (req, res) => {
    res.json({
      ok: true,
      service: "AI Learn backend",
      uptime: process.uptime(),
      aiConfigured: Boolean(process.env.GEMINI_API_KEY || options.geminiApiKey),
    });
  });

  app.post(
    ["/signup", "/api/signup"],
    asyncHandler(async (req, res) => {
      const username = normalizeUsername(req.body.username);
      const email = normalizeEmail(req.body.email);
      const password = String(req.body.password || "");

      if (!username || !password) {
        return res.status(400).send("Username and password are required.");
      }

      if (username.length < 3 || username.length > 40) {
        return res
          .status(400)
          .send("Username must be between 3 and 40 characters.");
      }

      if (!isValidEmail(email)) {
        return res.status(400).send("Please provide a valid email address.");
      }

      if (password.length < 6) {
        return res.status(400).send("Password must be at least 6 characters.");
      }

      const result = await userStore.mutateUsers(async (users) => {
        const usernameKey = username.toLowerCase();
        const emailKey = email.toLowerCase();
        const existingUser = users.find((user) => {
          const sameUsername =
            String(user.username || "").toLowerCase() === usernameKey;
          const sameEmail =
            emailKey && String(user.email || "").toLowerCase() === emailKey;
          return sameUsername || sameEmail;
        });

        if (existingUser) {
          return { status: 409, message: "Username or email already exists." };
        }

        users.push({
          id: crypto.randomUUID(),
          username,
          email,
          passwordHash: hashPassword(password),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        return { status: 200, message: "User registered successfully!" };
      });

      return res.status(result.status).send(result.message);
    }),
  );

  app.post(
    ["/login", "/api/login"],
    asyncHandler(async (req, res) => {
      const identifier = normalizeUsername(
        req.body.username || req.body.email || req.body.identifier,
      );
      const password = String(req.body.password || "");

      if (!identifier || !password) {
        return res.status(400).send("Username and password are required.");
      }

      const users = await userStore.readUsers();
      const identifierKey = identifier.toLowerCase();
      const user = users.find((item) => {
        return (
          String(item.username || "").toLowerCase() === identifierKey ||
          String(item.email || "").toLowerCase() === identifierKey
        );
      });

      if (!user) {
        return res.status(401).send("Invalid username or password.");
      }

      const validPassword = user.passwordHash
        ? verifyPassword(password, user.passwordHash)
        : user.password === password;

      if (!validPassword) {
        return res.status(401).send("Invalid username or password.");
      }

      if (!user.passwordHash) {
        await userStore.mutateUsers(async (storedUsers) => {
          const storedUser = storedUsers.find((item) => item.id === user.id);
          if (storedUser) {
            storedUser.passwordHash = hashPassword(password);
            delete storedUser.password;
            storedUser.updatedAt = new Date().toISOString();
          }
        });
      }

      issueAuthHeaders(res, user);
      return res.send("Login successful!");
    }),
  );

  app.get(["/me", "/api/me"], authenticate, (req, res) => {
    res.json({
      username: req.user.username,
      email: req.user.email || "",
    });
  });

  app.post(
    ["/chat", "/api/chat"],
    asyncHandler(async (req, res) => {
      const message = sanitizeAiText(req.body.message);
      const language = sanitizeAiText(req.body.language || "programming").slice(
        0,
        80,
      );

      if (!message) {
        return res.status(400).send("Message is required.");
      }

      const prompt = `
You are an expert AI programming tutor for an e-learning platform.
The student is currently learning ${language}.
Keep the answer practical, beginner-friendly, and concise.
Avoid unsafe code, credential exposure, and unrelated topics.

Student question:
${message}
`;

      const text = await ai.generate(prompt);
      return res.send(text);
    }),
  );

  app.post(
    ["/run-code", "/api/run-code"],
    asyncHandler(async (req, res) => {
      const language = sanitizeAiText(req.body.language).slice(0, 40);
      const code = String(req.body.code || "");

      if (!language || !code.trim()) {
        return res.status(400).send("Language and code are required.");
      }

      const result = await executeCode({
        language,
        code,
        timeoutMs: codeTimeoutMs,
        maxCodeBytes,
      });

      return res.status(result.ok ? 200 : 400).send(result.output);
    }),
  );

  app.post(
    ["/explain", "/api/explain"],
    asyncHandler(async (req, res) => {
      const code = sanitizeAiText(req.body.code);
      const language = sanitizeAiText(req.body.language).slice(0, 40);

      if (!code || !language) {
        return res.status(400).send("Code and language are required.");
      }

      const prompt = `
You are an expert coding tutor.
Explain this ${language} code clearly for beginners.

Use these sections:
1. Purpose
2. Step-by-step behavior
3. Key concepts
4. Expected output

Code:
${code}
`;

      try {
        const text = await ai.generate(prompt);
        return res.send(text);
      } catch (err) {
        console.error("AI generate error for /explain; using fallback.", err && err.message);
        return res.send(fallbackExplain(code, language));
      }
    }),
  );

  app.post(
    ["/fix", "/api/fix"],
    asyncHandler(async (req, res) => {
      const code = sanitizeAiText(req.body.code);
      const language = sanitizeAiText(req.body.language).slice(0, 40);

      if (!code || !language) {
        return res.status(400).send("Code and language are required.");
      }

      const prompt = `
You are an expert debugging assistant.
Fix all bugs in this ${language} code.

Rules:
- Return only corrected source code
- Do not include markdown fences
- Preserve the user's intent
- Make the code runnable where possible

Code:
${code}
`;

      try {
        const text = await ai.generate(prompt);
        return res.send(stripCodeFence(text));
      } catch (err) {
        console.error("AI generate error for /fix; using fallback.", err && err.message);
        return res.send(fallbackFix(code, language));
      }
    }),
  );

  app.use((req, res) => {
    res.status(404).send("Route not found.");
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    const statusCode =
      error.statusCode ||
      (error.message && error.message.startsWith("CORS") ? 403 : 500);
    if (statusCode >= 500) {
      console.error(error);
    }

    return res.status(statusCode).send(error.message || "Server error.");
  });

  return app;
}

function startServer() {
  const app = createApp();
  let port = app.get("port");

  function attemptListen(attemptPort) {
    return new Promise((resolve) => {
      const server = http.createServer(app);

      const onError = (error) => {
        if (error.code === "EADDRINUSE") {
          console.log(
            `Port ${attemptPort} is in use. Trying port ${attemptPort + 1}...`,
          );
          attemptListen(attemptPort + 1).then(resolve);
        } else {
          console.error("Server error:", error);
          process.exit(1);
        }
      };

      const onListening = async () => {
        server.removeListener("error", onError);
        console.log(`Server running on http://localhost:${attemptPort}`);
        console.log(
          `Frontend available at http://localhost:${attemptPort}/app/index.html`,
        );
        await checkRuntimes();
        resolve(server);
      };

      server.on("error", onError);
      server.once("listening", onListening);
      server.listen(attemptPort);
    });
  }

  return attemptListen(port);
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  createToken,
  executeCode,
  hashPassword,
  startServer,
  verifyPassword,
  verifyToken,
};
