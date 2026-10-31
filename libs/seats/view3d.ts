import { FocalArea, LayoutSection, SeatRef } from './types';
import { pitchOf, seatCenter, seatKey } from './layout';
import { FOCAL_CANVAS, readFocalArea } from './focal';

/** "View from your seat" (F391): pure maths from the layout to 3D positions. No `three` here, so it stays out of every bundle until the scene loads. */

/** Meters per canvas unit: the 1000 x 700 canvas becomes 100 x 70 m. */
export const SCALE = 0.1;
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
export const toWorld = (cx: number, cy: number) => ({
	x: (cx - FOCAL_CANVAS.width / 2) * SCALE,
	z: (cy - FOCAL_CANVAS.height / 2) * SCALE,
});

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
	/** world center of the stage or pitch */
	focalCenter: { x: number; z: number };
	seats: SeatPlacement[];
	bySeat: Map<string, SeatPlacement>;
}

/** Every seat of the layout in world space. Sections without a level read as the floor; a layout without a focal area as the default stage. */
export function buildViewModel(sections: LayoutSection[], focalArea: Partial<FocalArea> | null | undefined): ViewModel {
	const focal = readFocalArea(focalArea);
	const focalCenter = toWorld(focal.x + focal.width / 2, focal.y + focal.height / 2);
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
				const { x, z } = toWorld(section.x + c.x * cos - c.y * sin, section.y + c.x * sin + c.y * cos);
				raw.push({ sectionKey: section.key, row, number, key: seatKey({ sectionKey: section.key, row, number }), section, x, z, level: levelOf(section) });
			}
		}
	}
	// The nearest seat of a level sets that level's base, so a tier is one surface across its sections
	const nearest = new Map<number, number>();
	const distance = (s: { x: number; z: number }) => Math.hypot(s.x - focalCenter.x, s.z - focalCenter.z);
	for (const seat of raw) nearest.set(seat.level, Math.min(nearest.get(seat.level) ?? Infinity, distance(seat)));
	const seats: SeatPlacement[] = raw.map((seat) => {
		const spec = LEVELS[seat.level] ?? LEVELS[0];
		return { ...seat, y: spec.base + spec.rise * (distance(seat) - (nearest.get(seat.level) ?? 0)) };
	});
	return { focal, focalCenter, seats, bySeat: new Map(seats.map((seat) => [seat.key, seat])) };
}

export const seatSize = (section: LayoutSection) => pitchOf(section) * SCALE;

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
