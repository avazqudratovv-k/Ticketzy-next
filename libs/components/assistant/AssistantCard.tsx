import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { CalendarBlank, MapPin } from 'phosphor-react';
import { AssistantEvent } from '../../types/assistant';
import { localizedEvent } from '../../events';
import { formatEventWhen, formatPrice } from '../../format';
import { eventUrl } from '../../routes';
import EventImage from '../events/EventImage';

/** An event the assistant found: the row card of the design, one link to the event page. */
const AssistantCard = ({ event, onNavigate }: { event: AssistantEvent; onNavigate: () => void }) => {
	const { t } = useTranslation('common');
	const { locale } = useRouter();
	const { title, lang, translated } = localizedEvent({ ...event, eventDesc: null }, locale);
	const venue = event.venueData;
	const when = formatEventWhen(event.startAt, event.endAt, locale, venue?.venueTimezone);

	return (
		<Link href={eventUrl(event._id)} className="tz-event-card tz-event-card--row pg-chatcard" onClick={onNavigate}>
			<span className="tz-media">
				<EventImage src={event.eventImages?.[0]} />
			</span>
			<span className="tz-event-card__body">
				<span className="tz-event-card__title tz-clamp-2" lang={translated ? undefined : lang}>
					{title}
				</span>
				<ul className="tz-event-card__meta">
					<li>
						<CalendarBlank size={16} aria-hidden="true" />
						<span className="tz-clamp-1">{when}</span>
					</li>
					{venue && (
						<li>
							<MapPin size={16} aria-hidden="true" />
							<span className="tz-clamp-1">{`${venue.venueName}, ${venue.venueCity}`}</span>
						</li>
					)}
				</ul>
				<span className="tz-event-card__foot">
					<span className="tz-price tz-price--sm">
						<span className="tz-price__label">{t('assistant.card.from')}</span>
						<span className="tz-price__amount">{formatPrice(event.eventMinPrice, locale)}</span>
					</span>
					<span className="tz-link">{t('assistant.card.view')}</span>
				</span>
			</span>
		</Link>
	);
};

export default AssistantCard;
