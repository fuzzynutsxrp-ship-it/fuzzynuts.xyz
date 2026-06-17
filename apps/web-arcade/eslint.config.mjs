import { fixupConfigRules } from "@eslint/compat";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Strip react-hooks rules from eslint-config-next@16's recommended config.
// react-hooks@7 adds dynamically-generated rules (set-state-in-effect,
// refs-in-cleanup-effect, immutability) that flag pre-existing patterns.
// We keep the two classic rules at their original severity.
function filterReactHooksRules(configs) {
  return configs.map((cfg) => {
    if (!cfg.rules) return cfg;
    const filtered = {};
    for (const [key, val] of Object.entries(cfg.rules)) {
      if (
        key.startsWith("react-hooks/") &&
        key !== "react-hooks/rules-of-hooks" &&
        key !== "react-hooks/exhaustive-deps"
      ) {
        continue; // skip new react-hooks@7 strict rules
      }
      filtered[key] = val;
    }
    return { ...cfg, rules: filtered };
  });
}

// ESLint 10 removed the deprecated context.getFilename() API.
// eslint-plugin-react, jsx-a11y, and import still use it.
// fixupConfigRules wraps these plugins with compatibility shims.
const patchedCoreWebVitals = fixupConfigRules(nextCoreWebVitals);
const patchedTypescript = fixupConfigRules(nextTypescript);

const eslintConfig = [
  // Global ignores must come first (standalone ignores object = global in flat config)
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "public/**",
      "scripts/**",
      "e2e/**",
      "next-env.d.ts",
    ],
  },
  // Spread Next.js native flat configs, patched for ESLint 10 compat,
  // with react-hooks@7 strict rules filtered out
  ...filterReactHooksRules(patchedCoreWebVitals),
  ...filterReactHooksRules(patchedTypescript),
  // Project-specific rules
  {
    files: ["src/**/*.tsx", "src/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "Literal[value=/rgba\\(255,\\s*255,\\s*255/]",
          message:
            "Use CSS var tokens (--color-glass-border, --color-glass-border-strong, etc.) instead of hardcoded rgba(255,255,255,...). See globals.css :root.",
        },
        {
          selector: "TemplateLiteral[quasis.0.value.raw=/\\[#[0-9a-fA-F]{3,8}\\]/]",
          message:
            "Use Tailwind color tokens instead of arbitrary hex values [#...]. Check tailwind.config.ts for available tokens.",
        },
      ],
    },
  },
];

export default eslintConfig;
