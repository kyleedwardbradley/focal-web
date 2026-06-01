import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ── Structural boundary guard ──────────────────────────────────────────────
  // The pure domain layer (src/core) must never depend on the rendering layer
  // or the DOM. This is enforced in CI, not by convention: a core/ file that
  // imports `three` or touches `document`/`window` fails the lint step.
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'three', message: 'core/ must stay pure — no Three.js in the domain layer.' },
          ],
          patterns: [
            { group: ['three', 'three/*'], message: 'core/ must stay pure — no Three.js in the domain layer.' },
            { group: ['../render/*', '../ui/*', '../state/*'], message: 'core/ must not depend on outer layers.' },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'document', message: 'core/ must stay pure — no DOM access.' },
        { name: 'window', message: 'core/ must stay pure — no DOM access.' },
      ],
    },
  },
);
