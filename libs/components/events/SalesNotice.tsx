import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { Info } from 'phosphor-react';
import { formatSalesMoment } from '../../format';
import { salesInfo } from '../../salesWindow';
import { EventItem, TicketTypeItem } from '../../types/event';

interface Props {
	event: Pick<EventItem, 'saleStartAt' | 'saleEndAt' | 'venueData'>;
	ticketTypes: TicketTypeItem[] | undefined;
	/** server time from `useSalesClock`, so the notice goes away by itself when sales open */
	now: number;
	/** inside the ticket box: no framed alert, and ticket types already show their own start */
	compact?: boolean;
}

/**
 * "Ticket sales start on Sat, 10 Oct 2026 at 10:00 (Asia/Seoul)." or "Ticket sales ended on ...". Nothing when sales are
 * open. A status message (`role="status"`); with several start times it names the earliest and lists the later ones.
 */
const SalesNotice = ({ event, ticketTypes, now, compact }: Props) => {
	const { t } = useTranslation('events');
	const { locale } = useRouter();
	const info = salesInfo(event, ticketTypes, now);
	if (info.phase === 'open' || !info.at) return null;
	const zone = event.venueData?.venueTimezone;
	const started = info.phase === 'notStarted';
	return (
		<div className={`sales-notice${compact ? ' sales-notice--compact' : ''}`} role="status">
			<Info size={18} weight="bold" aria-hidden="true" />
			<div>
				<p className="sales-notice__line">{t(started ? 'sales.startsOn' : 'sales.endedOn', formatSalesMoment(info.at, locale, zone))}</p>
				{started && !compact && info.later.length > 0 && (
					<ul className="sales-notice__later">
						{info.later.map((entry) => (
							<li key={entry.id}>{t('sales.typeStarts', { name: entry.name, ...formatSalesMoment(entry.at, locale, zone) })}</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
};

export default SalesNotice;
