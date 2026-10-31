import { expect, type Page, test } from "@playwright/test";
import type { ChartTransform } from "scenerystack/bamboo";
import type { localeProperty } from "scenerystack/joist";
import type { Node, Text } from "scenerystack/scenery";
import type { ScreenView } from "scenerystack/sim";
import type { InfraredModel } from "../../src/infrared/model/InfraredModel.js";
import type { NMRModel } from "../../src/nmr/model/NMRModel.js";
import type { UnknownsModel } from "../../src/unknowns/model/UnknownsModel.js";
import type { UVVisModel } from "../../src/uv-vis/model/UVVisModel.js";

type Model = InfraredModel | NMRModel | UnknownsModel | UVVisModel;
type SimulationWindow = {
  reviewAnnouncements?: string[];
  phet: {
    joist: {
      localeProperty: typeof localeProperty;
      sim: { selectedScreenProperty: { value: { model: Model; view: ScreenView } } };
    };
  };
};

async function ready(page: Page, screen: number) {
  await page.goto(`/?screens=${screen}&ea`);
  await page.getByRole("button", { name: "Reset All", exact: true }).waitFor();
  await page.waitForFunction(() => {
    const model = (window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value.model;
    return "viewer" in model ? !!model.viewer.molecule : !!model.unknownProperty.value;
  });
}

function sceneTexts(page: Page) {
  return page.evaluate(() => {
    const texts: string[] = [];
    const visit = (node: Node) => {
      if (!node.visible) {
        return;
      }
      if (node.constructor.name === "Text") {
        texts.push((node as Text).string);
      }
      node.children.forEach(visit);
    };
    visit((window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value.view);
    return texts;
  });
}

function chartPoints(page: Page, readonly: boolean) {
  return page.evaluate((nonFocusable) => {
    const points: { x: number; y: number }[] = [];
    const visit = (node: Node) => {
      if (!node.visible) {
        return;
      }
      if (node.constructor.name === "SpectrumChartNode" && node.focusable !== nonFocusable) {
        const background = node.children.find((child) => child.constructor.name === "ChartRectangle")!;
        const point = background.localToGlobalPoint(background.localBounds.center);
        points.push({ x: point.x, y: point.y });
      }
      node.children.forEach(visit);
    };
    visit((window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value.view);
    return points;
  }, readonly);
}

for (const screen of [2, 3, 4]) {
  test(`screen ${screen} read-only charts accept clicks without requesting focus`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await ready(page, screen);
    const points = await chartPoints(page, true);
    expect(points.length).toBeGreaterThan(0);
    for (const point of points) {
      await page.mouse.click(point.x, point.y);
    }
    if (screen === 3) {
      await page.getByRole("checkbox", { name: "Beer–Lambert (absolute absorbance)", exact: true }).press("Space");
      const calibration = (await chartPoints(page, true)).at(-1)!;
      await page.mouse.click(calibration.x, calibration.y);
      const fraction = await page.evaluate(
        () =>
          ((window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value.model as UVVisModel)
            .concentrationFractionProperty.value,
      );
      expect(fraction).toBeCloseTo(0.5, 6);
    }
    expect(errors).toEqual([]);
  });
}

test("an interactive IR chart still takes focus and supports peak keys", async ({ page }) => {
  await ready(page, 1);
  const point = (await chartPoints(page, false))[0]!;
  await page.mouse.click(point.x, point.y);
  await expect(page.getByText("Infrared spectrum", { exact: true }).first()).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  expect(
    await page.evaluate(
      () =>
        ((window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value.model as InfraredModel)
          .selectedPeakProperty.value,
    ),
  ).not.toBeNull();
});

for (const { molecule, hydrogens } of [
  { molecule: "ethanol", hydrogens: 3 },
  { molecule: "methane", hydrogens: 4 },
]) {
  test(`${molecule} carbon chart windows follow the sampled multiplet at both field limits`, async ({ page }) => {
    await ready(page, 2);
    if (molecule !== "ethanol") {
      await page.evaluate((id) => {
        (
          (window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value.model as NMRModel
        ).chooser.select(id);
      }, molecule);
      await page.waitForFunction(
        (id) =>
          ((window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value.model as NMRModel).viewer
            .molecule?.id === id,
        molecule,
      );
    }
    await page.getByRole("radio", { name: "¹³C", exact: true }).press("Space");
    await page.getByRole("button", { name: /Spectrum/ }).press("Enter");
    await page.getByRole("option", { name: "¹H-coupled", exact: true }).press("Enter");
    await page.getByRole("button", { name: molecule === "ethanol" ? /δ 16\.8/ : /δ .*2\.3/ }).press("Enter");
    for (const key of ["Home", "End"]) {
      await page.getByRole("slider").first().focus();
      await page.keyboard.press(key);
      const result = await page.evaluate(() => {
        const screen = (window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value;
        const model = screen.model as NMRModel;
        const charts: { min: number; max: number }[] = [];
        const visit = (node: Node) => {
          if (!node.visible) {
            return;
          }
          if (node.constructor.name === "SpectrumChartNode") {
            const background = node.children.find((child) => child.constructor.name === "ChartRectangle")!;
            // Inspect the actual bamboo transform used by the painted chart.
            const transform = (background as unknown as { chartTransform: ChartTransform }).chartTransform;
            charts.push({ min: transform.modelXRange.min, max: transform.modelXRange.max });
          }
          node.children.forEach(visit);
        };
        visit(screen.view);
        return {
          field: model.fieldProperty.value,
          center: model.selectedSignal!.shift,
          lines: model.carbonLinesProperty.value.filter(
            (line) => line.environment === model.selectedSignalProperty.value,
          ),
          full: [model.carbonSpectrumProperty.value.x[0], model.carbonSpectrumProperty.value.x.at(-1)],
          zoom: [model.carbonZoomProperty.value.x[0], model.carbonZoomProperty.value.x.at(-1)],
          charts,
        };
      });
      expect(result.field).toBe(key === "Home" ? 60 : 600);
      expect(result.lines).toHaveLength(hydrogens + 1);
      expect(result.charts).toHaveLength(2);
      expect(result.charts[0]!.min).toBeCloseTo(result.full[0]!, 9);
      expect(result.charts[0]!.max).toBeCloseTo(result.full[1]!, 9);
      expect(result.charts[1]!.min).toBeCloseTo(result.zoom[0]!, 9);
      expect(result.charts[1]!.max).toBeCloseTo(result.zoom[1]!, 9);
      for (const line of result.lines) {
        expect(line.position).toBeGreaterThan(result.full[0]!);
        expect(line.position).toBeLessThan(result.full[1]!);
        expect(line.position - result.center).toBeGreaterThan(result.zoom[0]!);
        expect(line.position - result.center).toBeLessThan(result.zoom[1]!);
      }
    }
  });
}

test("a pending level/New unknown request removes obsolete answers and preserves scoring", async ({ page }) => {
  await ready(page, 4);
  const previous = await page.evaluate(
    () =>
      ((window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value.model as UnknownsModel)
        .unknownProperty.value!.target.id,
  );
  let release!: () => void;
  let requested!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const seen = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route("**/library/data/*.json*", async (route) => {
    requested();
    await held;
    await route.continue();
  });
  try {
    await page.getByRole("radio", { name: "3", exact: true }).press("Space");
    await seen;
    await page.getByRole("button", { name: "New unknown", exact: true }).press("Enter");
    expect(await sceneTexts(page)).toContain("Loading the next unknown…");
    const state = await page.evaluate((oldId) => {
      const model = (window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value
        .model as UnknownsModel;
      model.guess(oldId);
      return {
        pending: model.isLoadingProperty.value,
        target: model.unknownProperty.value,
        score: model.scoreProperty.value,
        rounds: model.roundsProperty.value,
      };
    }, previous);
    expect(state).toEqual({ pending: true, target: null, score: 0, rounds: 0 });
    expect(
      (await page.getByRole("button").allTextContents()).filter((name) => /ethanol|propanol|ether/.test(name)),
    ).toEqual([]);
  } finally {
    release();
  }
  await page.waitForFunction(() => {
    const model = (window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value
      .model as UnknownsModel;
    return !model.isLoadingProperty.value && !!model.unknownProperty.value;
  });
  const target = await page.evaluate(async (path) => {
    const { moleculeName } = (await import(path)) as typeof import("../../src/nmr/view/NMRScreenView.js");
    const model = (window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value
      .model as UnknownsModel;
    return moleculeName(model.unknownProperty.value!.target.id);
  }, "/src/nmr/view/NMRScreenView.ts");
  await page.getByRole("button", { name: target, exact: true }).press("Enter");
  expect(await sceneTexts(page)).toContain("Score: 1 / 1");
});

const languages = [
  {
    locale: "en",
    names: ["ethylbenzene", "o-xylene", "m-xylene", "p-xylene"],
    unsaturation: "Degree of unsaturation: 4",
    correct: "Correct — ",
  },
  {
    locale: "es",
    names: ["etilbenceno", "o-xileno", "m-xileno", "p-xileno"],
    unsaturation: "Grado de insaturación: 4",
    correct: "Correcto: ",
  },
  {
    locale: "fr",
    names: ["éthylbenzène", "o-xylène", "m-xylène", "p-xylène"],
    unsaturation: "Degré d'insaturation : 4",
    correct: "Exact — ",
  },
] as const;

test("Unknowns language switches update candidate names and clues while preserving answers and score", async ({
  page,
}) => {
  await ready(page, 4);
  await page.getByRole("radio", { name: "3", exact: true }).press("Space");
  await page.waitForFunction(() => {
    const model = (window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value
      .model as UnknownsModel;
    return !model.isLoadingProperty.value && !!model.unknownProperty.value?.candidates.includes("o-xylene");
  });
  const id = await page.evaluate(() => {
    const model = (window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value
      .model as UnknownsModel;
    return model.unknownProperty.value!.target.id;
  });
  const index = ["ethylbenzene", "o-xylene", "m-xylene", "p-xylene"].indexOf(id);
  const wrong = (index + 1) % 4;
  const otherWrong = (index + 2) % 4;
  await page.evaluate(() => {
    const state = window as unknown as SimulationWindow;
    state.reviewAnnouncements = [];
    const visit = (node: Node) => {
      if (node.constructor.name === "VBox") {
        const original = node.addAccessibleResponse.bind(node);
        node.addAccessibleResponse = (...args: Parameters<Node["addAccessibleResponse"]>) => {
          if (typeof args[0] === "string") {
            state.reviewAnnouncements!.push(args[0]);
          }
          return original(...args);
        };
      }
      node.children.forEach(visit);
    };
    visit(state.phet.joist.sim.selectedScreenProperty.value.view);
  });
  for (const [step, language] of [languages[0], languages[1], languages[2], languages[0]].entries()) {
    await page.evaluate((locale) => {
      (window as unknown as SimulationWindow).phet.joist.localeProperty.value = locale;
    }, language.locale);
    for (const name of language.names) {
      await expect(page.getByRole("button", { name, exact: true })).toHaveCount(1);
    }
    await expect.poll(() => sceneTexts(page)).toContain(language.unsaturation);
    if (step === 1) {
      await page.getByRole("button", { name: language.names[wrong]!, exact: true }).press("Enter");
      await page.getByRole("button", { name: language.names[otherWrong]!, exact: true }).press("Enter");
    }
    if (step === 2) {
      await expect(page.getByRole("button", { name: language.names[wrong]!, exact: true })).toBeDisabled();
      await page.getByRole("button", { name: language.names[index]!, exact: true }).press("Enter");
    }
    if (step === 3) {
      for (const name of language.names) {
        await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
      }
      expect(await sceneTexts(page)).toContain(`${language.correct}${language.names[index]}.`);
    }
    const announcements = await page.evaluate(() => (window as unknown as SimulationWindow).reviewAnnouncements!);
    expect(announcements).toHaveLength(step === 0 ? 0 : step === 1 ? 2 : 3);
    if (step >= 1) {
      expect(announcements[0]).toContain(languages[1].names[wrong]);
      expect(announcements[1]).toContain(languages[1].names[otherWrong]);
    }
    const state = await page.evaluate(() => {
      const model = (window as unknown as SimulationWindow).phet.joist.sim.selectedScreenProperty.value
        .model as UnknownsModel;
      return {
        id: model.unknownProperty.value!.target.id,
        score: model.scoreProperty.value,
        rounds: model.roundsProperty.value,
      };
    });
    expect(state).toEqual({ id, score: 0, rounds: step >= 2 ? 1 : 0 });
  }
});
