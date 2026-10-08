import { LayoutSection, SectionKind, SectionSpacing } from '../seats/types';
import { sectionBounds, sectionSize } from '../seats/layout';

/** The canvas every section is placed on (backend DECISIONS #41; the buyer seat map uses the same coordinates). */
export const CANVAS = { w: 1000, h: 700 } as const;
export const GRID = 10;

/** Backend limits (VenueSectionInput, venue-layout.ts). The server has no limit on the number of sections or seats. */
export const LIMITS = {
	venueName: { min: 2, max: 100 },
	city: { min: 2, max: 100 },
	address: { min: 3, max: 200 },
	key: { max: 30 },
	sectionName: { max: 60 },
	tierKey: { max: 30 },
	grid: { min: 1, max: 100 },
	maxImages: 8,
};

export const VENUE_TYPES = ['STADIUM', 'THEATER', 'CLUB', 'HALL', 'OPEN_AIR', 'ONLINE'] as const;
export type VenueType = (typeof VENUE_TYPES)[number];
export const SPACINGS: SectionSpacing[] = ['COMPACT', 'NORMAL', 'WIDE'];

/** A section in the editor: the server fields plus a local id that survives renaming the key (undo, React keys). */
export interface DraftSection {
	id: string;
	key: string;
	name: string;
	kind: SectionKind;
	rows: number;
	seatsPerRow: number;
	capacity: number | null;
	x: number;
	y: number;
	rotation: number;
	spacing: SectionSpacing;
	tierKey: string;
}

export type Layout = DraftSection[];

let counter = 0;
export const newId = () => `s${Date.now().toString(36)}${(counter += 1).toString(36)}`;

export function fromServer(sections: LayoutSection[] | undefined | null): Layout {
	return (sections ?? []).map((s) => ({
		id: newId(),
		key: s.key,
		name: s.name,
		kind: s.kind,
		rows: s.rows,
		seatsPerRow: s.seatsPerRow,
		capacity: s.kind === 'STANDING' ? s.capacity ?? 1 : null,
		x: s.x,
		y: s.y,
		rotation: s.rotation,
		spacing: s.spacing,
		tierKey: s.tierKey ?? '',
	}));
}

/** The exact shape of `VenueSectionInput`. A STANDING section sends rows and seatsPerRow of 1 (the server validates them too) and no tier. */
export function toInput(layout: Layout) {
	return {
		sections: layout.map((s) => ({
			key: s.key.trim(),
			name: s.name.trim(),
			kind: s.kind,
			rows: s.kind === 'STANDING' ? 1 : s.rows,
			seatsPerRow: s.kind === 'STANDING' ? 1 : s.seatsPerRow,
			...(s.kind === 'STANDING' ? { capacity: s.capacity ?? 1 } : {}),
			x: s.x,
			y: s.y,
			rotation: s.rotation,
			spacing: s.spacing,
			...(s.kind === 'SEATED' ? { tierKey: s.tierKey.trim() } : {}),
		})),
	};
}

/** A stable text of a layout, to tell a changed layout from an untouched one (ids are left out). */
export const signature = (layout: Layout) => JSON.stringify(toInput(layout));

/** Same shape the buyer map reads. */
export function asLayoutSections(layout: Layout): LayoutSection[] {
	return layout.map(sectionToBuyer);
}
/** A half-typed value (empty, 0, 500) must never make the map draw nothing or ten thousand seats: the field shows the error instead. */
const drawable = (n: number) => (Number.isFinite(n) ? Math.min(LIMITS.grid.max, Math.max(LIMITS.grid.min, Math.round(n))) : 1);
function sectionToBuyer(s: DraftSection): LayoutSection {
	return {
		key: s.key,
		name: s.name || s.key,
		kind: s.kind,
		rows: s.kind === 'STANDING' ? 1 : drawable(s.rows),
		seatsPerRow: s.kind === 'STANDING' ? 1 : drawable(s.seatsPerRow),
		capacity: s.kind === 'STANDING' ? (Number.isFinite(s.capacity) && (s.capacity as number) > 0 ? s.capacity : 1) : null,
		x: Number.isFinite(s.x) ? s.x : 500,
		y: Number.isFinite(s.y) ? s.y : 350,
		rotation: Number.isFinite(s.rotation) ? s.rotation : 0,
		spacing: s.spacing,
		tierKey: s.kind === 'SEATED' ? s.tierKey : null,
	};
}

export const sectionSeats = (s: DraftSection) => (s.kind === 'SEATED' ? safe(s.rows) * safe(s.seatsPerRow) : 0);
export const sectionStanding = (s: DraftSection) => (s.kind === 'STANDING' ? safe(s.capacity ?? 0) : 0);
const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export function totals(layout: Layout) {
	const seats = layout.reduce((sum, s) => sum + sectionSeats(s), 0);
	const standing = layout.reduce((sum, s) => sum + sectionStanding(s), 0);
	return { seats, standing, capacity: seats + standing };
}

