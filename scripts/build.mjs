import { mkdir, cp } from 'node:fs/promises';
const source = new URL('../public/', import.meta.url);
const destination = new URL('../dist/', import.meta.url);
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
console.log('Built static site in dist/');
