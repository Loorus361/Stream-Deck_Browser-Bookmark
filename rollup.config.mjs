import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/plugin.ts",
  output: {
    file: "com.carlosanderssohn.bookmark-slots.sdPlugin/bin/plugin.js",
    format: "esm",
    sourcemap: true
  },
  plugins: [
    nodeResolve({
      exportConditions: ["node"],
      preferBuiltins: true
    }),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json"
    })
  ],
  external: [
    "child_process",
    "fs",
    "fs/promises",
    "node:child_process",
    "node:fs",
    "node:fs/promises",
    "node:os",
    "node:path"
  ]
};
