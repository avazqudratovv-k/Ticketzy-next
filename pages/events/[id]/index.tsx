import { useState } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import {
	CalendarBlank,
	ChatCircle,
	Eye,
	MapPin,
	Prohibit,
	WarningCircle,
	Info,
	Heart,
	ArrowSquareOut,
} from 'phosphor-react';
import { GET_EVENT, GET_TICKET_TYPES } from '../../../apollo/user/query';
import withLayoutBasic from '../../../libs/components/layout/LayoutBasic';
import Seo from '../../../libs/components/common/Seo';
import StateBlock from '../../../libs/components/states/StateBlock';
import CategoryChip, { categoryIcon } from '../../../libs/components/events/CategoryChip';
import EventImage from '../../../libs/components/events/EventImage';
import LikeButton from '../../../libs/components/events/LikeButton';
import TicketPanel from '../../../libs/components/events/TicketPanel';
import Comments from '../../../libs/components/events/Comments';
import Avatar from '../../../libs/components/common/OrganizerAvatar';
import useAuth from '../../../libs/hooks/useAuth';
import { CATEGORY_SLUGS, categoryHref, localizedEvent, saleState } from '../../../libs/events';
import {
	formatEventWhen,
	isMultiDay,
	formatEventTime,
	formatNumber,
	formatRefundDeadlineDay,
	formatZoneName,
} from '../../../libs/format';
import { organizerUrl, ROUTES } from '../../../libs/routes';
import { serverQuery } from '../../../libs/serverFetch';
import { EventItem, TicketTypeItem } from '../../../libs/types/event';
import { NETWORK_ERROR, parseApiError } from '../../../libs/errors';

interface SeoProps {
	title: string;
	description: string | null;
	image: string | null;
}

/** The server fetches only what the meta tags need (anonymous, so only public events); the page itself loads the event in the browser with the member's token. */
export const getServerSideProps: GetServerSideProps = async ({ locale, params }) => {
	const code = (locale ?? 'en').toUpperCase();
	const data = await serverQuery<{ getEvent: any }>(
		`query($id:String!){ getEvent(eventId:$id){ eventTitle eventDesc eventImages eventTranslations{ locale title description } } }`,
		{ id: String(params?.id ?? '') },
	);
	let seo: SeoProps | null = null;
	const event = data?.getEvent;
	if (event) {
		const translations: { locale: string; title: string; description?: string }[] = event.eventTranslations ?? [];
		const own = translations.find((e) => e.locale === code && e.title?.trim());
		const base = translations.find((e) => e.locale === 'EN' && e.title?.trim());
		seo = {
			title: own?.title ?? base?.title ?? event.eventTitle,
			description: own?.description || base?.description || event.eventDesc || null,
			image: event.eventImages?.[0] ?? null,
		};
	}
	return { props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'events'])), seo } };
};

