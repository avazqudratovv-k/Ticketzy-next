import { LayoutSection, SeatRef, SectionSpacing, TakenSeat } from './types';

/** Distance between seat centers on the 1000 x 700 canvas the sections are placed on. */
export const PITCH: Record<SectionSpacing, number> = { COMPACT: 13, NORMAL: 16, WIDE: 21 };
export const SEAT_FILL = 0.78;

export const seatKey = (ref: SeatRef) => `${ref.sectionKey}:${ref.row}:${ref.number}`;

export const pitchOf = (section: LayoutSection) => PITCH[section.spacing] ?? PITCH.NORMAL;

/** Size of a STANDING area drawn from its capacity (area grows with the capacity, drawn on the same canvas). */
export function standingSize(section: LayoutSection): { w: number; h: number } {
	const capacity = section.capacity ?? 100;
	const w = Math.min(460, Math.max(130, Math.sqrt(capacity) * 9));
	return { w, h: w * 0.6 };
}

/** Local size of a section before rotation. */
export function sectionSize(section: LayoutSection): { w: number; h: number } {
	if (section.kind === 'STANDING') return standingSize(section);
	const pitch = pitchOf(section);
	return { w: section.seatsPerRow * pitch, h: section.rows * pitch };
}

/**
 * Center of a seat inside its section, before the section's rotation. Row 1 is the row nearest the stage (top at
 * rotation 0, the design's seat map editor), seat 1 is on the left.
 */
export function seatCenter(section: LayoutSection, row: number, number: number) {
	const pitch = pitchOf(section);
	return {
		x: (number - (section.seatsPerRow + 1) / 2) * pitch,
		y: (row - (section.rows + 1) / 2) * pitch,
	};
}

/** Axis-aligned bounds of the whole layout (rotated sections included) with a margin; the map fits to this box. */
export function layoutBounds(sections: LayoutSection[], margin = 36) {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const section of sections) {
		const box = sectionBounds(section);
		minX = Math.min(minX, box.x);
		minY = Math.min(minY, box.y);
		maxX = Math.max(maxX, box.x + box.w);
		maxY = Math.max(maxY, box.y + box.h);
	}
	if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 1000, h: 700 };
	// The label above each section needs room
	return { x: minX - margin, y: minY - margin - 14, w: maxX - minX + margin * 2, h: maxY - minY + margin * 2 + 14 };
}

/** Bounds of one rotated section on the canvas, including the room its label takes above it. */
export function sectionBounds(section: LayoutSection) {
	const { w, h } = sectionSize(section);
	const angle = (section.rotation * Math.PI) / 180;
	const cos = Math.abs(Math.cos(angle));
	const sin = Math.abs(Math.sin(angle));
	const bw = w * cos + h * sin;
	const bh = w * sin + h * cos;
	return { x: section.x - bw / 2, y: section.y - bh / 2, w: bw, h: bh };
}

/** Where the "Stage" bar goes: at the top, unless the layout has a standing area (that is the floor itself). */
export const hasStage = (sections: LayoutSection[]) => !sections.some((section) => section.kind === 'STANDING');

/** The CSS color class index of a tier: tiers are numbered by the order of their first section. */
export function tierIndexes(sections: LayoutSection[]): Map<string, number> {
	const map = new Map<string, number>();
	for (const section of sections) {
		if (section.kind === 'SEATED' && section.tierKey && !map.has(section.tierKey)) map.set(section.tierKey, map.size);
	}
	return map;
}
export const TIER_COLORS = ['var(--tier-1)', 'var(--tier-2)', 'var(--tier-3)', '#f59e0b', '#34d399', '#f472b6'];
export const tierColor = (index: number | undefined) => TIER_COLORS[(index ?? 0) % TIER_COLORS.length];

export const totalSeats = (section: LayoutSection) => (section.kind === 'SEATED' ? section.rows * section.seatsPerRow : 0);

export const takenMap = (seats: TakenSeat[]) => new Map(seats.map((seat) => [seatKey(seat), seat]));

/** Seats of a list that are `HELD` by the member (the "mine" flag), in a stable order. */
export const compareSeats = (a: SeatRef, b: SeatRef) =>
	a.sectionKey.localeCompare(b.sectionKey) || a.row - b.row || a.number - b.number;
