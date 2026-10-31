// Checks libs/refundPolicy.ts against the boundary cases of the backend's refund specs
// (ticketzy: apps/ticketzy-api/src/libs/refund-policy.spec.ts and refund-policy-days.spec.ts). Run: yarn check:refund-deadline
// The TypeScript file is compiled in memory with the TypeScript package that is already installed.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const ts = require('typescript');

const file = path.join(__dirname, '..', 'libs', 'refundPolicy.ts');
const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const { getRefundDeadline, isBeforeRefundDeadline, readRefundPolicy, getRefundState } = mod.exports;

let failed = 0;
let count = 0;
const check = (label, actual, expected) => {
	count += 1;
	try {
		assert.strictEqual(actual, expected);
	} catch {
		failed += 1;
		console.error(`FAIL ${label}\n  expected ${expected}\n  actual   ${actual}`);
	}
};
const iso = (start, zone, days) => getRefundDeadline(new Date(start), zone, days).toISOString();

// refund-policy.spec.ts: the day before, on the venue wall clock
const startAt = '2026-12-25T10:00:00Z'; // 19:00 on Dec 25 in Seoul
check('day before, Seoul', iso(startAt, 'Asia/Seoul'), '2026-12-24T14:59:59.999Z');
check('day before, Los Angeles', iso(startAt, 'America/Los_Angeles'), '2026-12-25T07:59:59.999Z');
check('day before, UTC', iso(startAt, 'UTC'), '2026-12-24T23:59:59.999Z');
check('venue day differs from UTC day (Seoul)', iso('2026-12-24T16:00:00Z', 'Asia/Seoul'), '2026-12-24T14:59:59.999Z');
check('venue day differs from UTC day (UTC)', iso('2026-12-24T16:00:00Z', 'UTC'), '2026-12-23T23:59:59.999Z');
check('DST spring forward day, New York', iso('2026-03-08T15:00:00Z', 'America/New_York'), '2026-03-08T04:59:59.999Z');
check('day after DST change, New York', iso('2026-03-09T15:00:00Z', 'America/New_York'), '2026-03-09T03:59:59.999Z');
check('ISO string start', getRefundDeadline('2026-12-25T10:00:00Z', 'Asia/Seoul').toISOString(), '2026-12-24T14:59:59.999Z');

// isBeforeRefundDeadline: the last millisecond is in, the next is out
const start = new Date(startAt);
check('last ms is before', isBeforeRefundDeadline(start, 'Asia/Seoul', new Date('2026-12-24T14:59:59.999Z')), true);
check('next ms is not', isBeforeRefundDeadline(start, 'Asia/Seoul', new Date('2026-12-24T15:00:00.000Z')), false);
check('different zones, same now (Seoul)', isBeforeRefundDeadline(start, 'Asia/Seoul', new Date('2026-12-24T20:00:00Z')), false);
check('different zones, same now (LA)', isBeforeRefundDeadline(start, 'America/Los_Angeles', new Date('2026-12-24T20:00:00Z')), true);

// midnight edges, Seoul
check('start 00:00:00.000 local', iso('2026-12-24T15:00:00.000Z', 'Asia/Seoul'), '2026-12-24T14:59:59.999Z');
check('start 00:00:00.001 local', iso('2026-12-24T15:00:00.001Z', 'Asia/Seoul'), '2026-12-24T14:59:59.999Z');
check('start 23:59:59.999 local', iso('2026-12-25T14:59:59.999Z', 'Asia/Seoul'), '2026-12-24T14:59:59.999Z');
check('one ms before local midnight', iso('2026-12-24T14:59:59.999Z', 'Asia/Seoul'), '2026-12-23T14:59:59.999Z');
check('year end', iso('2027-01-01T01:00:00Z', 'Asia/Seoul'), '2026-12-31T14:59:59.999Z');
check('month end', iso('2026-03-01T01:00:00Z', 'Asia/Seoul'), '2026-02-28T14:59:59.999Z');

// cut-off around 23:59 the day before (Seoul)
for (const [label, now, expected] of [
	['23:58:00 local', '2026-12-24T14:58:00.000Z', true],
	['23:59:00 local', '2026-12-24T14:59:00.000Z', true],
	['23:59:59.999 local', '2026-12-24T14:59:59.999Z', true],
	['00:00:00.000 on the event day', '2026-12-24T15:00:00.000Z', false],
	['00:00:01 on the event day', '2026-12-24T15:00:01.000Z', false],
	['the event start itself', '2026-12-25T10:00:00.000Z', false],
]) {
	check(`cut-off ${label}`, isBeforeRefundDeadline(start, 'Asia/Seoul', new Date(now)), expected);
}

// half-hour and far-west zones
check('Kolkata', iso(startAt, 'Asia/Kolkata'), '2026-12-24T18:29:59.999Z');
check('Honolulu event day starts exactly then', iso(startAt, 'Pacific/Honolulu'), '2026-12-25T09:59:59.999Z');
check('Honolulu one ms earlier', iso('2026-12-25T09:59:59.999Z', 'Pacific/Honolulu'), '2026-12-24T09:59:59.999Z');

