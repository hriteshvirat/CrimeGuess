const { execSync } = require('child_process');

try {
  const pids = execSync('lsof -t -i :5678').toString().trim().split('\n').filter(Boolean);
  if (pids.length > 0) {
    for (const pid of pids) {
      console.log(`Killing process ${pid} on port 5678...`);
      execSync(`kill -9 ${pid}`);
    }
    console.log('All processes killed!');
  } else {
    console.log('No process found on port 5678.');
  }
} catch (e) {
  console.log('No process on port 5678 or failed to kill:', e.message);
}
