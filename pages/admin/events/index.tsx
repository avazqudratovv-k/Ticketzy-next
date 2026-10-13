import { useEffect, useMemo, useState } from 'react';
import { NextPage, GetStaticPropsContext } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { CalendarBlank, Calendar, MagnifyingGlass, Robot, Warning, WarningCircle } from 'phosphor-react';
import withAdminLayout from '../../../libs/components/layout/LayoutAdmin';
import StateBlock from '../../../libs/components/states/StateBlock';
import Pagination from '../../../libs/components/events/Pagination';
import EventStatusBadge from '../../../libs/components/organizer/EventStatusBadge';
import { moderationSummary } from '../../../libs/components/admin/ModerationPanel';
import useListParams from '../../../libs/admin/useListParams';
import useAdminEventCounts from '../../../libs/admin/useAdminEventCounts';
import { EVENT_SORTS, EVENT_TABS, EventSortKey, EventTab, EVENTS_PAGE_SIZE, isEventSortKey, isEventTab, tabStatus } from '../../../libs/admin/events';
import { isOnlyNoData } from '../../../libs/admin/errors';
import { AdminEventRow, organizerName } from '../../../libs/admin/types';
import { GET_ADMIN_EVENTS } from '../../../apollo/admin/query';
import { localizedEvent } from '../../../libs/events';
import { formatEventWhen, formatNumber, formatViewerDate } from '../../../libs/format';
import ScrollFade from '../../../libs/components/common/ScrollFade';
import { NETWORK_ERROR, parseApiError } from '../../../libs/errors';

export const getStaticProps = async ({ locale }: GetStaticPropsContext) => ({
	props: {
		...(await serverSideTranslations(locale ?? 'en', ['common', 'admin', 'organizer', 'events', 'checkout'])),
	},
});

const DEFAULTS = { tab: 'pending', q: '', sort: 'updatedDesc' };

