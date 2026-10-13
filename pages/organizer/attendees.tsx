import { useEffect, useMemo, useState } from 'react';
import { NextPage, GetStaticPropsContext } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { DownloadSimple, MagnifyingGlass, UsersThree, WarningCircle } from 'phosphor-react';
import { withOrganizerLayout } from '../../libs/components/layout/LayoutAdmin';
import BlockedPanel from '../../libs/components/organizer/BlockedPanel';
import Pagination from '../../libs/components/events/Pagination';
import StateBlock from '../../libs/components/states/StateBlock';
import EventSelect from '../../libs/components/organizer/sales/EventSelect';
import TicketStatusBadge from '../../libs/components/organizer/sales/TicketStatusBadge';
import AttendeeDrawer from '../../libs/components/organizer/sales/AttendeeDrawer';
import useAuth from '../../libs/hooks/useAuth';
import useSalesEvents from '../../libs/organizer/useSalesEvents';
import useAllAttendees from '../../libs/organizer/useAllAttendees';
import { GET_VENUE_DETAIL } from '../../apollo/organizer/query';
import { Attendee, ATTENDEES_PAGE_SIZE, downloadCsv, isTicketStatus, matchesSearch, sameOrder, slug, TICKET_STATUSES, TicketStatusKey, toCsv } from '../../libs/organizer/attendees';
import { formatEventDate, formatNumber } from '../../libs/format';
import ScrollFade from '../../libs/components/common/ScrollFade';
import { NETWORK_ERROR, parseApiError } from '../../libs/errors';
import { organizerEventsUrl } from '../../libs/routes';

export const getStaticProps = async ({ locale }: GetStaticPropsContext) => ({
	props: {
		...(await serverSideTranslations(locale ?? 'en', ['common', 'organizer', 'events'])),
	},
});

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';