const EventDetail: NextPage<{ seo: SeoProps | null }> = ({ seo }) => {
	const { t } = useTranslation('events');
	const router = useRouter();
	const { locale } = router;
	const { ready } = useAuth();
	const eventId = typeof router.query.id === 'string' ? router.query.id : '';
	const [imageIndex, setImageIndex] = useState(0);
	const [commentTotal, setCommentTotal] = useState<number | null>(null);

	// Wait for the stored session so the first request already carries the token (views and the like state depend on it)
	const { data, loading, error, refetch } = useQuery(GET_EVENT, {
		variables: { eventId },
		skip: !router.isReady || !ready,
		fetchPolicy: 'cache-and-network',
	});
	const { data: ticketData, loading: ticketsLoading } = useQuery(GET_TICKET_TYPES, {
		variables: { eventId },
		skip: !router.isReady || !ready,
		fetchPolicy: 'cache-and-network',
	});

	const event: EventItem | undefined = data?.getEvent;
	const ticketTypes: TicketTypeItem[] = ticketData?.getTicketTypes ?? [];
	const apiError = error && !event ? parseApiError(error) : null;

	if (!event) {
		if (apiError) {
			const missing = apiError.code !== NETWORK_ERROR;
			return (
				<div className="tz-container event">
					<Seo
						title={seo?.title ?? t('detail.notFoundTitle')}
						description={seo?.description}
						image={seo?.image}
						noindex
					/>
					<StateBlock
						alert={!missing}
						icon={missing ? <Prohibit size={28} /> : <WarningCircle size={28} />}
						title={missing ? t('detail.notFoundTitle') : t('errors.loadTitle')}
						text={missing ? t('detail.notFoundText') : t('errors.loadText')}
						actions={
							missing ? (
								<Button component={Link} href={ROUTES.events} variant="outlined">
									{t('home.browse')}
								</Button>
							) : (
								<Button variant="outlined" onClick={() => refetch()}>
									{t('errors.retry')}
								</Button>
							)
						}
					/>
				</div>
			);
		}
		return (
			<div className="tz-container event" aria-busy="true">
				{seo && <Seo title={seo.title} description={seo.description} image={seo.image} />}
				<div className="tz-skel event__hero-skel" aria-hidden="true" />
				<div className="event__layout" aria-hidden="true">
					<div>
						<span className="tz-skel tz-skel--title" style={{ width: '60%', height: 40 }} />
						<span className="tz-skel tz-skel--text" style={{ width: '40%' }} />
						<span className="tz-skel tz-skel--block" />
					</div>
					<span className="tz-skel tz-skel--block" style={{ height: 320 }} />
				</div>
			</div>
		);
	}

	const { title, description, lang, translated } = localizedEvent(event, locale);
	const venue = event.venueData;
	const zone = venue?.venueTimezone;
	const state = saleState(event, ticketTypes);
	const category = CATEGORY_SLUGS.find((c) => c.list.includes(event.eventCategory)) ?? CATEGORY_SLUGS[3];
	const images = event.eventImages ?? [];
	const mapsUrl = venue
		? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
				`${venue.venueName} ${venue.venueAddress}`,
		  )}`
		: null;
	const organizer = event.memberData;
	const liked = Boolean(event.meLiked?.[0]?.myFavorite);
	const contentLang = translated ? undefined : lang;
	const banner =
		state === 'cancelled' ||
		state === 'ended' ||
		state === 'soldOut' ||
		state === 'notStarted' ||
		state === 'saleClosed';

	return (
		<div className="tz-container event">
			<Seo title={title} description={description ?? undefined} image={images[0]} />

			<div className="event__gallery">
				<div className={`event__hero${state === 'cancelled' || state === 'ended' ? ' is-muted' : ''}`}>
					<EventImage src={images[imageIndex]} eager />
					<span className="event__hero-chip">
						<CategoryChip category={event.eventCategory} onImage />
					</span>
				</div>
				{images.length > 1 && (
					<ul className="event__thumbs" aria-label={t('detail.images')}>
						{images.map((src, index) => (
							<li key={src}>
								<button
									type="button"
									className="event__thumb"
									aria-label={t('detail.showImage', { n: index + 1 })}
									aria-pressed={index === imageIndex}
									onClick={() => setImageIndex(index)}
								>
									<EventImage src={src} />
								</button>
							</li>
						))}
					</ul>
				)}
			</div>

			<div className="event__layout">
				<article className="event__main">
					<Link href={categoryHref(category.slug)} className="tz-link event__crumb">
						{t('detail.allOf', { category: t(`categoryPlural.${category.category}`) })}
					</Link>
					<div className="event__titlebar">
						<h1 lang={contentLang}>{title}</h1>
						<LikeButton eventId={event._id} likes={event.eventLikes} liked={liked} />
					</div>

					{banner && (
						<div className={`tz-alert tz-alert--${state === 'cancelled' ? 'danger' : 'warning'}`} role="status">
							<span className="tz-alert__icon" aria-hidden="true">
								{state === 'cancelled' ? <Prohibit size={16} /> : <Info size={16} />}
							</span>
							<div>
								<div className="tz-alert__title">{t(`detail.banner.${state}.title`)}</div>
								<div className="tz-alert__text">
									{state === 'cancelled' && event.cancelReason
										? t('detail.banner.cancelled.reason', { reason: event.cancelReason })
										: t(`detail.banner.${state}.text`)}
								</div>
							</div>
						</div>
					)}

					<Button component="a" href="#tickets-title" variant="outlined" className="event__jump">
						{t('detail.viewTickets')}
					</Button>

					<ul className="event__facts-top">
						<li>
							<CalendarBlank size={20} aria-hidden="true" />
							<div>
								<strong>{formatEventWhen(event.startAt, event.endAt, locale, zone, true)}</strong>
								<span>
									{!isMultiDay(event.startAt, event.endAt, zone) && <>{t('detail.until', { time: formatEventTime(event.endAt, locale, zone) })} · </>}
									{formatZoneName(event.startAt, locale, zone)}
								</span>
							</div>
						</li>
						{venue && (
							<li>
								<MapPin size={20} aria-hidden="true" />
								<div>
									<strong>{venue.venueName}</strong>
									<span>{venue.venueAddress}</span>
								</div>
							</li>
						)}
					</ul>

					<ul className="event__counts" aria-label={t('detail.stats')}>
						<li>
							<Eye size={16} aria-hidden="true" />
							{t('detail.views', { count: event.eventViews, n: formatNumber(event.eventViews, locale) })}
						</li>
						<li>
							<Heart size={16} aria-hidden="true" />
							{t('detail.likes', { count: event.eventLikes, n: formatNumber(event.eventLikes, locale) })}
						</li>
						<li>
							<ChatCircle size={16} aria-hidden="true" />
							{t('detail.commentsCount', {
								count: commentTotal ?? event.eventComments,
								n: formatNumber(commentTotal ?? event.eventComments, locale),
							})}
						</li>
					</ul>

					{description && (
						<section className="event__section" aria-labelledby="event-about">
							<h2 id="event-about">{t('detail.about')}</h2>
							<p className="event__desc" lang={contentLang}>
								{description}
							</p>
						</section>
					)}

					<dl className="event__facts">
						<div>
							<dt>{t('detail.starts')}</dt>
							<dd>{formatEventTime(event.startAt, locale, zone)}</dd>
						</div>
						<div>
							<dt>{t('detail.ends')}</dt>
							<dd>{formatEventTime(event.endAt, locale, zone)}</dd>
						</div>
						<div>
							<dt>{t('detail.seating')}</dt>
							<dd>{t(`detail.seatingType.${event.seatingType}`)}</dd>
						</div>
					</dl>

					{state !== 'cancelled' && state !== 'ended' && (
						<section className="event__section" aria-labelledby="event-refund">
							<h2 id="event-refund">{t('detail.refundTitle')}</h2>
							<p className="event__desc">
								{t('detail.refundText', {
									date: formatRefundDeadlineDay(event.startAt, locale, zone),
									zone: zone ?? 'Asia/Seoul',
								})}
							</p>
						</section>
					)}

					{venue && (
						<section className="event__section" aria-labelledby="event-venue">
							<h2 id="event-venue">{t('detail.venue')}</h2>
							<div className="event__card">
								<h3>{venue.venueName}</h3>
								<p>
									{venue.venueAddress}
									<br />
									<span className="event__muted">{t('detail.timezone', { zone: zone ?? 'Asia/Seoul' })}</span>
								</p>
								{mapsUrl && (
									<Button
										component="a"
										href={mapsUrl}
										target="_blank"
										rel="noopener noreferrer"
										variant="outlined"
										endIcon={<ArrowSquareOut size={16} />}
									>
										{t('detail.openMaps')}
									</Button>
								)}
							</div>
						</section>
					)}

					{organizer && (
						<section className="event__section" aria-labelledby="event-organizer">
							<h2 id="event-organizer">{t('detail.organizer')}</h2>
							<div className="event__card event__card--org">
								<Avatar member={organizer} size={56} />
								<div>
									<h3>{organizer.memberFullName || organizer.memberNick}</h3>
									{organizer.memberDesc && <p>{organizer.memberDesc}</p>}
									<Link href={organizerUrl(organizer._id)} className="tz-link">
										{t('detail.moreFrom', { name: organizer.memberFullName || organizer.memberNick })}
									</Link>
								</div>
							</div>
						</section>
					)}

					<Comments eventId={event._id} onTotal={setCommentTotal} />
				</article>

				<div className="event__side">
					<TicketPanel event={event} ticketTypes={ticketTypes} loading={ticketsLoading} state={state} />
				</div>
			</div>
		</div>
	);
};

export default withLayoutBasic(EventDetail);
