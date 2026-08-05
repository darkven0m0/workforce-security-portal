import {
  mkdir
} from "node:fs/promises";

import {
  build
} from "esbuild";

await mkdir(
  "web/vendor",
  {
    recursive: true
  }
);

await build({
  entryPoints: [
    "node_modules/@azure/msal-browser/dist/index.mjs"
  ],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  outfile: "web/vendor/msal-browser.js",
  sourcemap: false,
  minify: false,
  legalComments: "inline"
});

await build({
  entryPoints: [
    "node_modules/@azure/msal-browser/dist/redirect_bridge/index.mjs"
  ],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  outfile: "web/vendor/msal-redirect-bridge.js",
  sourcemap: false,
  minify: false,
  legalComments: "inline"
});

console.log(
  "Built MSAL browser and redirect bridge bundles."
);
