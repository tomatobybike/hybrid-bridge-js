import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default [
  {
    input: 'src/bridge.mjs',
    output: [
      {
        file: 'dist/bridge.js',
        format: 'umd',
        name: 'JSBridge',
        sourcemap: true
      },
      {
        file: 'dist/bridge.esm.js',
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [
      resolve(),
      commonjs(),
      terser()
    ]
  }
];