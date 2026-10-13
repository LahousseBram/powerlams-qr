// Scans documents/ for PDFs and writes documents.json (one QR entry per PDF).
// Run with: node scripts/build-manifest.js
import { readdirSync, statSync, writeFileSync } from 'fs';
import { join, basename, extname, sep } from 'path';

const ROOT = 'documents';

function findPdfs(dir) {
    return readdirSync(dir).flatMap(name => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return findPdfs(path);
        return extname(name).toLowerCase() === '.pdf' ? [path] : [];
    });
}

const entries = findPdfs(ROOT).sort().map(path => {
    const file = basename(path);
    const stem = basename(file, extname(file));
    return {
        id: 'QR-' + stem.replace(/\W+/g, '-').toUpperCase(),
        title: file,
        documentUrl: '/' + path.split(sep).join('/').split('/').map(encodeURIComponent).join('/'),
        documentType: 'application/pdf',
        createdAt: statSync(path).mtime.toISOString()
    };
});

writeFileSync('documents.json', JSON.stringify(entries, null, 2) + '\n');
console.log(`Wrote documents.json with ${entries.length} entries`);
