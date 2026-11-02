const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');

async function build() {
  console.log('🔨 Building React application with esbuild...');
  await esbuild.build({
    entryPoints: [path.join(ROOT_DIR, 'src', 'main.jsx')],
    bundle: true,
    outfile: path.join(PUBLIC_DIR, 'app.js'),
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    jsx: 'automatic',
    define: {
      'process.env.NODE_ENV': '"production"'
    },
    minify: false,
    sourcemap: false
  });

  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  const filesToSync = ['index.html', 'app.js', 'styles.css'];
  for (const file of filesToSync) {
    const srcFile = path.join(PUBLIC_DIR, file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, path.join(ROOT_DIR, file));
      fs.copyFileSync(srcFile, path.join(DOCS_DIR, file));
    }
  }
  console.log('✅ React build complete and synced to public/, root ./, and docs/!');
}

build().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
