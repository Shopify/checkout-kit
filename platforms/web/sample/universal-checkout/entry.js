const sdk =
  import.meta.env.MODE === "cdn"
    ? import(/* @vite-ignore */ `${import.meta.env.BASE_URL}universal-checkout-cdn-loader.js`)
    : import("@shopify/checkout-kit/shopify-universal-checkout");

await sdk;
await import("./main.ts");
