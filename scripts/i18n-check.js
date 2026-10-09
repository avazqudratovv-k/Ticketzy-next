#!/usr/bin/env node
/**
 * i18n check: `yarn i18n:check` (exit code 1 when something is missing).
 *
 *  1. Locale parity: every key of en exists in ko, ru and uz (plural suffixes are folded), and `{{placeholders}}` match.
 *  2. Code: every static `t('key')` / `t('ns:key')` in libs and pages exists in en. Template keys such as
 *     t(`status.${x}`) are checked by prefix (at least one key must start with `status.`).
 *  3. Namespaces: every namespace a page (or a component it imports, transitively) uses is listed in that page's
 *     serverSideTranslations call; otherwise the page shows raw keys after a hard load (this was the cause of
 *     "pagination.compact" on the admin pages).
 *
 * No dependencies, reads files only.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOCALES_DIR = path.join(ROOT, 'public', 'locales');
const LANGS = ['en', 'ko', 'ru', 'uz'];
const PLURAL = /_(zero|one|two|few|many|other)$/;
const problems = { parity: [], placeholders: [], missingInCode: [], prefixes: [], namespaces: [] };
const warnings = { untranslated: [] };

/** LOCALES **/
const flatten = (obj, prefix = '', out = {}) => {
	Object.entries(obj).forEach(([key, value]) => {
		const full = prefix ? `${prefix}.${key}` : key;
		if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, full, out);
		else if (Array.isArray(value)) value.forEach((item, i) => (typeof item === 'object' ? flatten(item, `${full}.${i}`, out) : (out[`${full}.${i}`] = String(item))));
		else out[full] = String(value);
	});
	return out;
};
const fold = (key) => key.replace(PLURAL, '');

const locales = {}; // lang -> ns -> { key -> text }
LANGS.forEach((lang) => {
	locales[lang] = {};
	const dir = path.join(LOCALES_DIR, lang);
	if (!fs.existsSync(dir)) return;
	fs.readdirSync(dir)
		.filter((f) => f.endsWith('.json'))
		.forEach((file) => {
			locales[lang][file.replace(/\.json$/, '')] = flatten(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
		});
});
const namespaces = Object.keys(locales.en);
const placeholdersOf = (text) => (text.match(/\{\{\s*[\w.]+\s*(?:,[^}]*)?\}\}/g) || []).map((p) => p.replace(/\s+/g, '').replace(/,.*\}\}/, '}}')).sort().join(',');

namespaces.forEach((ns) => {
	const enKeys = new Map(Object.keys(locales.en[ns]).map((k) => [fold(k), k]));
	LANGS.filter((l) => l !== 'en').forEach((lang) => {
		const other = locales[lang][ns];
		if (!other) {
			problems.parity.push(`${lang}/${ns}.json is missing`);
			return;
		}
		const otherFolded = new Set(Object.keys(other).map(fold));
		enKeys.forEach((_, folded) => {
			if (!otherFolded.has(folded)) problems.parity.push(`${lang}:${ns}:${folded} missing`);
		});
		otherFolded.forEach((folded) => {
			if (!enKeys.has(folded)) problems.parity.push(`${lang}:${ns}:${folded} not in en`);
		});
		Object.keys(other).forEach((key) => {
			const enKey = Object.keys(locales.en[ns]).find((k) => k === key) || enKeys.get(fold(key));
			if (!enKey) return;
			if (placeholdersOf(other[key]) !== placeholdersOf(locales.en[ns][enKey]) && !PLURAL.test(key)) {
				problems.placeholders.push(`${lang}:${ns}:${key} has ${placeholdersOf(other[key]) || 'none'}, en has ${placeholdersOf(locales.en[ns][enKey]) || 'none'}`);
			}
			if (!other[key].trim()) problems.parity.push(`${lang}:${ns}:${key} is empty`);
			// the same text as English in a language that does not use it: probably a forgotten translation (names, codes and units are fine)
			const text = other[key].replace(/\{\{[^}]+\}\}/g, '').trim();
			if (other[key] === locales.en[ns][enKey] && /[A-Za-z]{3,}.*\s[A-Za-z]{2,}/.test(text)) warnings.untranslated.push(`${lang}:${ns}:${key} = "${other[key].slice(0, 60)}"`);
		});
	});
});

/** CODE **/
const walk = (dir, out = []) => {
	fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
		if (entry.name === 'node_modules' || entry.name.startsWith('.')) return;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, out);
		else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full);
	});
	return out;
};
const files = [...walk(path.join(ROOT, 'libs')), ...walk(path.join(ROOT, 'pages'))];
const source = new Map(files.map((f) => [f, fs.readFileSync(f, 'utf8')]));

const hasKey = (ns, key) => {
	const table = locales.en[ns];
	if (!table) return false;
	if (key in table) return true;
	return Object.keys(table).some((k) => fold(k) === key);
};
const hasPrefix = (ns, prefix) => Object.keys(locales.en[ns] || {}).some((k) => k.startsWith(prefix));

