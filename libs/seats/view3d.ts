import { FocalArea, LayoutSection, SeatRef } from './types';
import { PITCH as CELL, pitchOf, sectionBounds, seatCenter, seatKey } from './layout';
import { FOCAL_CANVAS, readFocalArea } from './focal';

/** "View from your seat" (F391): pure maths from the layout to 3D positions. No `three` here, so it stays out of every bundle until the scene loads. */

/** Meters per canvas unit for a STAGE venue: the 1000 x 700 canvas becomes 100 x 70 m. */
export const SCALE = 0.1;
/** Meters per canvas unit around a PITCH: the fixed 420 x 272 pitch becomes a real 105 x 68 m (F401). */
export const PITCH_SCALE = 0.25;
/** Meters per canvas unit in a venue with a stage: a seat cell becomes a real 0.65 to 1 m and a 400-unit stage 20 m (F402). */
export const STAGE_SCALE = 0.05;
/** Raked seating in a hall is steeper per meter than the tiers of the old scale, because the rows are closer together */
const STAGE_RISE_FACTOR = 1.5;
/** Tiers around a pitch are 2.5 times deeper in meters, so they rise a little less per meter (a row still steps about 0.8 m). */
const PITCH_RISE_FACTOR = 0.7;
/** Roof above the highest seat of the top tier, and the height of the wall behind it */
export const ROOF_CLEARANCE = 6.5;
/** Eye above the seat surface */
export const EYE_HEIGHT = 1.15;
export const STAGE_DECK_HEIGHT = 1.2;
export const STAGE_BACKDROP_HEIGHT = 4.5;

/** Height of a level's seats: `base` at the level's nearest seat, then `rise` meters per meter away from the focal area. */
export const LEVELS: Record<number, { base: number; rise: number }> = {
	0: { base: 0, rise: 0.08 },
	1: { base: 1.5, rise: 0.35 },
	2: { base: 6, rise: 0.55 },
};

export const levelOf = (section: LayoutSection): number => {
	const level = Math.round(Number(section.level ?? 0));
	return Number.isFinite(level) ? Math.min(2, Math.max(0, level)) : 0;
};

/** Canvas point (1000 x 700, y down) to world meters (y up, the stage side is -z). */
export const toWorld = (cx: number, cy: number, scale = SCALE) => ({
	x: (cx - FOCAL_CANVAS.width / 2) * scale,
	z: (cy - FOCAL_CANVAS.height / 2) * scale,
});

/** Real size around a pitch, the map's proportions for a stage */
export const worldScale = (focal: Pick<FocalArea, 'type'>): number => (focal.type === 'PITCH' ? PITCH_SCALE : STAGE_SCALE);

export interface SeatPlacement extends SeatRef {
	key: string;
	section: LayoutSection;
	/** world position of the seat surface center */
	x: number;
	y: number;
	z: number;
	level: number;
}

export interface ViewModel {
	focal: FocalArea;
	/** meters per canvas unit */
	scale: number;
	/** world center of the stage or pitch */
	focalCenter: { x: number; z: number };
	seats: SeatPlacement[];
	bySeat: Map<string, SeatPlacement>;
}

