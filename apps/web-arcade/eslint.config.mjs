import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/**",
      "scripts/**",
    ],
  },
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