const AdminEvents: NextPage = () => {
	const { t } = useTranslation('admin');
	const { t: te } = useTranslation('events');
	const { locale } = useRouter();
	const { values, page, update, ready } = useListParams(DEFAULTS, {
		tab: isEventTab,
		sort: isEventSortKey,
	});
	const tab = values.tab as EventTab;
	const sortKey = values.sort as EventSortKey;
	const [search, setSearch] = useState(values.q);

	useEffect(() => setSearch(values.q), [values.q]);
	useEffect(() => {
		if (search === values.q) return undefined;
		const id = window.setTimeout(() => update({ q: search }, 'replace'), 300);
		return () => window.clearTimeout(id);
	}, [search, values.q, update]);

	const countData = useAdminEventCounts(!ready);
	const status = tabStatus(tab);
	const sort = EVENT_SORTS[sortKey];
	const text = values.q.trim();
	const { data, loading, error, refetch } = useQuery(GET_ADMIN_EVENTS, {
		variables: {
			input: {
				page,
				limit: EVENTS_PAGE_SIZE,
				sort: sort.sort,
				direction: sort.direction,
				search: { ...(status ? { eventStatus: status } : {}), ...(text ? { text } : {}) },
			},
			// the venue conflict check only matters for events waiting for a decision
			withConflicts: tab === 'pending',
		},
		skip: !ready,
		fetchPolicy: 'cache-and-network',
		notifyOnNetworkStatusChange: true,
	});

	const rows: AdminEventRow[] = useMemo(() => data?.getEventsByAdmin?.list ?? [], [data]);
	const total: number = data?.getEventsByAdmin?.metaCounter?.[0]?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / EVENTS_PAGE_SIZE));
	const count = (key: EventTab) => countData[key === 'all' ? 'ALL' : (key.toUpperCase() as keyof typeof countData)];

	// "No data found!" is how the backend says an empty list (or a page past the end)
	const noData = isOnlyNoData(error);
	const failed = Boolean(error) && !noData && !data?.getEventsByAdmin;
	const networkError = error ? parseApiError(error).code === NETWORK_ERROR : false;
	const firstLoad = !ready || (loading && !data && !error);
	const empty = !firstLoad && !failed && rows.length === 0;
	const filtered = Boolean(text) || tab !== 'all';

	useEffect(() => {
		if (data && page > pageCount) update({ page: pageCount }, 'replace');
	}, [data, page, pageCount, update]);

	return (
		<div className="org-page">
			<Head>
				<title>{`${t('events.title')} · Ticketzy`}</title>
			</Head>
			<div className="tz-pagehead org-pagehead">
				<div>
					<h1>{t('events.title')}</h1>
					<p>{t('events.subtitle')}</p>
				</div>
			</div>

			<ScrollFade className="org-tabs" activeKey={tab} role="tablist" aria-label={t('events.tabsLabel')}>
				{EVENT_TABS.map((key) => (
					<button key={key} type="button" role="tab" aria-selected={tab === key} className="org-tab" onClick={() => update({ tab: key })}>
						{t(`events.tabs.${key}`)}
						<span className="org-tab__count">{formatNumber(count(key), locale)}</span>
					</button>
				))}
			</ScrollFade>

			<div className="org-toolbar">
				<label className="org-search">
					<MagnifyingGlass size={20} aria-hidden="true" />
					<span className="org-visually-hidden">{t('events.search')}</span>
					<input
						type="search"
						className="tz-input"
						value={search}
						placeholder={t('events.searchPlaceholder')}
						maxLength={100}
						onChange={(event) => setSearch(event.target.value)}
					/>
				</label>
				<label className="org-select">
					<span className="org-visually-hidden">{t('events.sort')}</span>
					<select className="tz-input" value={sortKey} onChange={(event) => update({ sort: event.target.value })}>
						{(Object.keys(EVENT_SORTS) as EventSortKey[]).map((key) => (
							<option key={key} value={key}>
								{t(`events.sorts.${key}`)}
							</option>
						))}
					</select>
				</label>
			</div>

			{failed ? (
				<StateBlock
					alert
					icon={<WarningCircle size={28} />}
					title={t('events.error.title')}
					text={networkError ? t('errors.network') : t('events.error.text')}
					actions={
						<Button variant="outlined" onClick={() => refetch()}>
							{t('errors.retry')}
						</Button>
					}
				/>
			) : firstLoad ? (
				<ul className="org-rows" aria-busy="true" aria-label={t('events.loading')}>
					{[0, 1, 2, 3].map((n) => (
						<li key={n} className="org-row">
							<span className="tz-skel tz-skel--block" />
						</li>
					))}
				</ul>
			) : empty ? (
				<StateBlock
					icon={filtered ? <MagnifyingGlass size={28} /> : <Calendar size={28} />}
					title={text ? t('events.none.title') : tab === 'pending' ? t('events.empty.pendingTitle') : t('events.empty.title')}
					text={text ? t('events.none.text') : tab === 'pending' ? t('events.empty.pendingText') : t('events.empty.text')}
					actions={
						filtered ? (
							<Button variant="outlined" onClick={() => update({ tab: 'all', q: '' })}>
								{t('events.none.clear')}
							</Button>
						) : undefined
					}
				/>
			) : (
				<>
					<div className="org-table adm-table adm-table--events" role="table" aria-label={t('events.title')}>
						<div className="org-row org-row--head" role="row">
							<span role="columnheader">{t('events.cols.event')}</span>
							<span role="columnheader">{t('events.cols.date')}</span>
							<span role="columnheader">{t('events.cols.status')}</span>
							<span role="columnheader">{t('events.cols.ai')}</span>
							<span role="columnheader">{t('events.cols.actions')}</span>
						</div>
						{rows.map((event) => {
							const venue = event.venueData;
							const mod = moderationSummary(event.eventModeration);
							return (
								<div className="org-row" role="row" key={event._id}>
									<div role="cell" className="org-row__event">
										<Link href={`/admin/events/${event._id}`} className="org-row__title">
											{localizedEvent({ ...event, eventDesc: null }, locale).title}
										</Link>
										<span className="org-row__meta">{t('events.by', { name: organizerName(event.memberData) || '–' })}</span>
										<span className="org-row__meta">
											{te(`categories.${event.eventCategory}`)} · {venue ? `${venue.venueName}, ${venue.venueCity}` : t('events.noVenue')}
										</span>
										<span className="org-row__meta">{t('events.updated', { date: formatViewerDate(event.updatedAt, locale, true) })}</span>
									</div>
									<div role="cell" className="org-row__date">
										<CalendarBlank size={16} aria-hidden="true" />
										<span>{formatEventWhen(event.startAt, event.endAt, locale, venue?.venueTimezone, true)}</span>
									</div>
									<div role="cell" className="org-row__status">
										<EventStatusBadge status={event.eventStatus} />
										{(event.possibleVenueConflicts?.length ?? 0) > 0 && (
											<Link href={`/admin/events/${event._id}#venue-conflicts`} className="adm-conflictbadge">
												<Warning size={14} weight="fill" aria-hidden="true" />
												{t('conflicts.badge', { count: event.possibleVenueConflicts?.length ?? 0 })}
											</Link>
										)}
										{event.eventStatus === 'REJECTED' && event.rejectReason && <span className="org-row__reason">{event.rejectReason}</span>}
										{event.eventStatus === 'CANCELLED' && event.cancelReason && <span className="org-row__reason">{event.cancelReason}</span>}
									</div>
									<div role="cell" className="adm-row__ai">
										<span className="org-row__label">{t('events.cols.ai')}</span>
										<span className={`adm-aichip adm-aichip--${mod}`}>
											<Robot size={14} aria-hidden="true" />
											{mod === 'flagged'
												? t('events.ai.flagged', { count: event.eventModeration?.flags.length ?? 0 })
												: t(`events.ai.${mod}`)}
										</span>
									</div>
									<div role="cell" className="org-row__actions">
										<Link href={`/admin/events/${event._id}`} className="tz-link">
											{event.eventStatus === 'PENDING' ? t('events.actions.review') : t('events.actions.open')}
										</Link>
									</div>
								</div>
							);
						})}
					</div>
					<div className="org-foot">
						<p>
							{t('events.showing', {
								from: formatNumber((page - 1) * EVENTS_PAGE_SIZE + 1, locale),
								to: formatNumber((page - 1) * EVENTS_PAGE_SIZE + rows.length, locale),
								total: formatNumber(total, locale),
							})}
						</p>
						<Pagination page={Math.min(page, pageCount)} pageCount={pageCount} onChange={(next) => update({ page: next })} />
					</div>
				</>
			)}
		</div>
	);
};

export default withAdminLayout(AdminEvents);