/** Every seat of the layout in world space. Sections without a level read as the floor; a layout without a focal area as the default stage. */
export function buildViewModel(sections: LayoutSection[], focalArea: Partial<FocalArea> | null | undefined): ViewModel {
	const focal = readFocalArea(focalArea);
	const scale = worldScale(focal);
	const riseFactor = scale === PITCH_SCALE ? PITCH_RISE_FACTOR : STAGE_RISE_FACTOR;
	const focalCenter = toWorld(focal.x + focal.width / 2, focal.y + focal.height / 2, scale);
	const raw: Omit<SeatPlacement, 'y'>[] = [];
	for (const section of sections) {
		if (section.kind !== 'SEATED') continue;
		const angle = (section.rotation * Math.PI) / 180;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		for (let row = 1; row <= section.rows; row += 1) {
			for (let number = 1; number <= section.seatsPerRow; number += 1) {
				const c = seatCenter(section, row, number);
				// SVG rotate(): clockwise on a y-down canvas
				const { x, z } = toWorld(section.x + c.x * cos - c.y * sin, section.y + c.x * sin + c.y * cos, scale);
				raw.push({ sectionKey: section.key, row, number, key: seatKey({ sectionKey: section.key, row, number }), section, x, z, level: levelOf(section) });
			}
		}
	}
	// The nearest seat of a level sets that level's base, so a tier is one surface across its sections
	const nearest = new Map<number, number>();
	// Distance to the edge of the stage or pitch, not to its middle: the long and the short side of a pitch start at the same height
	const halfW = (focal.width * scale) / 2;
	const halfD = (focal.height * scale) / 2;
	const distance = (s: { x: number; z: number }) =>
		Math.hypot(Math.max(Math.abs(s.x - focalCenter.x) - halfW, 0), Math.max(Math.abs(s.z - focalCenter.z) - halfD, 0));
	for (const seat of raw) nearest.set(seat.level, Math.min(nearest.get(seat.level) ?? Infinity, distance(seat)));
	const seats: SeatPlacement[] = raw.map((seat) => {
		const spec = LEVELS[seat.level] ?? LEVELS[0];
		return { ...seat, y: spec.base + spec.rise * riseFactor * (distance(seat) - (nearest.get(seat.level) ?? 0)) };
	});
	return { focal, scale, focalCenter, seats, bySeat: new Map(seats.map((seat) => [seat.key, seat])) };
}

/** The canvas stage is a thin bar; in 3D it gets a real depth (up to 12 m) that grows backwards, away from the audience */
export const stageDepthOf = (width: number, depth: number): number => Math.max(depth, Math.min(width * 0.45, 12));

export interface RoomBox {
	minX: number;
	maxX: number;
	minZ: number;
	maxZ: number;
	height: number;
}

/** The walls and ceiling of an indoor venue: every seat and the whole stage with a margin, as high as the top tier plus clearance */
export function roomBox(model: ViewModel): RoomBox {
	const { focal, focalCenter: fc, scale } = model;
	const fw = focal.width * scale;
	const fd = focal.height * scale;
	const backZ = fc.z + fd / 2 - stageDepthOf(fw, fd);
	let minX = fc.x - fw / 2 - 2;
	let maxX = fc.x + fw / 2 + 2;
	let minZ = backZ - 1.5;
	let maxZ = fc.z + fd / 2 + 2;
	let top = 0;
	for (const seat of model.seats) {
		minX = Math.min(minX, seat.x - 3);
		maxX = Math.max(maxX, seat.x + 3);
		minZ = Math.min(minZ, seat.z - 3);
		maxZ = Math.max(maxZ, seat.z + 3);
		top = Math.max(top, seat.y);
	}
	return { minX, maxX, minZ, maxZ, height: Math.max(7.5, top + 5) };
}

export const seatSize = (section: LayoutSection, scale = SCALE) => pitchOf(section) * scale;

/** Chair width: the map's cell, but never bigger than a believable chair (a stadium cell is 3 to 5 m) */
export const chairWidth = (cell: number, scale: number): number => Math.min(cell * 0.78, scale === PITCH_SCALE ? 1.5 : 1);

export interface SectionShell {
	key: string;
	level: number;
	/** the tier on top: it gets a back wall and a roof */
	isTop: boolean;
	cell: number;
	/** length of a row, cell included */
	rowLength: number;
	/** depth of the whole section from the front row to the back row */
	depth: number;
	/** number of rows (steps of an aisle) */
	rows: number;
	/** unit vector from the front row to the back row (away from the stage or pitch) */
	out: { x: number; z: number };
	/** Y rotation that turns a box's x axis along the rows */
	ry: number;
	front: { x: number; z: number; y: number };
	back: { x: number; z: number; y: number };
}

