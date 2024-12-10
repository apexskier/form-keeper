import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";

export default [
  {
    input: ["Extension/dst/popup/index.js"],
    output: {
      sourcemap: true,
      file: "Extension/Resources/popup.js",
    },
    plugins: [
      nodeResolve({ browser: true }),
      replace({
        "process.env.NODE_ENV": JSON.stringify("development"),
      }),
      commonjs(),
    ],
  },
  {
    input: ["Extension/dst/background.js"],
    output: {
      dir: "Extension/Resources",
    },
    plugins: [nodeResolve()],
  },
  {
    input: "Extension/dst/content.js",
    output: {
      dir: "Extension/Resources",
      format: "iife",
    },
    plugins: [nodeResolve()],
  },
];
