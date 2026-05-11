import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Council worktrees — each contains its own `.next/` build output and a
    // full copy of `src/` that's redundant with the main tree. ESLint must
    // never traverse them. Without this, husky pre-commit drowns in 60k+
    // errors from compiled output inside the worktrees.
    ".claude/worktrees/**",
  ]),
  {
    rules: {
      // Allow intentionally-unused identifiers when prefixed with underscore —
      // the convention that signals "I'm keeping this in the signature but not
      // using it." Used heavily in test mocks and fake implementations across
      // the codebase (e.g., `(_a, _b) => ...`).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
