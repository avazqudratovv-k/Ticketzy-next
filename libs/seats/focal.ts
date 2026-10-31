import { FocalArea, FocalAreaType } from './types';

/** The canvas of a venue layout (backend `LAYOUT_CANVAS`, libs/focal-area.ts). */
export const FOCAL_CANVAS = { width: 1000, height: 700 } as const;

/** A layout with no stored focal area reads as this "Stage" bar (backend `DEFAULT_STAGE`). */
export const DEFAULT_STAGE: FocalArea = { type: 'STAGE', x: 340, y: 4, width: 320, height: 22 };

/** A PITCH is always this box, exactly 105:68, and the server refuses any other geometry (backend `FIXED_PITCH`). */
export const FIXED_PITCH: FocalArea = { type: 'PITCH', x: 290, y: 214, width: 420, height: 272 };

export const MIN_STAGE = { width: 20, height: 10 } as const;

export const isPitch = (focal: Pick<FocalArea, 'type'> | null | undefined): boolean => focal?.type === 'PITCH';

/** What to draw for a layout: the stored focal area, the fixed pitch for a PITCH, or the default stage when there is none. */
export function readFocalArea(focal: Partial<FocalArea> | null | undefined): FocalArea {
	if (!focal || (focal.type !== 'STAGE' && focal.type !== 'PITCH')) return { ...DEFAULT_STAGE };
	if (focal.type === 'PITCH') return { ...FIXED_PITCH };
	const ok = [focal.x, focal.y, focal.width, focal.height].every((n) => typeof n === 'number' && Number.isFinite(n));
	return ok ? { type: 'STAGE', x: focal.x!, y: focal.y!, width: focal.width!, height: focal.height! } : { ...DEFAULT_STAGE };
}

/** `FocalAreaInput`: a PITCH carries no geometry (the server fixes it), a STAGE carries all four numbers. */
export function focalToInput(focal: FocalArea) {
	if (focal.type === 'PITCH') return { type: 'PITCH' as FocalAreaType };
	return { type: 'STAGE' as FocalAreaType, x: focal.x, y: focal.y, width: focal.width, height: focal.height };
}

export const sameFocal = (a: FocalArea, b: FocalArea): boolean =>
	a.type === b.type && (a.type === 'PITCH' || (a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height));

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Keeps a STAGE inside the canvas and at least the minimum size. The result is whole numbers. */
export function clampStage(stage: FocalArea): FocalArea {
	const width = clamp(Math.round(stage.width), MIN_STAGE.width, FOCAL_CANVAS.width);
	const height = clamp(Math.round(stage.height), MIN_STAGE.height, FOCAL_CANVAS.height);
	return {
		type: 'STAGE',
		width,
		height,
		x: clamp(Math.round(stage.x), 0, FOCAL_CANVAS.width - width),
		y: clamp(Math.round(stage.y), 0, FOCAL_CANVAS.height - height),
	};
}
