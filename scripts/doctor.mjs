import { spawnSync } from "node:child_process";
const checks = [
  ["Node", "node", ["--version"]],
  ["pnpm", "corepack", ["pnpm", "--version"]],
  ["Git", "git", ["--version"]],
  ["Rust", "rustc", ["--version"]],
  ["Cargo", "cargo", ["--version"]],
  ["Anchor", "anchor", ["--version"]],
  ["Solana", "solana", ["--version"]],
  ["Docker", "docker", ["version"]],
];
let failed = false;
for (const [name, command, args] of checks) {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 15000 });
  const ok = result.status === 0;
  console.log((ok ? "OK " : "FALTA ") + name + ": " + (result.stdout?.trim() || result.stderr?.trim() || result.error?.message));
  if (!ok) failed = true;
}
process.exitCode = failed ? 1 : 0;
