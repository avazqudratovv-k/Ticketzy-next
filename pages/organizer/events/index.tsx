import { useEffect, useMemo, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useApolloClient, useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { CalendarBlank, CheckCircle, MagnifyingGlass, Plus, WarningCircle, Calendar } from 'phosphor-react';
import { withOrganizerLayout } from '../../../libs/components/layout/LayoutAdmin';
import StateBlock from '../../../libs/components/states/StateBlock';
import Pagination from '../../../libs/components/events/Pagination';
import EventStatusBadge from '../../../libs/components/organizer/EventStatusBadge';
import BlockedPanel from '../../../libs/components/organizer/BlockedPanel';
import SubmitDialog from '../../../libs/components/organizer/SubmitDialog';
import CancelDialog from '../../../libs/components/organizer/CancelDialog';
import useAuth from '../../../libs/hooks/useAuth';
import useListState, { LIST_PAGE_SIZE } from '../../../libs/organizer/useListState';
import { GET_MY_EVENT_COUNTS, GET_MY_EVENTS, ticketTypesOfEventsQuery } from '../../../apollo/organizer/query';
import { SUBMIT_EVENT_FOR_APPROVAL } from '../../../apollo/organizer/mutation';
import { describeError, Described } from '../../../libs/organizer/errors';
import { isSortKey, rowActions, SORTS, SortKey } from '../../../libs/organizer/events';
import { OrgEvent } from '../../../libs/organizer/types';
import { localizedEvent } from '../../../libs/events';
import { formatEventWhen, formatNumber } from '../../../libs/format';
import { eventUrl, organizerEventEditUrl, organizerEventNewUrl, organizerEventOrdersUrl } from '../../../libs/routes';
import { NETWORK_ERROR, parseApiError } from '../../../libs/errors';
import { EventStatus } from '../../../libs/types/event';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common', 'organizer', 'events'])),
	},
});

