export default [{
  ignores: ['node_modules/**', 'dist/**', '.astro/**', '.wrangler/**', '.qa/**', '.agents/**', '.codex/**', '.specify/**', 'claude-seo/**', 'beyondseo/**'],
}, {
  files: ['tools/**/*.mjs', 'workers/**/*.mjs', 'functions/**/*.js', '*.mjs'],
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    'no-debugger': 'error',
    'no-dupe-args': 'error',
    'no-dupe-keys': 'error',
    'no-duplicate-case': 'error',
    'no-unreachable': 'error',
    'no-unsafe-finally': 'error',
    'no-constant-binary-expression': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'valid-typeof': 'error',
  },
}];
