import { DraftSection, Layout, newId } from './model';

export const TEMPLATE_IDS = ['theater', 'stadium', 'club'] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

type Seed = Omit<DraftSection, 'id' | 'name'> & { name: string };

const seated = (key: string, name: string, tierKey: string, rows: number, seatsPerRow: number, x: number, y: number, spacing: DraftSection['spacing'] = 'NORMAL', rotation = 0): Seed => ({
	key,
	name,
	kind: 'SEATED',
	rows,
	seatsPerRow,
	capacity: null,
	x,
	y,
	rotation,
	spacing,
	tierKey,
});
const standing = (key: string, name: string, capacity: number, x: number, y: number): Seed => ({
	key,
	name,
	kind: 'STANDING',
	rows: 1,
	seatsPerRow: 1,
	capacity,
	x,
	y,
	rotation: 0,
	spacing: 'COMPACT',
	tierKey: '',
});

/** `n(key)` returns the translated section name (organizer.json, venues.templates.<id>.sections.<key>). */
export function buildTemplate(id: TemplateId, n: (key: string) => string): Layout {
	let seeds: Seed[] = [];
	if (id === 'theater') {
		seeds = [
			seated('FRONT', n('FRONT'), 'VIP', 2, 14, 500, 100),
			seated('ORCH_C', n('ORCH_C'), 'ORCHESTRA', 8, 14, 500, 210),
			seated('ORCH_L', n('ORCH_L'), 'ORCHESTRA', 8, 5, 300, 210),
			seated('ORCH_R', n('ORCH_R'), 'ORCHESTRA', 8, 5, 700, 210),
			seated('BALCONY', n('BALCONY'), 'BALCONY', 5, 26, 500, 420, 'COMPACT'),
		];
	} else if (id === 'stadium') {
		seeds = [
			standing('FLOOR', n('FLOOR'), 1000, 500, 350),
			seated('NORTH', n('NORTH'), 'GOLD', 6, 24, 500, 110),
			seated('SOUTH', n('SOUTH'), 'GOLD', 6, 24, 500, 590, 'NORMAL', 180),
			seated('EAST', n('EAST'), 'STANDARD', 6, 20, 860, 350, 'COMPACT', 90),
			seated('WEST', n('WEST'), 'STANDARD', 6, 20, 140, 350, 'COMPACT', 270),
		];
	} else {
		const front = [250, 420, 580, 750].map((x, i) => seated(`T${i + 1}`, `${n('TABLE')} ${i + 1}`, 'FRONT', 2, 3, x, 220, 'WIDE'));
		const back = [250, 420, 580, 750].map((x, i) => seated(`T${i + 5}`, `${n('TABLE')} ${i + 5}`, 'STANDARD', 2, 3, x, 380));
		seeds = [...front, ...back, standing('BAR', n('BAR'), 30, 500, 540)];
	}
	return seeds.map((seed) => ({ ...seed, id: newId() }));
}
