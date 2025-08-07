import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export const cleanUp = async (pathsToDelete) => {
  for (const relativePath of pathsToDelete) {
    const fullPath = join(__dirname, relativePath);
    if (!existsSync(fullPath)) {
      console.log(`⚠️  Path does not exist: ${fullPath}`);
      continue;
    }

    try {
      await rm(fullPath, { recursive: true });
      console.log(`✅ Deleted: ${fullPath}`);
    } catch (err) {
      console.error(`❌ Failed to delete ${fullPath}:`, err.message);
    }
  }
};
