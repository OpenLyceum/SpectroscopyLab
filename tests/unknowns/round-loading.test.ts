import { beforeEach, expect, it, vi } from "vitest";
import { loadMolecule } from "../../src/common/model/library/SpectroscopyLibrary.js";
import type { Molecule } from "../../src/common/model/Molecule.js";
import { UnknownsModel } from "../../src/unknowns/model/UnknownsModel.js";

vi.mock(import("../../src/common/model/library/SpectroscopyLibrary.js"), async (original) => {
  const library = await original();
  return { ...library, loadMolecule: vi.fn(library.loadMolecule) };
});

const library = await vi.importActual<typeof import("../../src/common/model/library/SpectroscopyLibrary.js")>(
  "../../src/common/model/library/SpectroscopyLibrary.js",
);
type Request = { id: string; resolve: (molecule: Molecule) => void; reject: (error: Error) => void };
let requests: Request[];

beforeEach(() => {
  requests = [];
  vi.mocked(loadMolecule).mockImplementation(
    (id) => new Promise((resolve, reject) => requests.push({ id, resolve, reject })),
  );
});

async function complete(request: Request): Promise<void> {
  request.resolve(await library.loadMolecule(request.id));
  // Settle the buildUnknown/loadUnknown continuation, without advancing a timer.
  await Promise.resolve();
  await Promise.resolve();
}

it("rejects an old answer as soon as New unknown is requested", async () => {
  const model = new UnknownsModel();
  try {
    await complete(requests[0]!);
    await vi.waitFor(() => expect(model.unknownProperty.value).not.toBeNull());
    const oldId = model.unknownProperty.value!.target.id;
    model.newUnknown();
    expect(model.isLoadingProperty.value).toBe(true);
    model.guess(oldId);
    expect(model.scoreProperty.value).toBe(0);
    expect(model.roundsProperty.value).toBe(0);
    expect(model.unknownProperty.value).toBeNull();
    await complete(requests[1]!);
    await vi.waitFor(() => expect(model.unknownProperty.value).not.toBeNull());
    expect(model.isLoadingProperty.value).toBe(false);
    model.guess(model.unknownProperty.value!.target.id);
    expect(model.scoreProperty.value).toBe(1);
    expect(model.roundsProperty.value).toBe(1);
  } finally {
    model.dispose();
  }
});

it("does not accept the preceding question while a new level is loading", async () => {
  const model = new UnknownsModel();
  try {
    await complete(requests[0]!);
    await vi.waitFor(() => expect(model.unknownProperty.value).not.toBeNull());
    const oldId = model.unknownProperty.value!.target.id;
    model.levelProperty.value = 3;
    model.guess(oldId);
    expect(model.scoreProperty.value).toBe(0);
    expect(model.roundsProperty.value).toBe(0);
    await complete(requests[1]!);
    await vi.waitFor(() => expect(model.unknownProperty.value?.candidates).toContain("o-xylene"));
    expect(model.scoreProperty.value).toBe(0);
  } finally {
    model.dispose();
  }
});

it("Reset invalidates a pending round and ignores its late success", async () => {
  const model = new UnknownsModel();
  try {
    await complete(requests[0]!);
    await vi.waitFor(() => expect(model.unknownProperty.value).not.toBeNull());
    const oldId = model.unknownProperty.value!.target.id;
    model.levelProperty.value = 3;
    model.reset();
    model.guess(oldId);
    expect(model.scoreProperty.value).toBe(0);
    expect(model.roundsProperty.value).toBe(0);
    await complete(requests[1]!);
    expect(model.unknownProperty.value).toBeNull();
    expect(model.isLoadingProperty.value).toBe(true);
    await complete(requests[2]!);
    await vi.waitFor(() => expect(model.unknownProperty.value).not.toBeNull());
    expect(model.levelProperty.value).toBe(1);
    expect(model.unknownProperty.value!.candidates).not.toContain("o-xylene");
  } finally {
    model.dispose();
  }
});

it("keeps the latest request pending after an obsolete failure, and allows retry after a current failure", async () => {
  const model = new UnknownsModel();
  try {
    model.newUnknown();
    requests[0]!.reject(new Error("obsolete request"));
    await Promise.resolve();
    await Promise.resolve();
    expect(model.loadErrorProperty.value).toBe(false);
    expect(model.isLoadingProperty.value).toBe(true);
    requests[1]!.reject(new Error("current request"));
    await vi.waitFor(() => expect(model.loadErrorProperty.value).toBe(true));
    expect(model.isLoadingProperty.value).toBe(false);
    expect(model.unknownProperty.value).toBeNull();
    model.newUnknown();
    expect(model.loadErrorProperty.value).toBe(false);
    await complete(requests[2]!);
    await vi.waitFor(() => expect(model.unknownProperty.value).not.toBeNull());
    expect(model.loadErrorProperty.value).toBe(false);
    expect(model.isLoadingProperty.value).toBe(false);
  } finally {
    model.dispose();
  }
});
