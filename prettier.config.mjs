/** @type {import("prettier").Config} */
const config = {
  singleQuote: true,
  trailingComma: 'es5',
  overrides: [
    {
      files: '*.md',
      options: {
        tabWidth: 4,
      },
    },
  ],
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindFunctions: ['cx', 'cva', 'tw'],
};

export default config;
