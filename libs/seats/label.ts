import { TFunction } from 'next-i18next';
import { LayoutSection } from './types';

/** Section key -> display name, from the event's venue layout. */
export type SectionNames = ReadonlyMap<string, string>;

export const sectionNamesOf = (sections: readonly Pick<LayoutSection, 'key' | 'name'>[] | undefined): SectionNames =>
	new Map((sections ?? []).map((section) => [section.key, section.name]));

interface SeatPlace {
	sectionKey: string;
	row: number;
	number: number;
}

/**
 * The one way a seat is written for the buyer: "Upper East, row 7, seat 12".
 * Section keys and tier keys ("UPPER_E") are ids, never text, so while the name is not known
 * (layout still loading, or the event is gone) the label is just "Row 7, seat 12".
 * `short` is that row and seat part alone, `section` the name (or undefined) for a second line.
 */
export function seatParts(t: TFunction, seat: SeatPlace, names?: SectionNames) {
	const section = names?.get(seat.sectionKey) || undefined;
	const short = String(t('common:seatLabel.short', { row: seat.row, number: seat.number }));
	const full = section ? String(t('common:seatLabel.full', { section, row: seat.row, number: seat.number })) : short;
	return { section, short, full };
}

export const seatLabel = (t: TFunction, seat: SeatPlace, names?: SectionNames): string => seatParts(t, seat, names).full;
