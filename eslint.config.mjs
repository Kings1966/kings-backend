import globals from "globals";
import pluginJs from "@eslint/js";
// If you want more specific Jest linting rules beyond just recognizing globals,
// you can install eslint-plugin-jest:
// npm install --save-dev eslint-plugin-jest
// Then uncomment the next line:
// import pluginJest from "eslint-plugin-jest";
export default [
  {
    // Global ignores
    ignores: [
      "node_modules/",
      "dist/",
      ".git/",
      "eslint.config.mjs", // Good practice to ignore the ESLint config itself from general linting
    ],
  },
  // Apply recommended JavaScript rules globally after ignores
  pluginJs.configs.recommended,

  // Base configuration for all JavaScript files (including tests)
  // This ensures CommonJS and Node globals are recognized everywhere.
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"], // Apply to all JS-like files
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs", // This tells ESLint your server uses require/module.exports
      globals: {
        ...globals.node, // Defines Node.js global variables like 'process', 'require', 'module'
      },
    },
    rules: {
      "no-unused-vars": ["error", {
        "vars": "all", // Default: check all variables
        "args": "after-used", // Default: check all args except the last used
        "ignoreRestSiblings": true, // Default: don't warn for unused vars if rest siblings are used
        "varsIgnorePattern": "^_", // Ignore variables prefixed with _
        "argsIgnorePattern": "^_", // Ignore arguments prefixed with _
        "caughtErrors": "all", // Check caught errors in try-catch blocks
        "caughtErrorsIgnorePattern": "^_" // Ignore caught errors prefixed with _
      }]
    }
    // If you had pluginJs.configs.recommended.rules here, remove them if pluginJs.configs.recommended is standalone
  },

  // Configuration specifically for your test files
  // This adds Jest globals on top of the Node globals already defined.
  {
    // IMPORTANT: If your test directory is named `__tests__`, change `_tests_` to `__tests__` below.
    files: ["_tests_/**/*.js", "**/*.test.js", "_tests_/setup.js"], // Explicitly include setup.js
    languageOptions: {
      // sourceType: "commonjs" and globals.node are inherited from the block above.
      // We only need to add Jest globals here.
      globals: {
        // Spreading globals.node again is fine, or you can rely on inheritance.
        // Being explicit can sometimes be safer if inheritance behavior is unclear.
        ...globals.node,
        ...globals.jest, // Defines Jest global variables like 'describe', 'it', 'expect'
      },
    },
    // Explicitly define the no-unused-vars rule for test files to ensure it applies
    // with the desired underscore-prefix ignore patterns.
    rules: {
      "no-unused-vars": ["error", {
        "vars": "all",
        "args": "after-used",
        "ignoreRestSiblings": true,
        "varsIgnorePattern": "^_",
        "argsIgnorePattern": "^_", // For any underscore-prefixed args in tests
        "caughtErrors": "all",     // To check caught errors
        "caughtErrorsIgnorePattern": "^_" // To ignore underscore-prefixed caught errors like _err
      }]
    },
    // If using eslint-plugin-jest, you would configure it here:
    // plugins: { jest: pluginJest },
    // rules: { ...pluginJest.configs.recommended.rules },
  },
];