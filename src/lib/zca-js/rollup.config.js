import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: [
    {
      dir: 'dist',
      format: 'es',
      entryFileNames: '[name].js',
      chunkFileNames: '[name]-[hash].js'
    },
    {
      dir: 'dist/cjs',
      format: 'cjs',
      entryFileNames: '[name].cjs',
      chunkFileNames: '[name]-[hash].cjs'
    }
  ],
  plugins: [
    typescript({
      tsconfig: './tsconfig.json'
    })
  ],
  external: [
    'crypto-js',
    'form-data',
    'json-bigint',
    'pako',
    'semver',
    'sharp',
    'spark-md5',
    'tough-cookie',
    'ws'
  ]
};