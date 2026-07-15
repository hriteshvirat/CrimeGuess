const fs = require('fs');

try {
  const content = fs.readFileSync('scratch/bundle.js', 'utf8');
  const lines = content.split('\n');
  console.log('Total lines:', lines.length);
  const start = Math.max(0, 136550);
  const end = Math.min(lines.length, 136580);
  for (let i = start; i < end; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
} catch (err) {
  console.error(err);
}
