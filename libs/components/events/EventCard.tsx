import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { CalendarBlank, MapPin } from 'phosphor-react';
import { EventItem } from '../../types/event';
import { localizedEvent } from '../../events';
import { formatEventWhen, formatPrice } from '../../format';
import { eventUrl } from '../../routes';
import CategoryChip, { categoryIcon } from './CategoryChip';
import EventImage from './EventImage';

interface Props {
	event: EventItem;
	/** `row` is the compact horizontal card (design: the three cards next to the hero, "This week"). */
	variant?: 'card' | 'row';
}

/** One event as a single link: image, category, title, date, venue and starting price. */
const EventCard = ({ event, variant = 'card' }: Props) => {
	const { t } = useTranslation('events');
	const { locale } = useRouter();
	const { title, lang, translated } = localizedEvent(event, locale);
	const venue = event.venueData;
	const zone = venue?.venueTimezone;
	const when = formatEventWhen(event.startAt, event.endAt, locale, zone);
	const where = venue ? `${venue.venueName}, ${venue.venueCity}` : null;
	const fallbackLang = translated ? undefined : lang;

	return (
		<Link href={eventUrl(event._id)} className={`tz-event-card${variant === 'row' ? ' tz-event-card--row' : ''}`}>
			<span className="tz-media">
				<EventImage src={event.eventImages?.[0]} />
			</span>
			{variant === 'card' && (
				<span className="tz-event-card__chip">
					<CategoryChip category={event.eventCategory} onImage />
				</span>
			)}
			<span className="tz-event-card__body">
				<h3 className="tz-event-card__title tz-clamp-2" lang={fallbackLang}>
					{title}
				</h3>
				<ul className="tz-event-card__meta">
					{variant === 'row' && (
						<li>
							{categoryIcon(event.eventCategory, 16)}
							<span>{t(`categories.${event.eventCategory}`)}</span>
						</li>
					)}
					<li>
						<CalendarBlank size={16} aria-hidden="true" />
						<span>{when}</span>
					</li>
					{where && (
						<li>
							<MapPin size={16} aria-hidden="true" />
							<span>{where}</span>
						</li>
					)}
				</ul>
				<span className="tz-event-card__foot">
					<span className="tz-price">
						<span className="tz-price__label">{t('card.from')}</span>
						<span className="tz-price__amount">{formatPrice(event.eventMinPrice, locale)}</span>
					</span>
				</span>
			</span>
		</Link>
	);
};

export const EventCardSkeleton = ({ variant = 'card' }: { variant?: 'card' | 'row' }) => (
	<div
		className={`tz-event-card tz-event-card--skel${variant === 'row' ? ' tz-event-card--row' : ''}`}
		aria-hidden="true"
	>
		<span className="tz-media tz-skel" />
		<span className="tz-event-card__body">
			<span className="tz-skel tz-skel--pill" style={{ width: '38%' }} />
			<span className="tz-skel tz-skel--title" style={{ width: '86%' }} />
			<span className="tz-skel tz-skel--text" style={{ width: '58%' }} />
			<span className="tz-skel tz-skel--text" style={{ width: '44%' }} />
		</span>
	</div>
);

export const EventGridSkeleton = ({ count = 8 }: { count?: number }) => (
	<div className="tz-grid" aria-busy="true">
		{Array.from({ length: count }, (_, index) => (
			<EventCardSkeleton key={index} />
		))}
	</div>
);

export default EventCard;