/** Local size and bounds of a draft section (the same functions the buyer map uses). */
const converted = new WeakMap<DraftSection, LayoutSection>();
/** The buyer-map shape of one section. Cached by object, so the memoized seat rendering only redraws a section that changed. */
export function layoutSectionOf(s: DraftSection): LayoutSection {
	let value = converted.get(s);
	if (!value) {
		value = sectionToBuyer(s);
		converted.set(s, value);
	}
	return value;
}
export const boundsOf = (s: DraftSection) => sectionBounds(layoutSectionOf(s));
export const sizeOf = (s: DraftSection) => sectionSize(layoutSectionOf(s));

/** Room the plate takes around the seats (SeatMap draws it 6 units out). */
const PLATE = 6;

function corners(s: DraftSection) {
	const { w, h } = sizeOf(s);
	const hw = w / 2 + PLATE;
	const hh = h / 2 + PLATE;
	const a = (s.rotation * Math.PI) / 180;
	const cos = Math.cos(a);
	const sin = Math.sin(a);
	return [
		[-hw, -hh],
		[hw, -hh],
		[hw, hh],
		[-hw, hh],
	].map(([x, y]) => ({ x: s.x + x * cos - y * sin, y: s.y + x * sin + y * cos }));
}

/** Separating axis test for two rotated rectangles. Touching edges do not overlap. */
export function overlaps(a: DraftSection, b: DraftSection): boolean {
	const pa = corners(a);
	const pb = corners(b);
	for (const poly of [pa, pb]) {
		for (let i = 0; i < 4; i += 1) {
			const p = poly[i];
			const q = poly[(i + 1) % 4];
			const axis = { x: q.y - p.y, y: p.x - q.x };
			const project = (points: { x: number; y: number }[]) => {
				const values = points.map((point) => point.x * axis.x + point.y * axis.y);
				return [Math.min(...values), Math.max(...values)];
			};
			const [minA, maxA] = project(pa);
			const [minB, maxB] = project(pb);
			if (maxA <= minB + 0.01 || maxB <= minA + 0.01) return false;
		}
	}
	return true;
}

export const insideCanvas = (s: DraftSection) => {
	const box = boundsOf(s);
	return box.x >= -0.5 && box.y >= -0.5 && box.x + box.w <= CANVAS.w + 0.5 && box.y + box.h <= CANVAS.h + 0.5;
};

/** Moves a center so the whole section stays on the canvas (a section wider than the canvas is centered). */
export function clampToCanvas(s: DraftSection, x: number, y: number) {
	const box = boundsOf({ ...s, x: 0, y: 0 });
	const hw = box.w / 2;
	const hh = box.h / 2;
	const clamp = (value: number, half: number, size: number) => (half * 2 >= size ? size / 2 : Math.min(size - half, Math.max(half, value)));
	return { x: clamp(x, hw, CANVAS.w), y: clamp(y, hh, CANVAS.h) };
}

export const snap = (value: number, on: boolean) => (on ? Math.round(value / GRID) * GRID : Math.round(value * 10) / 10);

export type IssueCode =
	| 'keyRequired'
	| 'keyTooLong'
	| 'keyDuplicate'
	| 'nameRequired'
	| 'nameTooLong'
	| 'rowsRange'
	| 'seatsRange'
	| 'capacityRange'
	| 'tierRequired'
	| 'tierTooLong'
	| 'centerOutside'
	| 'notANumber';
export type WarningCode = 'overlap' | 'extends';

export interface SectionIssues {
	errors: IssueCode[];
	warnings: { code: WarningCode; with?: string }[];
}

const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n);

/** Mirrors `getVenueLayoutError` and the DTO decorators, per section, plus the editor's own canvas rules. */
export function validateLayout(layout: Layout): { bySection: Map<string, SectionIssues>; layoutError: 'noSections' | null; errorCount: number; warningCount: number } {
	const bySection = new Map<string, SectionIssues>();
	const keyCount = new Map<string, number>();
	layout.forEach((s) => keyCount.set(s.key.trim(), (keyCount.get(s.key.trim()) ?? 0) + 1));
	let errorCount = 0;
	let warningCount = 0;
	layout.forEach((s, index) => {
		const errors: IssueCode[] = [];
		const warnings: SectionIssues['warnings'] = [];
		const key = s.key.trim();
		if (!key) errors.push('keyRequired');
		else if (key.length > LIMITS.key.max) errors.push('keyTooLong');
		else if ((keyCount.get(key) ?? 0) > 1) errors.push('keyDuplicate');
		if (!s.name.trim()) errors.push('nameRequired');
		else if (s.name.trim().length > LIMITS.sectionName.max) errors.push('nameTooLong');
		if (s.kind === 'SEATED') {
			if (!isInt(s.rows) || s.rows < LIMITS.grid.min || s.rows > LIMITS.grid.max) errors.push('rowsRange');
			if (!isInt(s.seatsPerRow) || s.seatsPerRow < LIMITS.grid.min || s.seatsPerRow > LIMITS.grid.max) errors.push('seatsRange');
			if (!s.tierKey.trim()) errors.push('tierRequired');
			else if (s.tierKey.trim().length > LIMITS.tierKey.max) errors.push('tierTooLong');
		} else if (!isInt(s.capacity) || s.capacity < 1) errors.push('capacityRange');
		if (![s.x, s.y, s.rotation].every((n) => Number.isFinite(n))) errors.push('notANumber');
		else if (s.x < 0 || s.x > CANVAS.w || s.y < 0 || s.y > CANVAS.h) errors.push('centerOutside');
		else if (!insideCanvas(s)) warnings.push({ code: 'extends' });
		if (!errors.length) {
			for (let j = 0; j < index; j += 1) {
				const other = layout[j];
				if (Number.isFinite(other.x) && Number.isFinite(other.y) && overlaps(s, other)) {
					warnings.push({ code: 'overlap', with: other.name || other.key });
					bySection.get(other.id)?.warnings.push({ code: 'overlap', with: s.name || s.key });
					warningCount += 1;
				}
			}
		}
		errorCount += errors.length;
		warningCount += warnings.filter((w) => w.code !== 'overlap').length;
		bySection.set(s.id, { errors, warnings });
	});
	return { bySection, layoutError: layout.length === 0 ? 'noSections' : null, errorCount, warningCount };
}

