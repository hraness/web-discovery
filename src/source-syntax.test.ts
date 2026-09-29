import { expect, test } from "bun:test";

const tsconfig = await Bun.file(new URL("../tsconfig.json", import.meta.url)).json() as {
  compilerOptions: Record<string, unknown>;
};

test("typechecks the published source with erasableSyntaxOnly", () => {
  expect(tsconfig.compilerOptions["erasableSyntaxOnly"]).toBe(true);
});