/** Front row, back row and direction of every seated section, for rails, back walls and roofs. Pure, from the seat positions. */
export function sectionShells(model: ViewModel): SectionShell[] {
	const bySection = new Map<string, { section: LayoutSection; rows: Map<number, { x: number; y: number; z: number; n: number }> }>();
	for (const seat of model.seats) {
		let entry = bySection.get(seat.sectionKey);
		if (!entry) bySection.set(seat.sectionKey, (entry = { section: seat.section, rows: new Map() }));
		const row = entry.rows.get(seat.row) ?? { x: 0, y: 0, z: 0, n: 0 };
		row.x += seat.x;
		row.y += seat.y;
		row.z += seat.z;
		row.n += 1;
		entry.rows.set(seat.row, row);
	}
	const topLevel = Math.max(0, ...model.seats.map((seat) => seat.level));
	const fc = model.focalCenter;
	const shells: SectionShell[] = [];
	for (const { section, rows } of bySection.values()) {
		const list = [...rows.values()].map((r) => ({ x: r.x / r.n, y: r.y / r.n, z: r.z / r.n }));
		const dist = (r: { x: number; z: number }) => Math.hypot(r.x - fc.x, r.z - fc.z);
		const front = list.reduce((a, b) => (dist(b) < dist(a) ? b : a));
		const back = list.reduce((a, b) => (dist(b) > dist(a) ? b : a));
		let ox = back.x - front.x;
		let oz = back.z - front.z;
		let len = Math.hypot(ox, oz);
		if (len < 0.01) {
			ox = front.x - fc.x;
			oz = front.z - fc.z;
			len = Math.hypot(ox, oz);
		}
		const out = len < 0.01 ? { x: 0, z: 1 } : { x: ox / len, z: oz / len };
		const cell = seatSize(section, model.scale);
		const level = levelOf(section);
		shells.push({
			key: section.key,
			level,
			isTop: level >= 1 && level === topLevel,
			cell,
			rowLength: section.seatsPerRow * cell + cell,
			depth: Math.hypot(back.x - front.x, back.z - front.z),
			rows: list.length,
			out,
			ry: Math.atan2(-out.x, -out.z),
			front,
			back,
		});
	}
	return shells;
}

/** Where the camera starts: at the seat, level with a seated eye, looking at the middle of the stage top or the pitch. */
export function startCamera(model: ViewModel, seat: SeatPlacement) {
	const eye = { x: seat.x, y: seat.y + EYE_HEIGHT, z: seat.z };
	const dx = model.focalCenter.x - eye.x;
	const dz = model.focalCenter.z - eye.z;
	const flat = Math.hypot(dx, dz);
	const targetY = model.focal.type === 'STAGE' ? STAGE_DECK_HEIGHT + 1 : 0;
	return {
		eye,
		// camera looks down -z at yaw 0
		yaw: flat < 0.01 ? 0 : Math.atan2(-dx, -dz),
		pitch: Math.atan2(targetY - eye.y, Math.max(flat, 0.01)),
	};
}

/**
 * Scenery terraces that close the four corners of a stadium (F405): the stands of a football venue are four separate blocks, and the
 * corners between them were empty ground. For each level that has a stand on all four sides, a block of seats fills the gap between
 * the ends of two neighbouring stands. Keys start with `~`; the scene draws them but they are never a real seat. Pure maths.
 */
export function cornerFill(sections: LayoutSection[], focalArea: Partial<FocalArea> | null | undefined): LayoutSection[] {
	const focal = readFocalArea(focalArea);
	if (focal.type !== 'PITCH') return [];
	const cx = focal.x + focal.width / 2;
	const cy = focal.y + focal.height / 2;
	type Side = 'N' | 'S' | 'E' | 'W';
	const filled: LayoutSection[] = [];
	for (const level of [1, 2]) {
		const sides: Partial<Record<Side, { x0: number; y0: number; x1: number; y1: number; tierKey: string | null }>> = {};
		for (const section of sections) {
			if (section.kind !== 'SEATED' || levelOf(section) !== level) continue;
			const box = sectionBounds(section);
			const dx = (section.x - cx) / focal.width;
			const dy = (section.y - cy) / focal.height;
			const side: Side = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'W' : 'E') : dy < 0 ? 'N' : 'S';
			const known = sides[side];
			sides[side] = {
				x0: Math.min(known?.x0 ?? Infinity, box.x),
				y0: Math.min(known?.y0 ?? Infinity, box.y),
				x1: Math.max(known?.x1 ?? -Infinity, box.x + box.w),
				y1: Math.max(known?.y1 ?? -Infinity, box.y + box.h),
				tierKey: known?.tierKey ?? section.tierKey ?? null,
			};
		}
		const { N, S, E, W } = sides;
		if (!N || !S || !E || !W) continue;
		const cell = CELL.COMPACT;
		const add = (name: string, x0: number, x1: number, y0: number, y1: number, tierKey: string | null) => {
			const seatsPerRow = Math.floor((x1 - x0) / cell);
			const rows = Math.floor((y1 - y0) / cell);
			if (seatsPerRow < 2 || rows < 2) return;
			filled.push({ key: `~${level}${name}`, name: '', kind: 'SEATED', rows, seatsPerRow, x: (x0 + x1) / 2, y: (y0 + y1) / 2, rotation: 0, spacing: 'COMPACT', tierKey, level });
		};
		add('NW', W.x0, N.x0, N.y0, W.y0, N.tierKey);
		add('NE', N.x1, E.x1, N.y0, E.y0, N.tierKey);
		add('SW', W.x0, S.x0, W.y1, S.y1, S.tierKey);
		add('SE', S.x1, E.x1, E.y1, S.y1, S.tierKey);
	}
	return filled;
}

