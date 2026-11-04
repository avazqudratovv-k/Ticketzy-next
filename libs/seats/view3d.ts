import { FocalArea, LayoutSection, SeatRef } from './types';
import { pitchOf, seatCenter, seatKey } from './layout';
import { FOCAL_CANVAS, readFocalArea } from './focal';

/** "View from your seat" (F391): pure maths from the layout to 3D positions. No `three` here, so it stays out of every bundle until the scene loads. */

/** Meters per canvas unit for a STAGE venue: the 1000 x 700 canvas becomes 100 x 70 m. */
export const SCALE = 0.1;
/** Meters per canvas unit around a PITCH: the fixed 420 x 272 pitch becomes a real 105 x 68 m (F401). */
export const PITCH_SCALE = 0.25;
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
export const worldScale = (focal: Pick<FocalArea, 'type'>): number => (focal.type === 'PITCH' ? PITCH_SCALE : SCALE);

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
	const riseFactor = scale === PITCH_SCALE ? PITCH_RISE_FACTOR : 1;
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
