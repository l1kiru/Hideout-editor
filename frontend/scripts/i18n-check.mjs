import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve('src', 'i18n', 'locales');
const langs = ['ru', 'en'];

function flatten(obj, prefix = '', out = new Map()) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out;
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            flatten(v, key, out);
        } else {
            out.set(key, v);
        }
    }
    return out;
}

async function listJsonFiles(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await listJsonFiles(full)));
            continue;
        }
        if (entry.isFile() && entry.name.endsWith('.json')) files.push(full);
    }
    return files.sort();
}

async function readLangMap(lang) {
    const langDir = path.join(root, lang);
    const st = await stat(langDir);
    if (!st.isDirectory()) throw new Error(`Missing locale dir: ${langDir}`);
    const files = await listJsonFiles(langDir);
    const byNs = new Map();
    for (const file of files) {
        const ns = path.basename(file, '.json');
        const raw = await readFile(file, 'utf8');
        const json = JSON.parse(raw);
        byNs.set(ns, flatten(json));
    }
    return byNs;
}

function diffKeys(a, b) {
    const aKeys = new Set(a.keys());
    const bKeys = new Set(b.keys());
    const missingInB = [...aKeys].filter((k) => !bKeys.has(k)).sort();
    const missingInA = [...bKeys].filter((k) => !aKeys.has(k)).sort();
    const emptyInA = [...a.entries()]
        .filter(([, v]) => typeof v === 'string' && v.trim() === '')
        .map(([k]) => k)
        .sort();
    const emptyInB = [...b.entries()]
        .filter(([, v]) => typeof v === 'string' && v.trim() === '')
        .map(([k]) => k)
        .sort();
    return { missingInB, missingInA, emptyInA, emptyInB };
}

const [ruMap, enMap] = await Promise.all(langs.map((l) => readLangMap(l)));

let hasErrors = false;
const namespaces = new Set([...ruMap.keys(), ...enMap.keys()]);
for (const ns of [...namespaces].sort()) {
    const ru = ruMap.get(ns) ?? new Map();
    const en = enMap.get(ns) ?? new Map();
    const { missingInB, missingInA, emptyInA, emptyInB } = diffKeys(ru, en);
    if (
        missingInB.length === 0
        && missingInA.length === 0
        && emptyInA.length === 0
        && emptyInB.length === 0
    ) {
        continue;
    }
    hasErrors = true;
    console.error(`\n[i18n-check] namespace: ${ns}`);
    if (missingInB.length) {
        console.error(`  missing in en (${missingInB.length}):`);
        missingInB.forEach((k) => console.error(`    - ${k}`));
    }
    if (missingInA.length) {
        console.error(`  missing in ru (${missingInA.length}):`);
        missingInA.forEach((k) => console.error(`    - ${k}`));
    }
    if (emptyInA.length) {
        console.error(`  empty in ru (${emptyInA.length}):`);
        emptyInA.forEach((k) => console.error(`    - ${k}`));
    }
    if (emptyInB.length) {
        console.error(`  empty in en (${emptyInB.length}):`);
        emptyInB.forEach((k) => console.error(`    - ${k}`));
    }
}

if (hasErrors) {
    process.exit(1);
}
console.log('[i18n-check] OK');

