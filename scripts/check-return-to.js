// Checks libs/safeReturnTo.ts against a table of good and bad values. Run: yarn check:return-to
// The TypeScript file is compiled in memory with the TypeScript package that is already installed.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const file = path.join(__dirname, '..', 'libs', 'safeReturnTo.ts');
const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const { safeReturnTo } = mod.exports;

const good = [
	'/',
	'/orders',
	'/events/abc123/seats',
	'/events?category=CONCERT&sort=startAt',
	'/events?search=a%20b',
	'/orders/abc#top',
	'/checkout/5f1d7c?x=100%25',
	'/ko/orders',
];
const bad = [
	undefined,
	'',
	'orders',
	'//evil.com',
	'///evil.com',
	'/\\evil.com',
	'/\t/evil.com',
	'/\n/evil.com',
	'/\r/evil.com',
	'/%09/evil.com',
	'/%0a/evil.com',
	'/%0d/evil.com',
	'/%5cevil.com',
	'/%5Cevil.com',
	'/%2509/evil.com',
	'/%250a/evil.com',
	'/%255cevil.com',
	'/%25252509/evil.com',
	'/%2F/evil.com',
	'/%2f%2fevil.com',
	'/%00',
	'/a\u0000b',
	'/a\u007fb',
	'https://evil.com',
	'http://evil.com/x',
	'javascript:alert(1)',
	'/..//evil.com',
	'/' + 'a'.repeat(3000),
];

let failed = 0;
const check = (input, expectOk) => {
	const out = safeReturnTo(input);
	const ok = expectOk ? out === input : out === null;
	if (!ok) {
		failed += 1;
		console.error(`FAIL ${expectOk ? 'accepted nothing' : 'accepted'}: ${JSON.stringify(input)} -> ${JSON.stringify(out)}`);
	}
};
good.forEach((value) => check(value, true));
bad.forEach((value) => check(value, false));
if (safeReturnTo(['/orders', '//evil.com']) !== '/orders') {
	failed += 1;
	console.error('FAIL: array input should use the first value');
}
console.log(`${good.length + bad.length + 1} cases, ${failed} failed`);
process.exit(failed ? 1 : 0);
