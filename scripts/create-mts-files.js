import { readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';

async function createMtsFiles() {
  const definitionFiles = readdirSync('./dist/esm/types').filter((file) =>
    file.endsWith('.d.ts'),
  );

  for (const file of definitionFiles) {
    const content = readFileSync(`./dist/esm/types/${file}`, 'utf-8');
    const updatedContent = content.replaceAll('.ts', '.d.mts');

    writeFileSync(`./dist/esm/types/${file}`, updatedContent, 'utf-8');

    renameSync(
      `./dist/esm/types/${file}`,
      `./dist/esm/types/${file.replace('.d.ts', '.d.mts')}`,
    );
  }
}

createMtsFiles();
