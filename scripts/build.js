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

  // Generate cache-busting timestamp for app.js and styles.css
  const buildVersion = `v_${Date.now()}`;
  console.log(`📦 Applying cache-busting version query: ${buildVersion}`);

  const indexHtmlTemplate = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
  <title>OKX Europe — AI Agent Crypto Trading (React)</title>
  <link rel="stylesheet" href="./styles.css?v=${buildVersion}" />
</head>
<body>
  <div id="root"></div>
  <script src="./app.js?v=${buildVersion}"></script>
</body>
</html>
`;

  fs.writeFileSync(path.join(PUBLIC_DIR, 'index.html'), indexHtmlTemplate, 'utf8');
  fs.writeFileSync(path.join(ROOT_DIR, 'index.html'), indexHtmlTemplate, 'utf8');
  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), indexHtmlTemplate, 'utf8');

  const filesToSync = ['app.js', 'styles.css'];
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
