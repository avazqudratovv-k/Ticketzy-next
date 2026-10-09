import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import SeatMap from '../seats/SeatMap';
import { tierColor, tierIndexes } from '../../seats/layout';
import { LayoutSection } from '../../seats/types';
import { formatNumber } from '../../format';
import { AdminTicketType, AdminVenue } from '../../admin/types';

const NO_TAKEN = new Map();
const NO_SET = new Set<string>();
const noop = () => undefined;

/** The venue's seat layout, drawn by the buyers' seat map with nothing sold or selected. Tier colours match the legend and the ticket types. */
const EventLayoutPreview = ({ venue, ticketTypes }: { venue: AdminVenue; ticketTypes: AdminTicketType[] | null }) => {
	const { t } = useTranslation('admin');
	const { locale } = useRouter();
	const sections = useMemo(() => (venue.venueLayout?.sections ?? []) as LayoutSection[], [venue]);
	const tiers = useMemo(() => tierIndexes(sections), [sections]);
	const legend = useMemo(() => {
		const map = new Map<string, { seats: number; sections: number }>();
		sections.forEach((section) => {
			if (!section.tierKey) return;
			const entry = map.get(section.tierKey) ?? { seats: 0, sections: 0 };
			entry.seats += section.kind === 'SEATED' ? section.rows * section.seatsPerRow : section.capacity ?? 0;
			entry.sections += 1;
			map.set(section.tierKey, entry);
		});
		return Array.from(map);
	}, [sections]);

	if (!sections.length) return <p className="adm-muted">{t('event.layout.empty')}</p>;

	return (
		<div className="adm-layout">
			<SeatMap
				sections={sections}
				tiers={tiers}
				taken={NO_TAKEN}
				selected={NO_SET}
				lockedTiers={NO_SET}
				activeSection={null}
				tooltip={() => null}
				onSeat={noop}
				onSection={noop}
				focusSection={null}
			/>
			<ul className="ve__legend" aria-label={t('event.layout.tiers')}>
				{legend.map(([key, info]) => {
					const ticket = ticketTypes?.find((tt) => tt.tierKey === key);
					return (
						<li key={key}>
							<span className="ve__swatch" style={{ background: tierColor(tiers.get(key)) }} aria-hidden="true" />
							<strong>{ticket?.ticketTypeName ?? key}</strong> {t('event.layout.tierSeats', { seats: formatNumber(info.seats, locale), count: info.sections })}
						</li>
					);
				})}
			</ul>
		</div>
	);
};

export default EventLayoutPreview;
