import { FocalArea } from './types';

/**
 * The decoration around a football pitch (F400): run-off, advertising boards, two dugouts and the players' tunnel. Canvas units,
 * one source for the 2D map and the 3D view. It is drawn only, never selectable and never saved. Everything stays within
 * `SURROUND_REACH` of the pitch edge; the stands sit 17 units from it in the server template (15 in migrated venues).
 */
export const RUNOFF = 8;
export const BOARD = 3;
export const TUNNEL_WIDTH = 24;
export const TUNNEL_DEPTH = 3;
/** how far the tunnel mouth reaches from the pitch edge, into the stand side */
export const SURROUND_REACH = RUNOFF + BOARD + TUNNEL_DEPTH;
export const DUGOUT_WIDTH = 50;
export const DUGOUT_DEPTH = 5;
/** distance of each dugout's middle from the halfway line */
export const DUGOUT_OFFSET = 70;

export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface PitchSurround {
	/** the darker run-off, pitch included */
	runoff: Rect;
	boards: Rect[];
	dugouts: Rect[];
	tunnel: Rect;
}

/**
 * The dugouts and the tunnel are on the top long side (the north touchline): the name labels of the stands sit above each
 * plate, so on the south side they would cover the dugouts.
 */
export function pitchSurround(pitch: Pick<FocalArea, 'x' | 'y' | 'width' | 'height'>): PitchSurround {
	const { x, y, width: w, height: h } = pitch;
	const cx = x + w / 2;
	const reach = RUNOFF + BOARD;
	const top = y - RUNOFF;
	const half = TUNNEL_WIDTH / 2;
	const left = x - reach;
	const right = x + w + reach;
	return {
		runoff: { x: x - RUNOFF, y: y - RUNOFF, w: w + RUNOFF * 2, h: h + RUNOFF * 2 },
		boards: [
			{ x: left, y: y + h + RUNOFF, w: right - left, h: BOARD },
			{ x: left, y: y - RUNOFF, w: BOARD, h: h + RUNOFF * 2 },
			{ x: x + w + RUNOFF, y: y - RUNOFF, w: BOARD, h: h + RUNOFF * 2 },
			{ x: left, y: top - BOARD, w: cx - half - left, h: BOARD },
			{ x: cx + half, y: top - BOARD, w: right - cx - half, h: BOARD },
		],
		dugouts: [-1, 1].map((side) => ({ x: cx + side * DUGOUT_OFFSET - DUGOUT_WIDTH / 2, y: top, w: DUGOUT_WIDTH, h: DUGOUT_DEPTH })),
		tunnel: { x: cx - half, y: top - BOARD - TUNNEL_DEPTH, w: TUNNEL_WIDTH, h: BOARD + TUNNEL_DEPTH },
	};
}

/** Regulation markings scaled to the pitch box (105 x 68 m). Distances in canvas units. */
export function pitchMarkings(pitch: Pick<FocalArea, 'width' | 'height'>) {
	const mx = pitch.width / 105;
	const my = pitch.height / 68;
	const circle = 9.15 * mx;
	const penaltyW = 16.5 * mx;
	const spot = 11 * mx;
	// the arc of the penalty area: where the circle around the spot crosses the box's front line
	const arcDy = Math.sqrt(Math.max(0, circle * circle - (penaltyW - spot) ** 2));
	return {
		circle,
		penalty: { w: penaltyW, h: 40.3 * my },
		goalBox: { w: 5.5 * mx, h: 18.3 * my },
		spot,
		arcDy,
		goal: { w: 7.32 * my, depth: Math.min(RUNOFF - 2, 2.44 * mx) },
	};
}
