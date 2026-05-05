import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.dirname(__dirname);
const extraArgs = process.argv.slice(2);
const nodeBin = process.execPath;
const ngBin = path.join(root, "node_modules", "@angular", "cli", "bin", "ng.js");

const children = [];
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => process.exit(code), 120);
}

function spawnChild(args) {
  const child = spawn(nodeBin, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    windowsHide: false,
  });

  children.push(child);
  child.on("exit", (code) => {
    if (!shuttingDown && code && code !== 0) {
      shutdown(code);
    }
  });

  return child;
}

spawnChild([path.join(root, "server.mjs")]);
spawnChild([ngBin, "serve", "--host", "127.0.0.1", "--port", "5173", "--proxy-config", "proxy.conf.json", ...extraArgs]);

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
