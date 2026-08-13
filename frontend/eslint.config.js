/**
 * ESLint 9+ flat config입니다.
 * package.json의 `npm run lint`가 실제로 동작하도록 React/Vite 기본 규칙을 연결합니다.
 */

import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"

export default [
  {
    ignores: ["dist", "node_modules"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // 팀 프로젝트의 현재 React 패턴에 필요한 안정 규칙만 사용합니다.
      // React Compiler 실험 규칙은 빌드 요구사항이 아니므로 포함하지 않습니다.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
]
