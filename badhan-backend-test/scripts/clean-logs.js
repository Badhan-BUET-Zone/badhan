// Removes prior run's per-test log .txt files so each batch run starts fresh.
const fs = require('fs');
const path = require('path');
const base = process.cwd();
const dirs = [path.join(base, 'logs', 'error'), path.join(base, 'logs', 'success')];
for (const dir of dirs) {
  try {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith('.txt')) {
        try { fs.unlinkSync(path.join(dir, file)); } catch (e) { void e; }
      }
    }
  } catch (e) {
    console.warn('[clean-logs] Failed cleaning', dir, e.message);
  }
}