/** The server has no text search on `getMyEvents`, so the (up to) 100 events of a status are searched here. */
const FETCH_LIMIT = 100;
const TABS: (EventStatus | '')[] = ['', 'DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'ENDED'];

const OrganizerEvents: NextPage = () => {
	const { t } = useTranslation('organizer');
	const { t: te } = useTranslation('events');
	const router = useRouter();
	const { locale } = router;
	const client = useApolloClient();
	const { organizerAccess } = useAuth();
	const active = organizerAccess === 'active';
	const { state, update, ready } = useListState();
	const [search, setSearch] = useState(state.q);
	const [submitTarget, setSubmitTarget] = useState<OrgEvent | null>(null);
	const [submitError, setSubmitError] = useState<Described | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [cancelTarget, setCancelTarget] = useState<OrgEvent | null>(null);
	const [notice, setNotice] = useState<string | null>(null);

	useEffect(() => setSearch(state.q), [state.q]);
	useEffect(() => {
		if (search === state.q) return undefined;
		const id = window.setTimeout(() => update({ q: search }, 'replace'), 300);
		return () => window.clearTimeout(id);
	}, [search, state.q, update]);

	const skip = !ready || !active;
	const { data: countData, refetch: refetchCounts } = useQuery(GET_MY_EVENT_COUNTS, { skip, fetchPolicy: 'cache-and-network' });
	const sort = SORTS[isSortKey(state.sort) ? state.sort : 'dateAsc'];
	const { data, loading, error, refetch } = useQuery(GET_MY_EVENTS, {
		variables: {
			input: { page: 1, limit: FETCH_LIMIT, sort: sort.sort, direction: sort.direction, search: state.status ? { eventStatus: state.status } : {} },
		},
		skip,
		fetchPolicy: 'cache-and-network',
	});

	const all: OrgEvent[] = useMemo(() => data?.getMyEvents?.list ?? [], [data]);
	const serverTotal: number = data?.getMyEvents?.metaCounter?.[0]?.total ?? 0;
	const text = state.q.trim().toLowerCase();
	const filtered = useMemo(() => {
		if (!text) return all;
		return all.filter((event) => {
			const hay = [event.eventTitle, ...(event.eventTranslations ?? []).map((tr) => tr.title), event.venueData?.venueName, event.venueData?.venueCity]
				.filter(Boolean)
				.join(' ')
				.toLowerCase();
			return hay.includes(text);
		});
	}, [all, text]);
	const pageCount = Math.max(1, Math.ceil(filtered.length / LIST_PAGE_SIZE));
	const page = Math.min(state.page, pageCount);
	const rows = filtered.slice((page - 1) * LIST_PAGE_SIZE, page * LIST_PAGE_SIZE);

	useEffect(() => {
		if (data && state.page > pageCount) update({ page: pageCount }, 'replace');
	}, [data, state.page, pageCount, update]);

	// "Sold of total" per row: one aliased request for the ticket types of the rows on this page
	const ids = rows.map((event) => event._id);
	const { data: typeData } = useQuery(ticketTypesOfEventsQuery(ids.length ? ids : ['none']), {
		variables: Object.fromEntries(ids.map((id, i) => [`id${i}`, id])),
		skip: skip || ids.length === 0,
		errorPolicy: 'all',
	});
	const sales = useMemo(() => {
		const map = new Map<string, { sold: number; total: number }>();
		ids.forEach((id, i) => {
			const list = (typeData?.[`t${i}`] ?? []) as { totalQuantity: number; soldQuantity: number }[];
			if (typeData?.[`t${i}`]) map.set(id, { sold: list.reduce((sum, tt) => sum + tt.soldQuantity, 0), total: list.reduce((sum, tt) => sum + tt.totalQuantity, 0) });
		});
		return map;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [typeData, ids.join(',')]);

	const counts = (status: EventStatus | '') => countData?.[status || 'ALL']?.metaCounter?.[0]?.total ?? 0;
	const title = (event: OrgEvent) => localizedEvent(event, locale).title;

	const confirmSubmit = async () => {
		if (!submitTarget) return;
		setSubmitting(true);
		setSubmitError(null);
		try {
			await client.mutate({ mutation: SUBMIT_EVENT_FOR_APPROVAL, variables: { eventId: submitTarget._id } });
			setNotice(t('list.submitted', { title: submitTarget.eventTitle }));
			setSubmitTarget(null);
			await Promise.all([refetch(), refetchCounts()]);
		} catch (err) {
			setSubmitError(describeError(err));
		} finally {
			setSubmitting(false);
		}
	};

	if (organizerAccess && !active) {
		return (
			<>
				<Head>
					<title>{`${t('list.title')} · Ticketzy`}</title>
				</Head>
				<BlockedPanel access={organizerAccess} action="events" />
			</>
		);
	}

	const networkError = error ? parseApiError(error).code === NETWORK_ERROR : false;
	const firstLoad = !data && (loading || !ready);
	const empty = !firstLoad && !error && all.length === 0;
	const anyEvent = counts('') > 0;

	return (
		<div className="org-page">
			<div className="tz-pagehead org-pagehead">
				<div>
					<h1>{t('list.title')}</h1>
					<p>{t('list.subtitle')}</p>
				</div>
				<Button component={Link} href={organizerEventNewUrl} variant="contained" startIcon={<Plus size={20} aria-hidden="true" />}>
					{t('list.create')}
				</Button>
			</div>

			{notice && (
				<p className="tz-alert tz-alert--success" role="status">
					<CheckCircle size={20} aria-hidden="true" />
					<span>{notice}</span>
				</p>
			)}

			<div className="org-tabs" role="tablist" aria-label={t('list.tabsLabel')}>
				{TABS.map((tab) => (
					<button
						key={tab || 'all'}
						type="button"
						role="tab"
						aria-selected={state.status === tab}
						className="org-tab"
						onClick={() => update({ status: tab })}
					>
						{tab ? t(`status.${tab}`) : t('list.all')}
						<span className="org-tab__count">{formatNumber(counts(tab), locale)}</span>
					</button>
				))}
			</div>

			<div className="org-toolbar">
				<label className="org-search">
					<MagnifyingGlass size={20} aria-hidden="true" />
					<span className="org-visually-hidden">{t('list.search')}</span>
					<input
						type="search"
						className="tz-input"
						value={search}
						placeholder={t('list.searchPlaceholder')}
						maxLength={100}
						onChange={(event) => setSearch(event.target.value)}
					/>
				</label>
				<label className="org-select">
					<span className="org-visually-hidden">{t('list.sort')}</span>
					<select className="tz-input" value={state.sort} onChange={(event) => update({ sort: event.target.value as SortKey })}>
						{(Object.keys(SORTS) as SortKey[]).map((key) => (
							<option key={key} value={key}>
								{t(`list.sorts.${key}`)}
							</option>
						))}
					</select>
				</label>
			</div>

			{error && !data ? (
				<StateBlock
					alert
					icon={<WarningCircle size={28} />}
					title={t('list.error.title')}
					text={networkError ? t('errors.network') : t('list.error.text')}
					actions={
						<Button variant="outlined" onClick={() => refetch()}>
							{t('errors.retry')}
						</Button>
					}
				/>
			) : firstLoad ? (
				<ul className="org-rows" aria-busy="true" aria-label={t('list.loading')}>
					{[0, 1, 2, 3].map((n) => (
						<li key={n} className="org-row">
							<span className="tz-skel tz-skel--block" />
						</li>
					))}
				</ul>
			) : empty && !anyEvent ? (
				<StateBlock
					icon={<Calendar size={28} />}
					title={t('list.empty.title')}
					text={t('list.empty.text')}
					actions={
						<Button component={Link} href={organizerEventNewUrl} variant="contained">
							{t('list.create')}
						</Button>
					}
				/>
			) : filtered.length === 0 ? (
				<StateBlock
					icon={<MagnifyingGlass size={28} />}
					title={t('list.none.title')}
					text={t('list.none.text')}
					actions={
						<Button variant="outlined" onClick={() => update({ status: '', q: '' })}>
							{t('list.none.clear')}
						</Button>
					}
				/>
			) : (
				<>
					<div className="org-table" role="table" aria-label={t('list.title')}>
						<div className="org-row org-row--head" role="row">
							<span role="columnheader">{t('list.cols.event')}</span>
							<span role="columnheader">{t('list.cols.date')}</span>
							<span role="columnheader">{t('list.cols.status')}</span>
							<span role="columnheader" className="org-num">
								{t('list.cols.tickets')}
							</span>
							<span role="columnheader">{t('list.cols.actions')}</span>
						</div>
						{rows.map((event) => {
							const actions = rowActions(event.eventStatus);
							const sale = sales.get(event._id);
							const venue = event.venueData;
							return (
								<div className="org-row" role="row" key={event._id}>
									<div role="cell" className="org-row__event">
										<Link href={organizerEventEditUrl(event._id)} className="org-row__title">
											{title(event)}
										</Link>
										<span className="org-row__meta">
											{venue ? `${venue.venueName}, ${venue.venueCity}` : t('list.noVenue')}
										</span>
										<span className="org-row__meta">{te(`categories.${event.eventCategory}`)}</span>
									</div>
									<div role="cell" className="org-row__date">
										<CalendarBlank size={16} aria-hidden="true" />
										<span>{formatEventWhen(event.startAt, event.endAt, locale, venue?.venueTimezone, true)}</span>
									</div>
									<div role="cell" className="org-row__status">
										<EventStatusBadge status={event.eventStatus} />
										{event.eventStatus === 'REJECTED' && event.rejectReason && (
											<span className="org-row__reason">{t('list.rejectReason', { reason: event.rejectReason })}</span>
										)}
										{event.eventStatus === 'CANCELLED' && event.cancelReason && (
											<span className="org-row__reason">{t('list.cancelReason', { reason: event.cancelReason })}</span>
										)}
									</div>
									<div role="cell" className="org-num org-row__sold">
										<span className="org-row__label">{t('list.cols.tickets')}</span>
										{sale ? (sale.total > 0 ? t('list.sold', { sold: formatNumber(sale.sold, locale), total: formatNumber(sale.total, locale) }) : t('list.noTickets')) : '–'}
									</div>
									<div role="cell" className="org-row__actions">
										{actions.edit && (
											<Link href={organizerEventEditUrl(event._id)} className="tz-link">
												{event.eventStatus === 'REJECTED' ? t('list.actions.fix') : t('list.actions.edit')}
											</Link>
										)}
										{actions.view && (
											<Link href={organizerEventEditUrl(event._id)} className="tz-link">
												{t('list.actions.view')}
											</Link>
										)}
										{actions.submit && (
											<button
												type="button"
												className="tz-link org-linkbtn"
												onClick={() => {
													setNotice(null);
													setSubmitError(null);
													setSubmitTarget(event);
												}}
											>
												{event.eventStatus === 'REJECTED' ? t('list.actions.resubmit') : t('list.actions.submit')}
											</button>
										)}
										{actions.publicPage && (
											<Link href={eventUrl(event._id)} className="tz-link">
												{t('list.actions.publicPage')}
											</Link>
										)}
										{actions.orders && (
											<Link href={organizerEventOrdersUrl(event._id)} className="tz-link">
												{t('list.actions.orders')}
											</Link>
										)}
										{actions.cancel && (
											<button type="button" className="tz-link org-linkbtn org-linkbtn--danger" onClick={() => setCancelTarget(event)}>
												{t('list.actions.cancel')}
											</button>
										)}
									</div>
								</div>
							);
						})}
					</div>
					<div className="org-foot">
						<p>
							{t('list.showing', {
								from: formatNumber((page - 1) * LIST_PAGE_SIZE + 1, locale),
								to: formatNumber((page - 1) * LIST_PAGE_SIZE + rows.length, locale),
								total: formatNumber(filtered.length, locale),
							})}
						</p>
						<Pagination page={page} pageCount={pageCount} onChange={(next) => update({ page: next })} />
					</div>
					{serverTotal > FETCH_LIMIT && <p className="org-hint">{t('list.cap', { limit: FETCH_LIMIT })}</p>}
				</>
			)}

			<SubmitDialog
				open={Boolean(submitTarget)}
				eventTitle={submitTarget?.eventTitle ?? ''}
				loading={submitting}
				error={submitError}
				onClose={() => setSubmitTarget(null)}
				onConfirm={confirmSubmit}
				onFix={submitTarget ? () => router.push(organizerEventEditUrl(submitTarget._id)) : undefined}
			/>
			<CancelDialog
				open={Boolean(cancelTarget)}
				eventId={cancelTarget?._id ?? ''}
				eventTitle={cancelTarget ? title(cancelTarget) : ''}
				onClose={() => setCancelTarget(null)}
				onCancelled={async () => {
					setNotice(t('cancel.done', { title: cancelTarget ? title(cancelTarget) : '' }));
					setCancelTarget(null);
					await Promise.all([refetch(), refetchCounts()]);
				}}
			/>
		</div>
	);
};

export default withOrganizerLayout(OrganizerEvents);
