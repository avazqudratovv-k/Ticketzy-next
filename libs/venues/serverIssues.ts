import { Described } from '../organizer/errors';
import { Layout, IssueCode, LIMITS } from './model';

export interface ServerIssue {
	/** A rule the editor knows (shown translated) */
	code?: IssueCode;
	/** The server's own words, for a rule the editor does not know */
	raw?: string;
}

const isGrid = (n: number) => Number.isInteger(n) && n >= LIMITS.grid.min && n <= LIMITS.grid.max;

/**
 * Puts a server error on the sections it is about. The DTO validator names the section by index
 * ("venueLayout.sections.2.rows must not be greater than 100"); the layout rules of `getVenueLayoutError` give no index,
 * so they are matched to the sections that break them. Anything that stays unplaced is shown with the form.
 */
export function placeServerError(error: Described, layout: Layout): { bySection: Map<string, ServerIssue[]>; placed: boolean } {
	const bySection = new Map<string, ServerIssue[]>();
	const add = (id: string, issue: ServerIssue) => bySection.set(id, [...(bySection.get(id) ?? []), issue]);

	for (const line of error.raw.split(/(?<=\w)\s(?=venueLayout\.)/)) {
		const match = /sections\.(\d+)\.(\w+)/.exec(line);
		const section = match ? layout[Number(match[1])] : undefined;
		if (section) add(section.id, { raw: line.replace(/^venueLayout\.sections\.\d+\./, '') });
	}

	switch (error.key) {
		case 'layoutDuplicateKey': {
			const count = new Map<string, number>();
			layout.forEach((s) => count.set(s.key.trim(), (count.get(s.key.trim()) ?? 0) + 1));
			layout.filter((s) => (count.get(s.key.trim()) ?? 0) > 1).forEach((s) => add(s.id, { code: 'keyDuplicate' }));
			break;
		}
		case 'layoutBadGrid':
			layout.filter((s) => s.kind === 'SEATED' && (!isGrid(s.rows) || !isGrid(s.seatsPerRow))).forEach((s) => add(s.id, { code: !isGrid(s.rows) ? 'rowsRange' : 'seatsRange' }));
			break;
		case 'layoutCapacity':
			layout.filter((s) => s.kind === 'STANDING' && !(Number.isInteger(s.capacity) && (s.capacity as number) >= 1)).forEach((s) => add(s.id, { code: 'capacityRange' }));
			break;
		case 'layoutTier':
			layout.filter((s) => s.kind === 'SEATED' && !s.tierKey.trim()).forEach((s) => add(s.id, { code: 'tierRequired' }));
			break;
		default:
			break;
	}
	return { bySection, placed: bySection.size > 0 };
}
