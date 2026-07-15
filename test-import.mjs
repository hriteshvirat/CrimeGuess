import('./node_modules/@devvit/cli/dist/commands/playtest.js')
  .then(() => console.log('success'))
  .catch((e) => console.error('ERROR:', e));
