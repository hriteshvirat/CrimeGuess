import Playtest from './node_modules/@devvit/cli/dist/commands/playtest.js';

(async () => {
  try {
    console.log("Running playtest command directly...");
    await Playtest.run(['crime_guess_dev']);
    console.log("Playtest command finished");
  } catch (err) {
    console.error("Playtest failed:", err);
  }
})();
