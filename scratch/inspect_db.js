import { DatabaseSync } from 'node:sqlite';

function inspectMetadata(dbPath) {
  console.log(`\n=== Database: ${dbPath} ===`);
  try {
    const db = new DatabaseSync(dbPath);
    
    // Check trajectory_meta
    const meta = db.prepare("SELECT * FROM trajectory_meta").all();
    console.log('trajectory_meta:', meta);

    // Check trajectory_metadata_blob
    const blob = db.prepare("SELECT * FROM trajectory_metadata_blob").all();
    for (const b of blob) {
      console.log(`Blob ID: ${b.id}, Size: ${b.data.length}`);
      // Convert Uint8Array to string representation to see if there is readable text
      const str = Buffer.from(b.data).toString('utf-8');
      // filter readable characters
      const printable = str.replace(/[^\x20-\x7E]+/g, ' ');
      console.log('Printable text in blob:', printable.substring(0, 300));
    }
  } catch (err) {
    console.error('Error inspecting:', err.message);
  }
}

inspectMetadata('C:/Users/rakes/.gemini/antigravity-ide/conversations/300d29f9-8a77-40f3-b593-05dcbc231403.db');
inspectMetadata('C:/Users/rakes/.gemini/antigravity-ide/conversations/37bfdb83-1fa1-4584-93a3-de9ee245a651.db');
