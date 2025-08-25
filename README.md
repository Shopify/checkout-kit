# Checkout Kit Monorepo

This monorepo contains the Shopify Checkout Kit libraries for multiple platforms.

## Structure

- `packages/android/` - Android Checkout Sheet Kit
- `packages/swift/` - Swift/iOS Checkout Sheet Kit  
- `packages/react-native/` - React Native Checkout Sheet Kit

## Repository Management

This monorepo was created using `git subtree` to preserve complete git history from the original repositories.

### Initial Setup (already completed)

```bash
# Add remotes for source repositories
git remote add android https://github.com/Shopify/checkout-sheet-kit-android.git
git remote add swift https://github.com/Shopify/checkout-sheet-kit-swift.git
git remote add react-native https://github.com/Shopify/checkout-sheet-kit-react-native.git

# Merge repositories with history preservation
git subtree add --prefix=packages/android android main
git subtree add --prefix=packages/swift swift main
git subtree add --prefix=packages/react-native react-native main
```

### Syncing Updates

To pull updates from the upstream repositories:

```bash
git subtree pull --prefix=packages/android android main
git subtree pull --prefix=packages/swift swift main
git subtree pull --prefix=packages/react-native react-native main
```

### Pushing Changes Back

To push changes back to upstream repositories:

```bash
git subtree push --prefix=packages/android android main
git subtree push --prefix=packages/swift swift main
git subtree push --prefix=packages/react-native react-native main
```
