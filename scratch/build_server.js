const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/server/main.ts'],
  bundle: true,
  outfile: 'dist/server.js',
  platform: 'node',
  target: 'es2015',
  external: [
    '@devvit/public-api'
  ]
}).then(() => {
  console.log('Server bundle built successfully!');
}).catch((err) => {
  console.error('Server bundle build failed:', err);
  process.exit(1);
});
