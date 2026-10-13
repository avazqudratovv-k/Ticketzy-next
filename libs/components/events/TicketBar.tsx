import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { Button } from '@mui/material';
import { formatEventDate, formatPrice } from '../../format';
import { SaleState } from '../../events';
import { salesInfo } from '../../salesWindow';
import useStickyBar from '../../hooks/useStickyBar';
import { EventItem, TicketTypeItem } from '../../types/event';

/** id of the ticket box (`TicketPanel`) the bar leads to */
export const TICKET_BOX_ID = 'ticket-box';

interface Props {
	event: EventItem;
	ticketTypes: TicketTypeItem[];
	state: SaleState;
	now: number;
}

/**
 * Phones and tablets: a bottom bar "From ₩x" + "View tickets" while the ticket box is out of view. The label and the
 * blocked state come from the same `saleState` the ticket box uses; the bar adds no rule of its own.
 */
const TicketBar = ({ event, ticketTypes, state, now }: Props) => {
	const { t } = useTranslation('events');
	const { locale } = useRouter();
	const [boxVisible, setBoxVisible] = useState(true);
	// cancelled and ended events already say so in the banner; the bar would only repeat it
	const wanted = state !== 'cancelled' && state !== 'ended';
	const shown = wanted && !boxVisible;
	useStickyBar(shown);

	useEffect(() => {
		const box = document.getElementById(TICKET_BOX_ID);
		if (!box || typeof IntersectionObserver === 'undefined') return undefined;
		const observer = new IntersectionObserver(([entry]) => setBoxVisible(entry.isIntersecting));
		observer.observe(box);
		return () => observer.disconnect();
	}, [wanted]);

	if (!wanted) return null;

	const open = state === 'onSale' || state === 'notStarted';
	const sales = salesInfo(event, ticketTypes, now);
	const zone = event.venueData?.venueTimezone;

	const scrollToBox = () => {
		const box = document.getElementById(TICKET_BOX_ID);
		if (!box) return;
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
		// Keyboard and screen reader users arrive at the box, not just near it
		box.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
	};

	return (
		<div className={`tz-bar tz-bar--toggle${shown ? ' is-shown' : ''}`} role="group" aria-label={t('detail.barLabel')}>
			{open && (
				<div className="tz-bar__info">
					{state === 'notStarted' && sales.at ? (
						<span className="tz-bar__value tz-bar__value--sm">{t('detail.salesStart', { date: formatEventDate(sales.at, locale, zone) })}</span>
					) : (
						<>
							<span className="tz-bar__label">{t('card.from')}</span>
							<span className="tz-bar__value">{formatPrice(event.eventMinPrice, locale)}</span>
						</>
					)}
				</div>
			)}
			<Button
				variant="contained"
				size="large"
				className="tz-bar__action"
				aria-disabled={open ? undefined : true}
				onClick={open ? scrollToBox : undefined}
				tabIndex={shown ? undefined : -1}
			>
				{open ? t('detail.viewTickets') : t(`detail.unavailable.${state}`)}
			</Button>
		</div>
	);
};

export default TicketBar;
