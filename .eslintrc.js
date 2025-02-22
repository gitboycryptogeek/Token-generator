module.exports = {
    extends: [
      "react-app",
      "react-app/jest"
    ],
    rules: {
      "no-unused-vars": "warn",
      "react/jsx-no-undef": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "no-undef": ["error", { "typeof": true }]
    },
    "env": {
    "es2020": true
  }
  }