// DST
check('New York 25 hour day (Nov 1)', iso('2026-11-01T15:00:00Z', 'America/New_York'), '2026-11-01T03:59:59.999Z');
check('New York Nov 2', iso('2026-11-02T15:00:00Z', 'America/New_York'), '2026-11-02T04:59:59.999Z');
check('New York last ms before (Nov 1)', isBeforeRefundDeadline('2026-11-01T15:00:00Z', 'America/New_York', new Date('2026-11-01T03:59:59.999Z')), true);
check('New York first ms after (Nov 1)', isBeforeRefundDeadline('2026-11-01T15:00:00Z', 'America/New_York', new Date('2026-11-01T04:00:00.000Z')), false);
check('repeated hour, first 01:30', iso('2026-11-01T05:30:00Z', 'America/New_York'), '2026-11-01T03:59:59.999Z');
check('repeated hour, second 01:30', iso('2026-11-01T06:30:00Z', 'America/New_York'), '2026-11-01T03:59:59.999Z');
check('23 hour day', iso('2026-03-08T12:00:00Z', 'America/New_York'), '2026-03-08T04:59:59.999Z');
check('evening of the 23 hour day', iso('2026-03-09T03:30:00Z', 'America/New_York'), '2026-03-08T04:59:59.999Z');
check('London GMT', iso('2026-03-29T12:00:00Z', 'Europe/London'), '2026-03-28T23:59:59.999Z');
check('London BST', iso('2026-03-30T12:00:00Z', 'Europe/London'), '2026-03-29T22:59:59.999Z');
check('Sydney AEDT', iso('2026-04-05T02:00:00Z', 'Australia/Sydney'), '2026-04-04T12:59:59.999Z');
check('Sydney AEST', iso('2026-04-06T02:00:00Z', 'Australia/Sydney'), '2026-04-05T13:59:59.999Z');

// refund-policy-days.spec.ts: daysBefore 1, 7 and 30 (and 2)
const days = '2026-12-20T10:00:00Z'; // 19:00 on 12-20 in Seoul
check('1 day default', iso(days, 'Asia/Seoul'), '2026-12-19T14:59:59.999Z');
check('1 day explicit', iso(days, 'Asia/Seoul', 1), '2026-12-19T14:59:59.999Z');
check('2 days', iso(days, 'Asia/Seoul', 2), '2026-12-18T14:59:59.999Z');
check('7 days', iso(days, 'Asia/Seoul', 7), '2026-12-13T14:59:59.999Z');
check('30 days', iso(days, 'Asia/Seoul', 30), '2026-11-20T14:59:59.999Z');
check('5 days across the year end', iso('2027-01-02T10:00:00Z', 'Asia/Seoul', 5), '2026-12-28T14:59:59.999Z');
const three = getRefundDeadline(new Date(days), 'Asia/Seoul', 3);
check('3 days last ms is before', isBeforeRefundDeadline(days, 'Asia/Seoul', three, 3), true);
check('3 days next ms is not', isBeforeRefundDeadline(days, 'Asia/Seoul', new Date(three.getTime() + 1), 3), false);
check('New York 3 days over the DST change', iso('2026-11-03T00:00:00Z', 'America/New_York', 3), '2026-10-31T03:59:59.999Z');
// 7 and 30 days at the exact boundary
for (const n of [1, 7, 30]) {
	const d = getRefundDeadline(new Date(days), 'Asia/Seoul', n);
	check(`${n} days: last ms in`, isBeforeRefundDeadline(days, 'Asia/Seoul', d, n), true);
	check(`${n} days: next ms out`, isBeforeRefundDeadline(days, 'Asia/Seoul', new Date(d.getTime() + 1), n), false);
}

// the gap to the start stays under two days in every zone, all year (backend sweep)
for (const zone of ['Asia/Seoul', 'America/New_York', 'Europe/London', 'Australia/Sydney', 'Asia/Kolkata', 'Pacific/Honolulu', 'America/Santiago']) {
	let ok = true;
	for (let hours = 0; hours < 24 * 366; hours += 7) {
		const s = new Date(Date.UTC(2026, 0, 1) + hours * 3600000);
		const gap = s.getTime() - getRefundDeadline(s, zone).getTime();
		if (!(gap > 0 && gap <= 2 * 86400000 + 3600000)) ok = false;
	}
	check(`gap sweep ${zone}`, ok, true);
}

// policy values
check('legacy policy', JSON.stringify(readRefundPolicy({})), JSON.stringify({ policyType: 'REFUNDABLE', daysBefore: 1 }));
check('null policy', JSON.stringify(readRefundPolicy(null)), JSON.stringify({ policyType: 'REFUNDABLE', daysBefore: 1 }));
check('non-refundable has no days', JSON.stringify(readRefundPolicy({ refundPolicy: { policyType: 'NON_REFUNDABLE', daysBefore: 9 } })), JSON.stringify({ policyType: 'NON_REFUNDABLE', daysBefore: 0 }));
check('state non-refundable', getRefundState({ refundPolicy: { policyType: 'NON_REFUNDABLE', daysBefore: 0 } }, days, 'Asia/Seoul').kind, 'NON_REFUNDABLE');
check('state open', getRefundState({ refundPolicy: { policyType: 'REFUNDABLE', daysBefore: 7 } }, days, 'Asia/Seoul', new Date('2026-12-13T14:59:59.999Z')).kind, 'OPEN');
check('state closed', getRefundState({ refundPolicy: { policyType: 'REFUNDABLE', daysBefore: 7 } }, days, 'Asia/Seoul', new Date('2026-12-13T15:00:00.000Z')).kind, 'CLOSED');

if (failed) {
	console.error(`${failed} of ${count} refund deadline checks failed`);
	process.exit(1);
}
console.log(`refund deadline: ${count} checks passed`);
