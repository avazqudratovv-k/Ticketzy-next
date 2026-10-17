import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { useTranslation } from 'next-i18next';
import { Button, IconButton } from '@mui/material';
import { ArrowRight, CaretLeft, CaretRight, WarningCircle } from 'phosphor-react';
import { GET_EVENTS } from '../../../apollo/user/query';
import { CATEGORY_SLUGS, categoryHref } from '../../events';
import { upcomingSearch } from '../../homeFeatured';
import { prefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import useRailPeek from '../../hooks/useRailPeek';
import { EventItem } from '../../types/event';
import Reveal from '../common/Reveal';
import EventCard, { EventCardSkeleton } from './EventCard';
import { GetEventsData, GetEventsVars } from '../../types/queries';

/** Events per category row. */
export const ROW_LIMIT = 10;

type Slug = (typeof CATEGORY_SLUGS)[number];

/**
 * A row of cards that slides sideways: native overflow scrolling with scroll-snap (swipe on touch, arrow keys when the
 * row has focus), and previous/next buttons on pointer devices (hidden on touch-only screens by CSS). Scrolling never
 * re-renders the cards, only the two "at the end" flags change.
 */
const Rail = ({ labelledBy, labelPrev, labelNext, children }: { labelledBy: string; labelPrev: string; labelNext: string; children: ReactNode }) => {
	const rail = useRef<HTMLDivElement>(null);
	const track = useRef<HTMLDivElement>(null);
	const [ends, setEnds] = useState({ start: true, end: false });

	const measure = useCallback(() => {
		const el = track.current;
		if (!el) return;
		const start = el.scrollLeft <= 2;
		const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
		setEnds((current) => (current.start === start && current.end === end ? current : { start, end }));
	}, []);

	useEffect(() => {
		const el = track.current;
		if (!el) return undefined;
		measure();
		let frame = 0;
		const onScroll = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(measure);
		};
		el.addEventListener('scroll', onScroll, { passive: true });
		const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
		observer?.observe(el);
		return () => {
			cancelAnimationFrame(frame);
			el.removeEventListener('scroll', onScroll);
			observer?.disconnect();
		};
	}, [measure]);

	useRailPeek(rail, track, labelledBy);

	const scroll = (direction: 1 | -1, amount: number) => {
		track.current?.scrollBy({ left: direction * amount, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
	};
	const page = () => (track.current?.clientWidth ?? 0) * 0.9;

	const onKeyDown = (event: React.KeyboardEvent) => {
		if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
		if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
		const card = track.current?.firstElementChild as HTMLElement | null;
		const step = card ? card.offsetWidth + 16 : 296;
		event.preventDefault();
		scroll(event.key === 'ArrowRight' ? 1 : -1, step);
	};

	return (
		<div ref={rail} className="tz-rail" data-end={ends.end ? 'true' : undefined}>
			<div ref={track} className="tz-rail__track" role="region" aria-labelledby={labelledBy} tabIndex={0} onKeyDown={onKeyDown}>
				{children}
			</div>
			<button type="button" className="tz-rail__btn tz-rail__btn--prev" aria-label={labelPrev} aria-disabled={ends.start} onClick={() => !ends.start && scroll(-1, page())}>
				<CaretLeft size={20} weight="bold" aria-hidden="true" />
			</button>
			<button type="button" className="tz-rail__btn tz-rail__btn--next" aria-label={labelNext} aria-disabled={ends.end} onClick={() => !ends.end && scroll(1, page())}>
				<CaretRight size={20} weight="bold" aria-hidden="true" />
			</button>
		</div>
	);
};

interface RowProps {
	category: Slug;
	title: string;
	/** start of the "upcoming" window, shared by the whole page so the four queries use one clock */
	from: string;
}

/** One home section: title, the round "See all" arrow (same IconButton as the header), and a sliding row of the soonest events of the category. Hidden when empty. */
export const CategoryRow = ({ category, title, from }: RowProps) => {
	const { t } = useTranslation('events');
	const id = `home-row-${category.slug}`;
	const { data, loading, error, refetch } = useQuery<GetEventsData, GetEventsVars>(GET_EVENTS, {
		variables: {
			input: { page: 1, limit: ROW_LIMIT, sort: 'startAt', direction: 'ASC', search: upcomingSearch(from, { categoryList: category.list }) },
		},
		fetchPolicy: 'cache-and-network',
		notifyOnNetworkStatusChange: true,
	});
	const events: EventItem[] = data?.getEvents?.list ?? [];

	if (data && events.length === 0) return null;

	return (
		<Reveal className="home__section" aria-busy={!data && loading ? true : undefined}>
			<div className="home__section-head">
				<h2 id={id}>{title}</h2>
				<IconButton component={Link} href={categoryHref(category.slug)} className="home__see-all" aria-label={t(`home.seeAllLabels.${category.slug}`)}>
					<ArrowRight size={20} aria-hidden="true" />
				</IconButton>
			</div>
			{!data && error ? (
				<div className="tz-rail__error" role="alert">
					<WarningCircle size={22} aria-hidden="true" />
					<span>{t('errors.loadText')}</span>
					<Button variant="outlined" onClick={() => refetch()}>
						{t('errors.retry')}
					</Button>
				</div>
			) : !data ? (
				<div className="tz-rail">
					<div className="tz-rail__track" aria-hidden="true">
						{[0, 1, 2, 3].map((i) => (
							<div key={i} className="tz-rail__item">
								<EventCardSkeleton />
							</div>
						))}
					</div>
				</div>
			) : (
				<Rail labelledBy={id} labelPrev={t('home.rowPrev', { title })} labelNext={t('home.rowNext', { title })}>
					{events.map((event) => (
						<div key={event._id} className="tz-rail__item">
							<EventCard event={event} />
						</div>
					))}
				</Rail>
			)}
		</Reveal>
	);
};
