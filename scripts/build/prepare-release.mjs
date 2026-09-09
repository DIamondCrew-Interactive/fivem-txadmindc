import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const distDir = path.join(repoRoot, 'dist');
const releaseDir = path.join(repoRoot, 'release');
const monitorDir = path.join(releaseDir, 'monitor');

const tagFromRef = () => {
    if (process.env.GITHUB_REF_NAME) return process.env.GITHUB_REF_NAME;
    if (process.env.GITHUB_REF) return process.env.GITHUB_REF.replace(/^refs\/tags\//, '');
    return 'local';
};

const fail = (message) => {
    console.error(`[release] ${message}`);
    process.exit(1);
};

const assertPath = (relativePath, type = 'any') => {
    const target = path.join(monitorDir, relativePath);
    if (!fs.existsSync(target)) fail(`Missing required runtime path: monitor/${relativePath}`);
    const stat = fs.statSync(target);
    if (type === 'file' && !stat.isFile()) fail(`Required path is not a file: monitor/${relativePath}`);
    if (type === 'dir' && !stat.isDirectory()) fail(`Required path is not a directory: monitor/${relativePath}`);
};

const walk = (root, visitor) => {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        const fullPath = path.join(root, entry.name);
        if (entry.isDirectory()) {
            visitor(fullPath, entry);
            walk(fullPath, visitor);
        } else {
            visitor(fullPath, entry);
        }
    }
};

const assertForbiddenPathsAbsent = () => {
    const forbiddenNames = new Set(['.git', 'node_modules']);
    const forbiddenRelativePaths = new Set([
        'docs/banner.png',
        'docs/zaphosting.png',
    ]);
    const forbiddenExtensions = new Set([
        '.key',
        '.pem',
        '.p12',
        '.pfx',
    ]);

    walk(monitorDir, (fullPath, entry) => {
        const relativePath = path.relative(monitorDir, fullPath).replaceAll(path.sep, '/');
        if (forbiddenNames.has(entry.name)) {
            fail(`Forbidden path found in release: ${path.relative(releaseDir, fullPath)}`);
        }
        if (entry.isFile() && entry.name === '.env') {
            fail(`Forbidden environment file found in release: ${path.relative(releaseDir, fullPath)}`);
        }
        if (entry.isFile() && forbiddenRelativePaths.has(relativePath)) {
            fail(`Forbidden promo asset found in release: monitor/${relativePath}`);
        }
        if (entry.isFile() && forbiddenExtensions.has(path.extname(entry.name).toLowerCase())) {
            fail(`Forbidden private key/certificate file found in release: ${path.relative(releaseDir, fullPath)}`);
        }
        if (entry.isFile() && /(secret|private[-_]?key|credential)/i.test(entry.name)) {
            fail(`Forbidden secret-like file found in release: ${path.relative(releaseDir, fullPath)}`);
        }
    });
};

const assertBranding = () => {
    assertPath('panel/images/diamond-circle-logo.png', 'file');
    assertPath('nui/images/diamond-circle-logo.png', 'file');

    let hasDiamondCrewIdentity = false;
    const searchableExtensions = new Set(['.html', '.js', '.css', '.json', '.lua', '.md', '.txt']);
    walk(monitorDir, (fullPath, entry) => {
        if (!entry.isFile() || hasDiamondCrewIdentity) return;
        if (!searchableExtensions.has(path.extname(entry.name))) return;
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('DiamondCrew Interactive')) {
            hasDiamondCrewIdentity = true;
        }
    });

    if (!hasDiamondCrewIdentity) {
        fail('DiamondCrew Interactive identity was not found in the release output.');
    }
};

if (!fs.existsSync(distDir)) fail('dist does not exist. Run npm run build first.');

fs.rmSync(releaseDir, { recursive: true, force: true });
fs.mkdirSync(releaseDir, { recursive: true });
fs.cpSync(distDir, monitorDir, { recursive: true });
fs.rmSync(path.join(monitorDir, 'docs/banner.png'), { force: true });
fs.rmSync(path.join(monitorDir, 'docs/zaphosting.png'), { force: true });

const manifest = {
    project: 'DiamondCrew txAdmin',
    build: 'release',
    version: tagFromRef(),
    compatibleWith: 'FXServer monitor replacement',
};
fs.writeFileSync(
    path.join(monitorDir, 'diamondcrew-build.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
);

[
    ['entrypoint.js', 'file'],
    ['fxmanifest.lua', 'file'],
    ['core/index.js', 'file'],
    ['resource', 'dir'],
    ['panel', 'dir'],
    ['panel/index.html', 'file'],
    ['nui', 'dir'],
    ['nui/index.html', 'file'],
    ['web', 'dir'],
    ['web/public', 'dir'],
    ['README.md', 'file'],
    ['LICENSE.txt', 'file'],
    ['THIRD-PARTY-LICENSES.txt', 'file'],
    ['diamondcrew-build.json', 'file'],
].forEach(([relativePath, type]) => assertPath(relativePath, type));

assertForbiddenPathsAbsent();
assertBranding();

console.log('[release] monitor runtime prepared at release/monitor');
console.log('[release] DiamondCrew branding verified');
