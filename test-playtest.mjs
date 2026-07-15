(async () => {
  try {
    const mod = await import('./node_modules/@devvit/cli/dist/commands/playtest.js');
    console.log('OK', mod);
  } catch (e) {
    console.error('ERR:', e);
  }
})();