const Attendees: NextPage = () => {
	const { t } = useTranslation('organizer');
	const router = useRouter();
	const { locale } = router;
	const { organizerAccess } = useAuth();
	const blocked = organizerAccess !== null && organizerAccess !== 'active';
	const skip = blocked || organizerAccess === null;
	const { events, loading: eventsLoading, error: eventsError, refetch: refetchEvents, title } = useSalesEvents(skip, locale);

	// Event, status filter, search and page live in the URL, so reload and back keep the view
	const queryEvent = first(router.query.event);
	const eventId = events.some((e) => e._id === queryEvent) ? queryEvent : events.find((e) => e.eventStatus === 'APPROVED' && new Date(e.endAt) > new Date())?._id ?? events[0]?._id ?? '';
	const event = events.find((e) => e._id === eventId);
	const statusParam = first(router.query.status).toUpperCase();
	const status: TicketStatusKey | '' = isTicketStatus(statusParam) ? statusParam : '';
	const q = first(router.query.q).slice(0, 100);
	const pageParam = parseInt(first(router.query.page), 10);
	const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
	const [draft, setDraft] = useState(q);
	useEffect(() => setDraft(q), [q]);

	const update = (patch: { event?: string; status?: string; q?: string; page?: number }, mode: 'push' | 'replace' = 'push') => {
		const next = { event: eventId, status: status.toLowerCase(), q, page, ...patch };
		if (!('page' in patch)) next.page = 1;
		const query: Record<string, string> = {};
		if (next.event) query.event = next.event;
		if (next.status) query.status = next.status.toLowerCase();
		if (next.q.trim()) query.q = next.q.trim();
		if (next.page > 1) query.page = String(next.page);
		return router[mode]({ pathname: router.pathname, query }, undefined, { shallow: true, scroll: false });
	};
	// search as you type, without a history entry per letter
	useEffect(() => {
		if (draft.trim() === q.trim()) return undefined;
		const timer = setTimeout(() => void update({ q: draft }, 'replace'), 250);
		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [draft]);

	const { data, loading, error, reload } = useAllAttendees(eventId, skip || !eventId);
	const { data: venueData } = useQuery(GET_VENUE_DETAIL, { variables: { venueId: event?.venueId }, skip: skip || !event?.venueId, errorPolicy: 'all' });
	const sections = useMemo(
		() => new Map<string, string>(((venueData?.getVenue?.venueLayout?.sections ?? []) as { key: string; name: string }[]).map((s) => [s.key, s.name])),
		[venueData],
	);
	const timeZone = event?.venueData?.venueTimezone;
	const place = (a: Attendee) => (a.seat ? t('checkin.seat', { section: sections.get(a.seat.sectionKey) ?? a.seat.sectionKey, row: a.seat.row, number: a.seat.number }) : t('checkin.general'));

	const all = useMemo(() => data?.list ?? [], [data]);
	const counts = data?.counts;
	const filtered = useMemo(() => all.filter((a) => (!status || a.ticketStatus === status) && matchesSearch(a, q)), [all, status, q]);
	const pageCount = Math.max(1, Math.ceil(filtered.length / ATTENDEES_PAGE_SIZE));
	const shownPage = Math.min(page, pageCount);
	const rows = filtered.slice((shownPage - 1) * ATTENDEES_PAGE_SIZE, shownPage * ATTENDEES_PAGE_SIZE);
	const tabCount = (key: TicketStatusKey | '') => {
		if (!counts) return 0;
		if (key === 'VALID') return counts.sold - counts.used;
		if (key === 'USED') return counts.used;
		if (key === 'REFUNDED') return counts.refunded;
		return counts.sold + counts.refunded;
	};

	useEffect(() => {
		if (data && page > pageCount) void update({ page: pageCount }, 'replace');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data, page, pageCount]);

	const [selected, setSelected] = useState<Attendee | null>(null);
	useEffect(() => setSelected(null), [eventId]);

	const exportCsv = () => {
		if (!event) return;
		const head = [t('attendees.cols.buyer'), t('attendees.cols.order'), t('attendees.cols.ticket'), t('attendees.cols.seat'), t('attendees.cols.code'), t('attendees.cols.status'), t('attendees.cols.checkedIn')];
		const body = filtered.map((a) => [
			a.buyerName,
			a.orderNumber,
			a.ticketTypeName,
			a.seat ? `${sections.get(a.seat.sectionKey) ?? a.seat.sectionKey} · ${a.seat.row}/${a.seat.number}` : '',
			a.ticketCode,
			t(`attendees.status.${a.ticketStatus}`, { defaultValue: a.ticketStatus }),
			a.checkedInAt ?? '',
		]);
		downloadCsv(`attendees-${slug(title(event))}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(head, body));
	};

	if (organizerAccess && blocked) return <BlockedPanel access={organizerAccess} action="events" />;

	const networkError = error ? parseApiError(error).code === NETWORK_ERROR : false;
	const filtering = Boolean(status || q.trim());

	return (
		<div className="org-page">
			<Head>
				<title>{`${t('attendees.title')} · Ticketzy`}</title>
			</Head>
			<div className="tz-pagehead org-pagehead">
				<div>
					<h1>{t('attendees.title')}</h1>
					<p>{t('attendees.subtitle')}</p>
				</div>
				<Button variant="outlined" startIcon={<DownloadSimple size={20} aria-hidden="true" />} onClick={exportCsv} disabled={!event || !data || filtered.length === 0}>
					{t('attendees.download')}
				</Button>
			</div>

			{eventsError ? (
				<StateBlock
					alert
					icon={<WarningCircle size={28} />}
					title={t('attendees.error.title')}
					text={t('errors.network')}
					actions={
						<Button variant="outlined" onClick={() => refetchEvents()}>
							{t('errors.retry')}
						</Button>
					}
				/>
			) : eventsLoading ? (
				<span className="tz-skel tz-skel--block" aria-busy="true" />
			) : events.length === 0 ? (
				<StateBlock
					icon={<UsersThree size={28} />}
					title={t('attendees.noEvents.title')}
					text={t('attendees.noEvents.text')}
					actions={
						<Button component={Link} href={organizerEventsUrl} variant="outlined">
							{t('checkin.noEvents.action')}
						</Button>
					}
				/>
			) : (
				<>
					<div className="org-toolbar">
						<EventSelect events={events} value={eventId} onChange={(id) => void update({ event: id, status: '', q: '' })} title={title} />
					</div>

					<ul className="org-stats org-stats--four" aria-label={t('attendees.totals')}>
						{[
							['sold', counts ? counts.sold : null],
							['checkedIn', counts ? counts.used : null],
							['notYet', counts ? counts.sold - counts.used : null],
							['refunded', counts ? counts.refunded : null],
						].map(([key, value]) => (
							<li key={key as string} className="org-stat">
								<span className="org-stat__label">{t(`attendees.totalsLabel.${key}`)}</span>
								<strong className="org-stat__value">{value === null ? '–' : formatNumber(value as number, locale)}</strong>
							</li>
						))}
					</ul>
					<p className="org-hint">{t('attendees.totalsNote')}</p>

					<ScrollFade className="org-tabs" activeKey={status} role="tablist" aria-label={t('attendees.tabsLabel')}>
						{(['', ...TICKET_STATUSES] as (TicketStatusKey | '')[]).map((tab) => (
							<button key={tab || 'all'} type="button" role="tab" aria-selected={status === tab} className="org-tab" onClick={() => void update({ status: tab })}>
								{tab ? t(`attendees.status.${tab}`) : t('list.all')}
								<span className="org-tab__count">{counts ? formatNumber(tabCount(tab), locale) : '–'}</span>
							</button>
						))}
					</ScrollFade>

					<div className="org-toolbar">
						<label className="org-search">
							<span className="org-visually-hidden">{t('attendees.search')}</span>
							<MagnifyingGlass size={20} aria-hidden="true" />
							<input type="search" className="tz-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('attendees.searchPlaceholder')} maxLength={100} />
						</label>
					</div>

					{error && !data ? (
						<StateBlock
							alert
							icon={<WarningCircle size={28} />}
							title={t('attendees.error.title')}
							text={networkError ? t('errors.network') : t('attendees.error.text')}
							actions={
								<Button variant="outlined" onClick={() => void reload()}>
									{t('errors.retry')}
								</Button>
							}
						/>
					) : loading || !data ? (
						<ul className="org-rows" aria-busy="true" aria-label={t('attendees.loading')}>
							{[0, 1, 2, 3].map((n) => (
								<li key={n} className="org-row">
									<span className="tz-skel tz-skel--block" />
								</li>
							))}
						</ul>
					) : all.length === 0 ? (
						<StateBlock icon={<UsersThree size={28} />} title={t('attendees.empty.title')} text={t('attendees.empty.text')} />
					) : filtered.length === 0 ? (
						<StateBlock
							icon={<MagnifyingGlass size={28} />}
							title={t('attendees.none.title')}
							text={t('attendees.none.text')}
							actions={
								filtering ? (
									<Button
										variant="outlined"
										onClick={() => {
											setDraft('');
											void update({ status: '', q: '' });
										}}
									>
										{t('attendees.none.clear')}
									</Button>
								) : undefined
							}
						/>
					) : (
						<>
							<div className="org-table org-table--attendees" role="table" aria-label={t('attendees.title')}>
								<div className="org-row org-row--head" role="row">
									<span role="columnheader">{t('attendees.cols.buyer')}</span>
									<span role="columnheader">{t('attendees.cols.ticket')}</span>
									<span role="columnheader">{t('attendees.cols.code')}</span>
									<span role="columnheader">{t('attendees.cols.status')}</span>
									<span role="columnheader">{t('attendees.cols.checkedIn')}</span>
								</div>
								{rows.map((a) => (
									<div className="org-row org-row--click" role="row" key={a.ticketId}>
										<div role="cell" className="org-row__event">
											<button type="button" className="org-row__title org-linkbtn" onClick={() => setSelected(a)} aria-haspopup="dialog">
												{a.buyerName || t('orders.unknownBuyer')}
											</button>
											<span className="org-row__meta org-mono">{a.orderNumber}</span>
										</div>
										<div role="cell" className="org-row__event">
											<span>{a.ticketTypeName || t('orders.unknownType')}</span>
											<span className="org-row__meta">{place(a)}</span>
										</div>
										<div role="cell" className="org-mono">
											{a.ticketCode}
										</div>
										<div role="cell">
											<TicketStatusBadge status={a.ticketStatus} />
										</div>
										<div role="cell" className="org-row__meta">
											{a.checkedInAt ? formatEventDate(a.checkedInAt, locale, timeZone) : t('attendees.notYet')}
										</div>
									</div>
								))}
							</div>
							<div className="org-foot">
								<p>
									{t('attendees.showing', {
										from: formatNumber((shownPage - 1) * ATTENDEES_PAGE_SIZE + 1, locale),
										to: formatNumber((shownPage - 1) * ATTENDEES_PAGE_SIZE + rows.length, locale),
										total: formatNumber(filtered.length, locale),
									})}
								</p>
								<Pagination page={shownPage} pageCount={pageCount} onChange={(next) => void update({ page: next })} />
							</div>
							{data.partial && <p className="org-hint">{t('attendees.partial')}</p>}
							<p className="org-hint">{t('attendees.timeNote', { zone: timeZone ?? 'Asia/Seoul' })}</p>
						</>
					)}
				</>
			)}
			<AttendeeDrawer attendee={selected} tickets={selected ? sameOrder(all, selected) : []} onClose={() => setSelected(null)} eventId={eventId} timeZone={timeZone} place={place} />
		</div>
	);
};

export default withOrganizerLayout(Attendees);
