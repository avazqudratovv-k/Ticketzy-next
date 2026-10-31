import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { CalendarBlank, MapPin } from 'phosphor-react';
import { EventItem } from '../../types/event';
import { localizedEvent } from '../../events';
import { formatEventWhen, formatPrice, formatShortDay } from '../../format';
import { serverNow } from '../../seats/clock';
import { eventUrl } from '../../routes';
import { isEventLiked } from '../../eventLike';
import OrganizerAvatar from '../common/OrganizerAvatar';
import { seatBadge } from '../../seatAvailability';
import CategoryChip, { categoryIcon } from './CategoryChip';
import EventImage from './EventImage';
import EventTag from './EventTag';
import LikeButton from './LikeButton';

interface Props {
	event: EventItem;
	/** `row` is the compact horizontal card (design: the three cards next to the hero, "This week"). */
	variant?: 'card' | 'row';
	/** above the fold: loads at once (next/image `priority`) instead of lazily */
	eager?: boolean;
	/** the title is an h3 under a section heading; a page whose only heading above the grid is its h1 passes 2 */
	headingLevel?: 2 | 3;
}

/**
 * One event: a single link (image, category, title, date, venue, starting price) with the like heart beside it. The heart is a
 * sibling of the link, not inside it (a button in a link is invalid), and is drawn from the same `meLiked` / `eventLikes` as the event page.
 */
const EventCard = ({ event, variant = 'card', eager, headingLevel = 3 }: Props) => {
	const { t } = useTranslation('events');
	const { locale } = useRouter();
	const { title, lang, translated } = localizedEvent(event, locale);
	const venue = event.venueData;
	const zone = venue?.venueTimezone;
	const when = formatEventWhen(event.startAt, event.endAt, locale, zone);
	const where = venue ? `${venue.venueName}, ${venue.venueCity}` : null;
	const fallbackLang = translated ? undefined : lang;
	const organizer = event.memberData;
	const organizerName = organizer?.memberFullName || organizer?.memberNick || '';
	const seats = seatBadge(event.eventTotalSeats, event.eventSoldSeats);
	// Sales that have not started: a date chip in place of any seat-availability badge (nothing can be bought yet)
	const salesStart =
		event.saleStartAt &&
		event.eventStatus !== 'CANCELLED' &&
		event.eventStatus !== 'ENDED' &&
		new Date(event.saleStartAt).getTime() > serverNow()
			? event.saleStartAt
			: null;
	// one tag per card: the sales start date wins over seat availability (nothing can be bought yet)
	const tag = salesStart ? (
		<EventTag kind="salesStart">{t('card.salesStart', { date: formatShortDay(salesStart, locale, zone) })}</EventTag>
	) : seats ? (
		<EventTag kind={seats}>{t(`card.seats.${seats}`)}</EventTag>
	) : null;
	// the compact cards sit beside the hero (h1) with no heading of their own, so they are second-level headings
	const Heading = variant === 'row' || headingLevel === 2 ? 'h2' : 'h3';

	return (
		<div className={`tz-event-card${variant === 'row' ? ' tz-event-card--row' : ''}`}>
			<Link href={eventUrl(event._id)} className="tz-event-card__link">
				<span className="tz-media">
					<EventImage src={event.eventImages?.[0]} eager={eager} />
					{tag}
				</span>
				{variant === 'card' && (
					<span className="tz-event-card__chip">
						<CategoryChip category={event.eventCategory} onImage />
					</span>
				)}
				<span className="tz-event-card__body">
					<Heading className="tz-event-card__title tz-clamp-2" lang={fallbackLang}>
						{title}
					</Heading>
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
						{variant === 'card' && organizer && organizerName && (
							<li className="tz-event-card__org">
								<OrganizerAvatar member={organizer} size={20} />
								<span>{organizerName}</span>
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
			<LikeButton eventId={event._id} likes={event.eventLikes} liked={isEventLiked(event)} variant="card" />
		</div>
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