export type TimeOfDay = 'day' | 'dusk' | 'night';

/** The light outside at the time of the event, in the venue's time zone: day from 07:00, dusk from 17:00, night from 20:00 (F407) */
export function timeOfDayAt(startAt: string | null | undefined, timeZone: string | null | undefined): TimeOfDay | undefined {
	if (!startAt) return undefined;
	const date = new Date(startAt);
	if (Number.isNaN(date.getTime())) return undefined;
	let hour: number;
	try {
		hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: timeZone || undefined }).format(date)) % 24;
	} catch {
		hour = date.getHours();
	}
	if (!Number.isFinite(hour)) return undefined;
	return hour >= 7 && hour < 17 ? 'day' : hour >= 17 && hour < 20 ? 'dusk' : 'night';
}

export interface StadiumRing {
	minX: number;
	maxX: number;
	minZ: number;
	maxZ: number;
	/** corner radius of the facade ring */
	radius: number;
	/** the opening of the roof: the lower tiers and the pitch stay under the sky */
	hole: { minX: number; maxX: number; minZ: number; maxZ: number; radius: number };
	/** height of the roof ring */
	roofY: number;
}

/**
 * The oval ring around a stadium (F407): a facade just outside every seat (corner terraces included) with rounded corners, and a roof
 * ring between the facade and the lower tiers. Pure maths; `null` when there are no seats.
 */
export function stadiumRing(model: ViewModel): StadiumRing | null {
	if (!model.seats.length) return null;
	let minX = Infinity;
	let maxX = -Infinity;
	let minZ = Infinity;
	let maxZ = -Infinity;
	let top = 0;
	let low = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
	for (const seat of model.seats) {
		minX = Math.min(minX, seat.x);
		maxX = Math.max(maxX, seat.x);
		minZ = Math.min(minZ, seat.z);
		maxZ = Math.max(maxZ, seat.z);
		top = Math.max(top, seat.y);
		if (seat.level === 1) low = { minX: Math.min(low.minX, seat.x), maxX: Math.max(low.maxX, seat.x), minZ: Math.min(low.minZ, seat.z), maxZ: Math.max(low.maxZ, seat.z) };
	}
	const radius = Math.min(26, 0.12 * Math.min(maxX - minX, maxZ - minZ));
	// at 45 degrees the arc is 0.29 r inside the corner of its box: keep the outermost seat clear of it
	const margin = radius * 0.3 + 2;
	const hasLow = Number.isFinite(low.minX);
	const inset = 18;
	const hole = hasLow
		? { minX: low.minX - 2, maxX: low.maxX + 2, minZ: low.minZ - 2, maxZ: low.maxZ + 2, radius: Math.min(radius, 18) }
		: { minX: minX + inset, maxX: maxX - inset, minZ: minZ + inset, maxZ: maxZ - inset, radius: Math.min(radius, 12) };
	return { minX: minX - margin, maxX: maxX + margin, minZ: minZ - margin, maxZ: maxZ + margin, radius: radius + margin * 0.6, hole, roofY: top + ROOF_CLEARANCE };
}
