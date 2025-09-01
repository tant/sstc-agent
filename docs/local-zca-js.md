# Using Local ZCA-JS Library

## Overview

This project uses a local copy of the zca-js library instead of the npm package to avoid dependency conflicts and allow for customization.

## Directory Structure

```
src/
└── lib/
    └── zca-js/          # Local copy of zca-js library
        ├── src/         # Source code directory
        │   ├── apis/    # API implementations (kept for dependency resolution)
        │   ├── Errors/  # Error classes
        │   ├── models/  # Data models
        │   ├── context.ts
        │   ├── index.ts
        │   ├── update.ts
        │   ├── utils.ts
        │   └── zalo.ts
        ├── index.d.ts
        ├── index.js
        ├── package.json
        └── tsconfig.json
src/
└── mastra/
    └── channels/
        └── zalo/        # Zalo channel implementation using local zca-js
```

## Removed Files

The following files and directories have been removed as they are not needed for production:
- `examples/` - Example usage files
- `test/` - Test files
- Configuration files (`.gitignore`, `.npmignore`, `.prettierrc`, etc.)
- Documentation files (`README.md`, `LICENSE`, `CODE_OF_CONDUCT.md`, etc.)
- Build configuration files (`rollup.config.js`, `bun.lock`, etc.)

## Dependency Management

The local zca-js library has the following dependencies specified in `src/lib/zca-js/package.json`:

```json
"dependencies": {
  "crypto-js": "^4.2.0",
  "form-data": "^4.0.4",
  "json-bigint": "^1.0.0",
  "pako": "^2.1.0",
  "semver": "^7.6.3",
  "sharp": "^0.33.4",
  "spark-md5": "^3.0.2",
  "tough-cookie": "^5.0.0",
  "ws": "^8.18.0"
}
```

These dependencies have been added to the main project's `package.json` to ensure they are available.

## Updating the Local Library

To update the local zca-js library:

1. Pull the latest changes from the zca-js repository
2. Copy the updated files to `src/lib/zca-js/`
3. Update dependencies in the main `package.json` if needed
4. Run `pnpm install` to install any new dependencies

## Customization

Since we're using a local copy, you can customize the zca-js library directly:

1. Add logging for debugging purposes
2. Modify API behavior to better suit your needs
3. Fix bugs without waiting for upstream updates

## Benefits

1. **Dependency Conflict Resolution**: Avoids conflicts with other libraries that may require different versions of the same dependencies
2. **Performance**: No need to fetch from npm registry
3. **Customization**: Full control over the library's behavior
4. **Debugging**: Easier to debug and trace issues within the library
5. **Reduced Size**: Removed unnecessary files and directories