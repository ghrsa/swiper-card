module.exports = {
  extends: 'love',
  parserOptions: {
    project: './tsconfig.json'
  },
  rules: {
    '@typescript-eslint/strict-boolean-expressions': 'off',
    '@typescript-eslint/class-literal-property-style': 'off', // typescript enforces overridden properties to be declared as accessors
    //'@typescript-eslint/no-redeclare': ['error', { ignoreDeclarationMerge: true }], // lexical redeclaration checked by compiler, this rule also flags things like Storage...
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
    'no-multi-spaces': 'warn',
    indent: ['warn', 4, { SwitchCase: 1 }],
    '@typescript-eslint/indent': ['error', 4],
    'multiline-ternary': ['error', 'always-multiline'],
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        args: 'none'
      }
    ],
    'max-len': [
      'warn',
      {
        code: 180,
        ignoreComments: true,
        ignoreUrls: true
      }
    ],
  }
}
