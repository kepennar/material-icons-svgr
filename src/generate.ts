import { readFile, writeFile } from "node:fs/promises";
import { transform } from "@svgr/core";
import materialIconData from "@material-icons/svg/data.json";
import esbuild from "esbuild";
import * as ts from "typescript";

const tsConfig = require("../tsconfig.json");

const iconVariants = [
  "baseline",
  "outline",
  "round",
  "sharp",
  "twotone",
] as const;

async function generate() {
  const icons = materialIconData.icons.map((icon) => icon.name);
  for (const icon of icons) {
    for (const variant of iconVariants) {
      const svgCode = await readFile(
        `node_modules/@material-icons/svg/svg/${icon}/${variant}.svg`,
        { encoding: "utf8" }
      );

      const tsCode = await transform(
        svgCode,
        {
          icon: true,
          typescript: true,
          svgProps: {
            fill: "currentColor",
            stroke: "transparent",
          },
        },
        { componentName: "Icon" }
      );

      const transformResult = await esbuild.transform(tsCode, {
        tsconfigRaw: tsConfig,
        loader: "tsx",
      });
      const tsDefinition = generateTyping(tsCode);

      await writeFile(`icons/${icon}-${variant}.jsx`, transformResult.code, {
        encoding: "utf8",
      });
      await writeFile(`icons/${icon}-${variant}.d.ts`, tsDefinition, {
        encoding: "utf8",
      });
    }
  }
}

function generateTyping(tsCode: string) {
  const tsOptions: ts.CompilerOptions = {
    declaration: true,
    emitDeclarationOnly: true,
  };

  let output = "";
  const compilerHost = ts.createCompilerHost(tsOptions);
  compilerHost.readFile = (_) => tsCode;
  compilerHost.writeFile = (_, contents) => (output = contents);

  const program = ts.createProgram({
    rootNames: ["foo"] as const,
    options: tsOptions,
    host: compilerHost,
  });
  const emit = program.emit();
  return output;
}

generate();