/** Next free key like SEC_3, built from a base. */
export function uniqueKey(layout: Layout, base: string) {
	const taken = new Set(layout.map((s) => s.key));
	const root = base.slice(0, LIMITS.key.max - 4);
	if (!taken.has(root)) return root;
	for (let n = 2; ; n += 1) {
		const key = `${root}_${n}`;
		if (!taken.has(key)) return key;
	}
}

/** A new section at a free spot near the middle of the canvas (the first free cell of a coarse grid, else the middle). */
export function newSection(layout: Layout, kind: SectionKind, labels: { seated: string; standing: string }): DraftSection {
	const base: DraftSection =
		kind === 'SEATED'
			? { id: newId(), key: '', name: '', kind, rows: 5, seatsPerRow: 10, capacity: null, x: 500, y: 350, rotation: 0, spacing: 'NORMAL', tierKey: '' }
			: { id: newId(), key: '', name: '', kind, rows: 1, seatsPerRow: 1, capacity: 200, x: 500, y: 350, rotation: 0, spacing: 'COMPACT', tierKey: '' };
	const number = layout.filter((s) => s.kind === kind).length + 1;
	const name = `${kind === 'SEATED' ? labels.seated : labels.standing} ${number}`.slice(0, LIMITS.sectionName.max);
	const key = uniqueKey(layout, kind === 'SEATED' ? `SEC_${number}` : `FLOOR_${number}`);
	const tierKey = kind === 'SEATED' ? uniqueTier(layout) : '';
	const section = { ...base, name, key, tierKey };
	const spots: [number, number][] = [];
	for (let y = 150; y <= 600; y += 90) for (let x = 200; x <= 800; x += 120) spots.push([x, y]);
	spots.sort((a, b) => Math.hypot(a[0] - 500, a[1] - 350) - Math.hypot(b[0] - 500, b[1] - 350));
	const free = spots.find(([x, y]) => !layout.some((other) => overlaps({ ...section, x, y }, other)));
	const [x, y] = free ?? [500, 350];
	const placed = { ...section, ...clampToCanvas(section, x, y) };
	return placed;
}

/** Tier keys follow the existing ones: the last tier of the layout is reused, so a new section shares it unless the organizer changes it. */
function uniqueTier(layout: Layout) {
	const last = [...layout].reverse().find((s) => s.kind === 'SEATED' && s.tierKey.trim());
	return last ? last.tierKey : 'GENERAL';
}

export function duplicateSection(layout: Layout, source: DraftSection): DraftSection {
	const key = uniqueKey(layout, source.key || 'SEC');
	const copy: DraftSection = { ...source, id: newId(), key, name: `${source.name} 2`.slice(0, LIMITS.sectionName.max) };
	const box = boundsOf(source);
	// Beside the original if it fits, else below it
	const tries = [
		[source.x + box.w + 24, source.y],
		[source.x, source.y + box.h + 24],
		[source.x - box.w - 24, source.y],
		[source.x + 30, source.y + 30],
	];
	for (const [x, y] of tries) {
		const spot = clampToCanvas(copy, x, y);
		if (!layout.some((other) => overlaps({ ...copy, ...spot }, other))) return { ...copy, ...spot };
	}
	return { ...copy, ...clampToCanvas(copy, source.x + 30, source.y + 30) };
}

/** Tier keys in use, with the seats they add up to (the event form builds one ticket type per tier). */
export function tierSummary(layout: Layout) {
	const map = new Map<string, { seats: number; sections: number }>();
	layout.forEach((s) => {
		if (s.kind !== 'SEATED' || !s.tierKey.trim()) return;
		const entry = map.get(s.tierKey.trim()) ?? { seats: 0, sections: 0 };
		entry.seats += sectionSeats(s);
		entry.sections += 1;
		map.set(s.tierKey.trim(), entry);
	});
	return map;
}
