import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { Button } from '@mui/material';
import { ArrowRight, CalendarBlank, MapPin } from 'phosphor-react';
import { EventItem } from '../../types/event';
import { localizedEvent } from '../../events';
import { formatEventWhen, formatPrice } from '../../format';
import { eventUrl, organizerUrl, ROUTES } from '../../routes';
import CategoryChip from './CategoryChip';
import EventImage from './EventImage';
import EventCard from './EventCard';
import Avatar from '../common/OrganizerAvatar';

export const Hero = ({ event }: { event: EventItem }) => {
	const { t } = useTranslation('events');
	const { locale } = useRouter();
	const { title, lang, translated } = localizedEvent(event, locale);
	const venue = event.venueData;
	return (
		<section className="tz-hero" aria-labelledby="hero-title">
			<EventImage src={event.eventImages?.[0]} eager />
			<span className="tz-hero__chip">
				<CategoryChip category={event.eventCategory} onImage />
			</span>
			<div className="tz-hero__body">
				<h1 id="hero-title" lang={translated ? undefined : lang}>
					{title}
				</h1>
				<ul className="tz-hero__meta">
					<li>
						<CalendarBlank size={16} aria-hidden="true" />
						{formatEventWhen(event.startAt, event.endAt, locale, venue?.venueTimezone)}
					</li>
					{venue && (
						<li>
							<MapPin size={16} aria-hidden="true" />
							{venue.venueName}, {venue.venueCity}
						</li>
					)}
				</ul>
				<div className="tz-hero__foot">
					<span className="tz-price tz-price--on-image">
						<span className="tz-price__label">{t('card.from')}</span>
						<span className="tz-price__amount">{formatPrice(event.eventMinPrice, locale)}</span>
					</span>
					<Button component={Link} href={eventUrl(event._id)} variant="contained" size="large">
						{t('home.getTickets')}
					</Button>
				</div>
			</div>
		</section>
	);
};

interface SectionProps {
	id: string;
	title: string;
	events: EventItem[];
	seeAllHref: string;
}

export const EventSection = ({ id, title, events, seeAllHref }: SectionProps) => {
	const { t } = useTranslation('events');
	if (!events.length) return null;
	return (
		<section className="home__section" aria-labelledby={id}>
			<div className="home__section-head">
				<h2 id={id}>{title}</h2>
				<Link href={seeAllHref} className="tz-link">
					{t('home.seeAll')}
				</Link>
			</div>
			<div className="tz-grid">
				{events.map((event) => (
					<EventCard key={event._id} event={event} />
				))}
			</div>
		</section>
	);
};

export interface OrganizerCardData {
	_id: string;
	memberNick?: string | null;
	memberFullName?: string | null;
	memberImage: string;
	memberDesc?: string | null;
	memberEvents?: number;
}

export const OrganizersBlock = ({ organizers }: { organizers: OrganizerCardData[] }) => {
	const { t } = useTranslation('events');
	return (
		<section className="home__section" aria-labelledby="home-organizers">
			<h2 id="home-organizers">{t('home.organizers')}</h2>
			<div className="home__orgs">
				{organizers.map((org) => (
					<Link key={org._id} href={organizerUrl(org._id)} className="home__org">
						<Avatar member={org} size={48} />
						<span>
							<strong>{org.memberFullName || org.memberNick}</strong>
							{org.memberDesc && <span className="home__org-desc tz-clamp-2">{org.memberDesc}</span>}
						</span>
						<ArrowRight size={18} aria-hidden="true" className="home__org-go" />
					</Link>
				))}
				<div className="home__cta">
					<h3>{t('home.ctaTitle')}</h3>
					<p>{t('home.ctaText')}</p>
					<Button component={Link} href={`${ROUTES.signup}?role=organizer`} variant="contained">
						{t('home.ctaButton')}
					</Button>
				</div>
			</div>
		</section>
	);
};
