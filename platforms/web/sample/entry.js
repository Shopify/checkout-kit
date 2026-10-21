// CDN mode loads this public file verbatim, preserving its static CDN import.
// `BASE_URL` also keeps the loader correct when the playground is hosted below
// the domain root. Start the app only after the selected SDK has registered the
// custom element; CDN failures intentionally reject before `main.ts` runs.
const sdk =
  import.meta.env.MODE === "cdn"
    ? import(/* @vite-ignore */ `${import.meta.env.BASE_URL}checkout-kit-cdn-loader.js`)
    : import("./local.ts");

await sdk;
await import("./main.ts");
