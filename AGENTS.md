## Repository layout

```
platforms/
  swift/         # iOS Swift Package and CocoaPods sources
  android/       # Android library and sample apps
  react-native/  # React Native wrapper
protocol/        # cross-platform communication layer based on UCP
e2e/             # cross-platform end-to-end tests
.github/         # workflows, issue templates, CODEOWNERS
```

## Dev workflow

> **AI agents:** All commands require the `shadowenv exec --` prefix to run inside the shadowenv-managed environment.
>
> ```
> shadowenv exec --dir <repo_root> -- /opt/dev/bin/dev up
> shadowenv exec --dir <repo_root> -- /opt/dev/bin/dev test [ARGS]
> ```

Run `dev` commands from the repo root. Use `dev up` before running commands when
the environment may not be provisioned.

For platform-scoped work, prefer the root `dev.yml` commands:

- Android: `dev android <command>`
- Swift: `dev swift <command>`
- React Native: `dev react-native <command>` or `dev rn <command>`

For protocol schema/model work, use `dev protocol <command>`.

For cross-platform changes, use the repo-wide aggregates: `dev lint`,
`dev test`, `dev check`, `dev format`, and `dev build`. Use
`dev <platform> format` for formatting; `fix` remains an alias for existing
workflows.
