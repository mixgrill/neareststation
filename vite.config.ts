import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
//import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages のサブディレクトリ対策（アセットを ./ 参照にする）
  base: './',
  build: {
    // 出力先を dist から docs に変更
    outDir: 'docs',
    
    // ビルド時に docs フォルダ内を空にしてから出力する
    emptyOutDir: true,
  },
  plugins: [vue()
    // public/assetsはviteのpublicDirに設定されていて自動でコピーされる,
    // viteStaticCopy({
    //   targets: [
    //     {
    //       src: 'public/assets/out.rtbf', // コピー元
    //       dest: 'hoge/'                       // docs/ 配下に出力
    //     }
    //   ]
    // })
  ],
})
