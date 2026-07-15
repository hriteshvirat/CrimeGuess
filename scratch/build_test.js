const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/server/main.ts'],
  bundle: true,
  outfile: 'scratch/bundle.js',
  platform: 'node',
  target: 'node20',
  external: [
    '@devvit/web',
    '@devvit/web/server',
    '@devvit/public-api',
    '@devvit/redis',
    '@devvit/reddit',
    '@devvit/server',
    '@devvit/settings',
    '@devvit/notifications',
    '@devvit/scheduler',
    '@devvit/protos'
  ]
}).then(() => {
  console.log('Build succeeded!');
  try {
    // We can't require it directly because @devvit packages are external and not fully mockable here
    console.log('Skipping execution because @devvit is external.');
  } catch (err) {
    console.error('Execution failed:', err);
  }
}).catch((err) => {
  console.error('Build failed:', err);
});
