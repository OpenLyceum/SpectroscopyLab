import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const PROJECT_ROOT = process.cwd();
const TSX_IMPORT = import.meta.resolve("tsx");
const FIXTURE_ENTRIES = [
  "AGENTS.md",
  "README.md",
  "doc",
  "index.html",
  "package-lock.json",
  "package.json",
  "scripts",
  "src",
  "tests/setup.ts",
  "vite.config.ts",
] as const;

const fixtureRoots: string[] = [];

function createFixture(): string {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "scenerystack-generators-"));
  const fixture = join(fixtureRoot, "repo");
  mkdirSync(fixture);
  fixtureRoots.push(fixtureRoot);

  for (const entry of FIXTURE_ENTRIES) {
    const source = join(PROJECT_ROOT, entry);
    const destination = join(fixture, entry);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(source, destination, { recursive: true });
  }
  return fixture;
}

function runScript(fixture: string, script: string, args: string[]) {
  return spawnSync(process.execPath, ["--import", TSX_IMPORT, join(fixture, "scripts", script), ...args], {
    cwd: fixture,
    encoding: "utf8",
  });
}

function expectSuccess(result: ReturnType<typeof runScript>): void {
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
}

function walkFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

afterEach(() => {
  for (const fixtureRoot of fixtureRoots.splice(0)) {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

describe("template generators", () => {
  it("sanitizes punctuation when deriving the simulation prefix", () => {
    const fixture = createFixture();

    expectSuccess(runScript(fixture, "rename-sim.ts", ["--id", "faradays-law", "--name", "Faraday's Law"]));
    expectSuccess(runScript(fixture, "scaffold-screens.ts", []));

    expect(existsSync(join(fixture, "src", "FaradaysLawColors.ts"))).toBe(true);
    for (const path of walkFiles(join(fixture, "src")).filter((file) => file.endsWith(".ts"))) {
      expect(basename(path)).not.toContain("'");
      expect(readFileSync(path, "utf8"), relative(fixture, path)).not.toContain("Faraday'sLaw");
    }
  });

  it("removes every template Sim-prefixed identifier after rename and scaffold", () => {
    const fixture = createFixture();

    expectSuccess(runScript(fixture, "rename-sim.ts", ["--id", "wave-lab", "--name", "Wave Lab"]));
    expectSuccess(runScript(fixture, "scaffold-screens.ts", ["--screens", "Intro,Lab"]));

    for (const path of walkFiles(join(fixture, "src"))) {
      expect(relative(fixture, path), relative(fixture, path)).not.toMatch(/\bSim[A-Z_]|\bSIM_[A-Z_]/);
      if (path.endsWith(".ts")) {
        expect(readFileSync(path, "utf8"), relative(fixture, path)).not.toMatch(/\bSim[A-Z_]|\bSIM_[A-Z_]/);
      }
    }

    const introView = readFileSync(join(fixture, "src", "intro", "view", "IntroScreenView.ts"), "utf8");
    expect(introView).toContain("getScreenNames().introStringProperty");
    expect(introView).not.toContain('new Text("Intro"');
  });

  it("rejects an empty screen list before changing the prototype", () => {
    const fixture = createFixture();
    const result = runScript(fixture, "scaffold-screens.ts", ["--screens", ","]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("At least one screen must be specified.");
    expect(existsSync(join(fixture, "src", "sim-screen", "SimScreen.ts"))).toBe(true);
    expect(existsSync(join(fixture, "src", "common", "SimScreenIcons.ts"))).toBe(false);
  });
});
