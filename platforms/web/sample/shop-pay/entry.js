const sdk =
  import.meta.env.MODE === "cdn"
    ? import(/* @vite-ignore */ `${import.meta.env.BASE_URL}shop-pay-cdn-loader.js`)
    : import("@shopify/checkout-kit/shop-pay");

await sdk;
await import("./main.ts");
