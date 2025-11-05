import { readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';

async function createCtsFiles() {
  const definitionFiles = readdirSync('./dist/cjs/types').filter((file) =>
    file.endsWith('.d.ts'),
  );

  for (const file of definitionFiles) {
    const content = readFileSync(`./dist/cjs/types/${file}`, 'utf-8');
    const updatedContent = content
      .replaceAll('.ts', '.d.cts')
      .replaceAll('.js', '.d.cts')
      .replaceAll('import {', 'import type {');

    writeFileSync(`./dist/cjs/types/${file}`, updatedContent, 'utf-8');

    renameSync(
      `./dist/cjs/types/${file}`,
      `./dist/cjs/types/${file.replace('.d.ts', '.d.cts')}`,
    );
  }
}

createCtsFiles();
