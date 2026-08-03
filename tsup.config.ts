import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    // clean 交给外层 `rimraf dist` 统一做一次: 两份 config 并行构建,
    // 各自 clean:true 会互相竞态删掉对方刚写好的产物
    clean: false,
  },
  {
    entry: { 'react/index': 'src/react/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: false,
    external: ['react', 'react-dom'],
    // React 子入口全走客户端组件, 打包时在产物首行补回 'use client'
    // (esbuild 不认识这个指令, 会当普通字符串字面量丢弃, 需要用 banner 补)
    banner: { js: "'use client';" },
  },
  {
    entry: { 'react/primitives/index': 'src/react/primitives/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: false,
    external: ['react', 'react-dom'],
  },
]);
