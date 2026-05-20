# Sample Project

This directory contains sample projects that implement the `ShopifyCheckoutKit`
library.

The sample apps read generated `Storefront.xcconfig` files. From the repo root,
run `dev up` to provision the repo and create or sync them from the shared
`.env`. If the repo is already provisioned, `dev swift setup` or `dev swift up`
refreshes Swift sample setup directly.

---

## MobileBuyIntegration

This project demonstrates how to use the [Mobile Buy SDK](https://github.com/Shopify/mobile-buy-sdk-ios) in conjunction with the `ShopifyCheckoutKit` library.

### Getting Started

1. Create or sync the shared configuration from the repo root:

```sh
dev up
```

2. If the repo is already provisioned and you only need Swift setup, run
`dev swift setup`.
3. If you are not using `dev`, copy the repo-root `.env.example` to `.env`,
fill in local values, then run `scripts/setup_storefront_env`.
4. Build & run — entitlements are auto-generated via a build PreAction (no manual script step needed).

### Troubleshooting

If the build PreAction fails, Xcode will show **"exited with status code 1"**. Click that line to open the build log — the script output at the bottom will indicate the issue.

| Build Log Output | Cause | Fix |
|------------------|-------|-----|
| `grep: Storefront.xcconfig: No such file or directory` | `Storefront.xcconfig` file is missing | Run `dev swift setup` from the repo root |
| `Error: STOREFRONT_DOMAIN is not set in Storefront.xcconfig` | `Storefront.xcconfig` exists but `STOREFRONT_DOMAIN` is blank | Update root `.env`, then run `dev storefront-env sync` |
| Associated domains not working at runtime | Domain value is incorrect | Update root `.env`, then run `dev storefront-env sync` |

---

## ShopifyAcceleratedCheckoutsApp

This project demonstrates integrating Shopify's Accelerated Checkouts, an all in one solution to accelerated checkouts via Apple Pay and Shop Pay. 

To get started:

1. Create or sync the shared configuration from the repo root:

```sh
dev up
```

2. If the repo is already provisioned and you only need Swift setup, run
`dev swift setup`.
3. If you are not using `dev`, copy the repo-root `.env.example` to `.env`,
fill in local values, then run `scripts/setup_storefront_env`.