/** namespaces a file uses: useTranslation('x') / useTranslation(['x','y']) / 'ns:key' */
const usedNamespaces = (text) => {
	const used = new Set();
	for (const m of text.matchAll(/useTranslation\(\s*(\[[^\]]*\]|'[^']*'|"[^"]*")?/g)) {
		const arg = m[1];
		if (!arg) used.add('common');
		else (arg.match(/['"]([\w-]+)['"]/g) || []).forEach((s) => used.add(s.slice(1, -1)));
	}
	for (const m of text.matchAll(/\bt\(\s*['"`]([a-z]\w*):[^'"`]/g)) used.add(m[1]);
	return used;
};

files.forEach((file) => {
	const text = source.get(file);
	if (!text.includes('useTranslation')) return; // helpers that receive t as a parameter are checked through their callers' namespaces
	const rel = path.relative(ROOT, file);
	const own = [...usedNamespaces(text)];
	const defaultNs = own[0] || 'common';
	for (const m of text.matchAll(/\bt\(\s*(['"`])([^'"`]+?)\1/g)) {
		const raw = m[2];
		if (/^[\s\d.,:/-]*$/.test(raw) || raw.includes(' ') || !/^[\w:.${}\-]+$/.test(raw)) continue; // plain text, not a key
		let ns = defaultNs;
		let key = raw;
		const colon = raw.indexOf(':');
		if (colon > 0) {
			ns = raw.slice(0, colon);
			key = raw.slice(colon + 1);
		}
		if (!locales.en[ns]) {
			if (colon > 0) problems.missingInCode.push(`${rel}: namespace "${ns}" does not exist (${raw})`);
			continue;
		}
		if (key.includes('${')) {
			const prefix = key.slice(0, key.indexOf('${'));
			if (prefix && !hasPrefix(ns, prefix)) problems.prefixes.push(`${rel}: no key starts with ${ns}:${prefix}`);
			continue;
		}
		if (!hasKey(ns, key) && !hasPrefix(ns, `${key}.`)) {
			// the key may live in another namespace of the same file (multi-namespace useTranslation)
			const alt = own.find((other) => other !== ns && hasKey(other, key));
			if (!alt) problems.missingInCode.push(`${rel}: ${ns}:${key}`);
		}
	}
});

/** NAMESPACES PER PAGE **/
const resolveImport = (from, spec) => {
	if (!spec.startsWith('.')) return null;
	const base = path.resolve(path.dirname(from), spec);
	for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
		if (source.has(candidate)) return candidate;
	}
	return null;
};
const closure = (entry) => {
	const seen = new Set();
	const stack = [entry];
	while (stack.length) {
		const file = stack.pop();
		if (seen.has(file)) continue;
		seen.add(file);
		const text = source.get(file) || '';
		for (const m of text.matchAll(/(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
			const target = resolveImport(file, m[1] || m[2]);
			if (target) stack.push(target);
		}
	}
	return seen;
};
files
	.filter((f) => f.startsWith(path.join(ROOT, 'pages')) && !/_app|_document|robots|sitemap/.test(f))
	.forEach((page) => {
		const text = source.get(page);
		const call = text.match(/serverSideTranslations\([^,]+,\s*\[([^\]]*)\]/);
		if (!call) {
			problems.namespaces.push(`${path.relative(ROOT, page)}: no serverSideTranslations call (strings would be raw keys)`);
			return;
		}
		const loaded = new Set((call[1].match(/['"]([\w-]+)['"]/g) || []).map((s) => s.slice(1, -1)));
		const needed = new Map();
		closure(page).forEach((file) => {
			usedNamespaces(source.get(file) || '').forEach((ns) => {
				if (!needed.has(ns)) needed.set(ns, path.relative(ROOT, file));
			});
		});
		needed.forEach((where, ns) => {
			if (!loaded.has(ns) && locales.en[ns]) problems.namespaces.push(`${path.relative(ROOT, page)}: "${ns}" is used (${where}) but not loaded`);
		});
	});

/** REPORT **/
const section = (title, list) => {
	console.log(`\n${title}: ${list.length}`);
	list.slice(0, 80).forEach((line) => console.log(`  - ${line}`));
	if (list.length > 80) console.log(`  ... and ${list.length - 80} more`);
};
console.log(`Namespaces: ${namespaces.length} (${namespaces.join(', ')}); languages: ${LANGS.join(', ')}`);
console.log(`Keys in en: ${namespaces.reduce((n, ns) => n + Object.keys(locales.en[ns]).length, 0)}; source files scanned: ${files.length}`);
section('Locale keys missing or extra in ko, ru, uz', problems.parity);
section('Placeholder mismatches', problems.placeholders);
section('Keys used in code but not defined in en', problems.missingInCode);
section('Template keys without any matching key', problems.prefixes);
section('Namespaces used by a page but not loaded for it', problems.namespaces);
section('Warning: same text as English (check if it should be translated)', warnings.untranslated);
const total = Object.values(problems).reduce((n, list) => n + list.length, 0);
console.log(total ? `\nFAILED: ${total} problem(s)` : '\nOK: no missing keys, no placeholder mismatches, every page loads the namespaces it uses');
process.exit(total ? 1 : 0);
