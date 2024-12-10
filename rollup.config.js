import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import typescript from "@rollup/plugin-typescript";

export default [
  {
    input: ["Extension/src/popup/index.tsx"],
    output: {
      sourcemap: true,
      file: "Extension/Resources/popup.js",
    },
    plugins: [
      typescript(),
      nodeResolve({ browser: true }),
      replace({
        "process.env.NODE_ENV": JSON.stringify("development"),
      }),
      commonjs(),
    ],
  },
  {
    input: ["Extension/src/background.ts"],
    output: {
      dir: "Extension/Resources",
    },
    plugins: [typescript(), nodeResolve()],
  },
  {
    input: "Extension/src/content.ts",
    output: {
      dir: "Extension/Resources",
      format: "iife",
    },
    plugins: [typescript(), nodeResolve()],
  },
];
