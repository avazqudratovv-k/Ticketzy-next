import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { formatPrice } from '../../format';
import { seatKey, tierColor } from '../../seats/layout';
import { LayoutSection, SeatRef, TakenSeat } from '../../seats/types';

export interface SectionInfo {
	section: LayoutSection;
	tierIndex?: number;
	price?: number;
	ticketName?: string;
	currency?: string;
	free: number;
	total: number;
	/** Cannot be bought (ticket type paused, closed or missing) */
	locked: boolean;
}

interface ListProps {
	items: SectionInfo[];
	active: string | null;
	onPick: (key: string) => void;
}

/** Keyboard-accessible alternative to clicking the map: one button per section. */
export const SectionList = ({ items, active, onPick }: ListProps) => {
	const { t } = useTranslation('checkout');
	const { locale } = useRouter();
	return (
		<ul className="sections">
			{items.map(({ section, tierIndex, price, currency, free, total, locked }) => {
				const standing = section.kind === 'STANDING';
				const soldOut = !standing && free === 0;
				return (
					<li key={section.key}>
						<button
							type="button"
							className={`sections__item${active === section.key ? ' is-active' : ''}`}
							aria-pressed={active === section.key}
							disabled={standing}
							onClick={() => onPick(section.key)}
						>
							{!standing && <span className="sections__swatch" style={{ background: tierColor(tierIndex) }} aria-hidden="true" />}
							<span className="sections__text">
								<span className="sections__name">{section.name}</span>
								<span className="sections__meta">
									{standing
										? t('map.standingNote')
										: soldOut
										? t('sections.soldOut')
										: locked
										? t('sections.unavailable')
										: t('sections.free', { free, total })}
								</span>
							</span>
							{!standing && price !== undefined && (
								<span className="sections__price">{formatPrice(price, locale, currency)}</span>
							)}
						</button>
					</li>
				);
			})}
		</ul>
	);
};

interface GridProps {
	info: SectionInfo;
	taken: Map<string, TakenSeat>;
	selected: Set<string>;
	onSeat: (ref: SeatRef) => void;
	disabled: boolean;
}

/** The seats of one section as real buttons, for keyboards and screen readers (the map itself is a picture). */
export const SeatGrid = ({ info, taken, selected, onSeat, disabled }: GridProps) => {
	const { t } = useTranslation('checkout');
	const { section } = info;
	const rows = Array.from({ length: section.rows }, (_, i) => i + 1);
	const numbers = Array.from({ length: section.seatsPerRow }, (_, i) => i + 1);
	return (
		<div className="seatgrid" role="group" aria-label={t('grid.label', { section: section.name })}>
			{rows.map((row) => (
				<div className="seatgrid__row" key={row} role="group" aria-label={t('seat.row', { row })}>
					<span className="seatgrid__label" aria-hidden="true">
						{row}
					</span>
					{numbers.map((number) => {
						const ref = { sectionKey: section.key, row, number };
						const key = seatKey(ref);
						const seat = taken.get(key);
						const isSelected = selected.has(key);
						const unavailable = Boolean(seat && !seat.mine) || info.locked || disabled;
						const state = isSelected
							? 'selected'
							: seat
							? seat.mine
								? 'mine'
								: seat.seatStatus === 'SOLD'
								? 'sold'
								: 'held'
							: 'available';
						return (
							<button
								type="button"
								key={number}
								className={`seatgrid__seat seatgrid__seat--${state}`}
								aria-pressed={isSelected}
								disabled={unavailable && !isSelected}
								aria-label={t('seat.aria', { row, number, state: t(`state.${state}`) })}
								onClick={() => onSeat(ref)}
							>
								{number}
							</button>
						);
					})}
				</div>
			))}
		</div>
	);
};
