import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { NextPage, GetStaticPropsContext } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ChartBar, Info, WarningCircle } from 'phosphor-react';
import { withOrganizerLayout } from '../../libs/components/layout/LayoutAdmin';
import BlockedPanel from '../../libs/components/organizer/BlockedPanel';
import type { BarPoint } from '../../libs/components/organizer/sales/BarChart';
import BarList from '../../libs/components/organizer/sales/BarList';
import EventSelect from '../../libs/components/organizer/sales/EventSelect';
import StateBlock from '../../libs/components/states/StateBlock';
import useAuth from '../../libs/hooks/useAuth';
import usePagedQuery from '../../libs/hooks/usePagedQuery';
import useSalesEvents from '../../libs/organizer/useSalesEvents';
import { GET_MY_EARNINGS } from '../../apollo/organizer/query';
import { GET_ORDERS_FOR_SALES, GET_ORGANIZER_ME, salesOfEventsQuery } from '../../apollo/organizer/sales';
import { buildSeries, isPeriod, mixByName, Period, PERIODS, SalesOrder } from '../../libs/organizer/analytics';
import { TypeSales } from '../../libs/organizer/payouts';
import { DEFAULT_TIMEZONE, formatEventDate, formatNumber, formatPrice, intlLocale } from '../../libs/format';
import { organizerEventNewUrl } from '../../libs/routes';
import CountUp from '../../libs/components/common/CountUp';

const BarChart = dynamic(() => import('../../libs/components/organizer/sales/BarChart'), { ssr: false, loading: () => <div className="tz-skel lazy-skel" aria-hidden="true" /> });

export const getStaticProps = async ({ locale }: GetStaticPropsContext) => ({
	props: {
		...(await serverSideTranslations(locale ?? 'en', ['common', 'organizer'])),
	},
});

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';
const ORDER_LIMIT = 1000;

/** "5 Oct" for a plain calendar day (no time zone shift: the day was already computed in the venue's zone). */
const dayLabel = (day: string, locale?: string) =>
	locale === 'uz'
		? `${Number(day.slice(8))}-${['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'][Number(day.slice(5, 7)) - 1]}`
		: new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`));

const Analytics: NextPage = () => {
	const { t } = useTranslation('organizer');
	const router = useRouter();
	const { locale } = router;
	const { user, organizerAccess } = useAuth();
	const blocked = organizerAccess !== null && organizerAccess !== 'active';
	const skip = blocked || organizerAccess === null;
	const [metric, setMetric] = useState<'tickets' | 'revenue'>('tickets');

	const { events, loading: eventsLoading, error: eventsError, refetch: refetchEvents, title } = useSalesEvents(skip, locale);
	const queryEvent = first(router.query.event);
	const eventId = events.some((e) => e._id === queryEvent) ? queryEvent : '';
	const event = events.find((e) => e._id === eventId);
	const periodParam = parseInt(first(router.query.period), 10);
	const period: Period = isPeriod(periodParam) ? periodParam : 30;
	const update = (patch: { event?: string; period?: number }) => {
		const next = { event: eventId, period, ...patch };
		const query: Record<string, string> = {};
		if (next.event) query.event = next.event;
		if (next.period !== 30) query.period = String(next.period);
		void router.replace({ pathname: router.pathname, query }, undefined, { shallow: true, scroll: false });
	};
	const scope = eventId ? events.filter((e) => e._id === eventId) : events;
	const timeZone = event?.venueData?.venueTimezone ?? DEFAULT_TIMEZONE;

	const { data: earningData } = useQuery(GET_MY_EARNINGS, { skip, fetchPolicy: 'cache-and-network', errorPolicy: 'all' });
	const { data: me } = useQuery(GET_ORGANIZER_ME, { variables: { memberId: user?._id }, skip: skip || !user, fetchPolicy: 'cache-and-network', errorPolicy: 'all' });
	const earnings: { currency?: string | null }[] = earningData?.getMyEarnings?.earnings ?? [];
	const currency = (earnings.find((e) => e.currency === 'KRW') ?? earnings[0])?.currency ?? 'KRW';
	const money = (amount: number) => formatPrice(amount, locale, currency);

	const { data: orderData, error: orderError, refetch: refetchOrders } = usePagedQuery(
		GET_ORDERS_FOR_SALES,
		'getMyEventOrders',
		{ orderStatus: 'PAID', sort: 'createdAt', direction: 'DESC', ...(eventId ? { eventId } : {}) },
		{ skip, maxRows: ORDER_LIMIT },
	);
	const orders = useMemo(() => ((orderData?.getMyEventOrders?.list ?? []) as SalesOrder[]).filter((o) => (o.currency ?? 'KRW') === currency), [orderData, currency]);
	const orderTotal: number = orderData?.getMyEventOrders?.metaCounter?.[0]?.total ?? 0;
	const truncated = orderTotal > (orderData?.getMyEventOrders?.list ?? []).length;

	const ids = scope.map((e) => e._id);
	const { data: salesData, error: salesError } = useQuery(salesOfEventsQuery(ids.length ? ids : ['none']), {
		variables: Object.fromEntries(ids.map((id, i) => [`id${i}`, id])),
		skip: skip || ids.length === 0,
		fetchPolicy: 'cache-and-network',
		errorPolicy: 'all',
	});
	const perEvent = scope.map((e, i) => {
		const rows = ((salesData?.[`s${i}`]?.ticketTypes ?? []) as TypeSales[]).filter((r) => (r.currency ?? 'KRW') === currency);
		return { event: e, rows, tickets: rows.reduce((n, r) => n + r.ticketsSold, 0), revenue: rows.reduce((n, r) => n + r.revenue, 0), commission: rows.reduce((n, r) => n + r.commission, 0) };
	});
	const salesReady = ids.length === 0 || Boolean(salesData);
	const totalTickets = perEvent.reduce((n, p) => n + p.tickets, 0);
	const totalRevenue = perEvent.reduce((n, p) => n + p.revenue, 0);
	const totalCommission = perEvent.reduce((n, p) => n + p.commission, 0);
	const mix = mixByName(perEvent.flatMap((p) => p.rows), t('orders.unknownType'));

	const series = useMemo(() => buildSeries(orders, period, timeZone), [orders, period, timeZone]);
	const inPeriod = series.points.reduce((acc, p) => ({ tickets: acc.tickets + p.tickets, revenue: acc.revenue + p.revenue }), { tickets: 0, revenue: 0 });
	const weekly = series.bucket === 'week';
	const points: BarPoint[] = series.points.map((p) => {
		const label = dayLabel(p.key, locale);
		const name = weekly ? t('analytics.chart.weekOf', { date: label }) : label;
		return {
			key: p.key,
			label,
			value: metric === 'tickets' ? p.tickets : p.revenue,
			text: `${name}: ${metric === 'tickets' ? t('analytics.chart.tickets', { count: p.tickets, n: formatNumber(p.tickets, locale) }) : money(p.revenue)}`,
		};
	});

	const views = scope.reduce((n, e) => n + e.eventViews, 0);
	const likes = scope.reduce((n, e) => n + e.eventLikes, 0);

	if (organizerAccess && blocked) return <BlockedPanel access={organizerAccess} action="events" />;

	const periodText = (p: Period) => (p === 0 ? t('analytics.period.all') : t('analytics.period.days', { count: p }));
	const countdown = (() => {
		if (!event) return null;
		const ms = new Date(event.startAt).getTime() - Date.now();
		if (event.eventStatus === 'CANCELLED') return { value: t('status.CANCELLED'), sub: formatEventDate(event.startAt, locale, timeZone, true) };
		if (new Date(event.endAt).getTime() <= Date.now()) return { value: t('status.ENDED'), sub: formatEventDate(event.endAt, locale, timeZone, true) };
		if (ms <= 0) return { value: t('analytics.now'), sub: formatEventDate(event.startAt, locale, timeZone, true) };
		return { value: formatNumber(Math.ceil(ms / 86_400_000), locale), sub: formatEventDate(event.startAt, locale, timeZone, true) };
	})();

	return (
		<div className="org-page">
			<Head>
				<title>{`${t('analytics.title')} · Ticketzy`}</title>
			</Head>
			<div className="tz-pagehead org-pagehead">
				<div>
					<h1>{t('analytics.title')}</h1>
					<p>{t('analytics.subtitle')}</p>
				</div>
			</div>

			{eventsError ? (
				<StateBlock
					alert
					icon={<WarningCircle size={28} />}
					title={t('analytics.error.title')}
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
					icon={<ChartBar size={28} />}
					title={t('analytics.noEvents.title')}
					text={t('analytics.noEvents.text')}
					actions={
						<Button component={Link} href={organizerEventNewUrl} variant="outlined">
							{t('list.create')}
						</Button>
					}
				/>
			) : (
				<>
					<div className="org-toolbar">
						<EventSelect events={events} value={eventId} onChange={(id) => update({ event: id })} title={title} allowAll />
						<div className="org-select org-select--period">
							<label className="org-field-label" htmlFor="an-period">
								{t('analytics.period.label')}
							</label>
							<select id="an-period" className="tz-input" value={period} onChange={(e) => update({ period: Number(e.target.value) })}>
								{PERIODS.map((p) => (
									<option key={p} value={p}>
										{periodText(p)}
									</option>
								))}
							</select>
						</div>
					</div>

					<ul className="org-stats org-stats--four" aria-label={t('analytics.totalsLabel')}>
						<li className="org-stat">
							<span className="org-stat__label">{t('analytics.tiles.tickets')}</span>
							<strong className="org-stat__value">{salesReady ? <CountUp value={totalTickets} format={(n) => formatNumber(n, locale)} /> : '–'}</strong>
						</li>
						<li className="org-stat">
							<span className="org-stat__label">{t('analytics.tiles.revenue')}</span>
							<strong className="org-stat__value">{salesReady ? <CountUp value={totalRevenue} format={money} /> : '–'}</strong>
							<span className="org-hint">{salesReady && totalTickets > 0 ? t('analytics.tiles.average', { amount: money(Math.round(totalRevenue / totalTickets)) }) : ' '}</span>
						</li>
						<li className="org-stat">
							<span className="org-stat__label">{t('analytics.tiles.commission')}</span>
							<strong className="org-stat__value">{salesReady ? <CountUp value={totalCommission} format={money} /> : '–'}</strong>
							<span className="org-hint">{salesReady && totalRevenue > 0 ? t('analytics.tiles.commissionSub', { percent: formatNumber(Math.round((totalCommission / totalRevenue) * 1000) / 10, locale) }) : ' '}</span>
						</li>
						<li className="org-stat">
							<span className="org-stat__label">{event ? t('analytics.tiles.daysLeft') : t('analytics.tiles.events')}</span>
							<strong className="org-stat__value">{event ? countdown?.value : formatNumber(scope.length, locale)}</strong>
							<span className="org-hint">{event ? countdown?.sub : ' '}</span>
						</li>
					</ul>
					<p className="org-hint">{t('analytics.totalsNote')}</p>

					<section className="org-card" aria-labelledby="an-sales">
						<div className="org-card__head">
							<h2 id="an-sales">{t('analytics.sales.title')}</h2>
							<div className="org-seg" role="group" aria-label={t('analytics.sales.metric')}>
								{(['tickets', 'revenue'] as const).map((m) => (
									<button key={m} type="button" aria-pressed={metric === m} className="org-seg__btn" onClick={() => setMetric(m)}>
										{t(`analytics.sales.${m}`)}
									</button>
								))}
							</div>
						</div>
						{orderError && !orderData ? (
							<p className="tz-alert tz-alert--error" role="alert">
								<WarningCircle size={20} aria-hidden="true" />
								<span>
									{t('analytics.sales.error')}{' '}
									<button type="button" className="tz-link org-linkbtn" onClick={() => refetchOrders()}>
										{t('errors.retry')}
									</button>
								</span>
							</p>
						) : !orderData ? (
							<span className="tz-skel tz-skel--block" aria-busy="true" />
						) : orders.length === 0 ? (
							<p className="org-hint">{t('analytics.sales.empty')}</p>
						) : (
							<>
								<p className="org-hint">
									{t('analytics.sales.range', { from: dayLabel(series.from, locale), to: dayLabel(series.to, locale), period: periodText(period) })} ·{' '}
									{metric === 'tickets' ? t('analytics.chart.tickets', { count: inPeriod.tickets, n: formatNumber(inPeriod.tickets, locale) }) : money(inPeriod.revenue)}
									{weekly ? ` · ${t('analytics.sales.weekly')}` : ''}
								</p>
								<BarChart
									points={points}
									label={t('analytics.sales.chartLabel', { metric: t(`analytics.sales.${metric}`) })}
									valueHeader={t(`analytics.sales.${metric}`)}
									format={(v) => (metric === 'tickets' ? formatNumber(v, locale) : money(v))}
									hint={t('analytics.chart.hover')}
								/>
								<p className="org-hint">{t('analytics.sales.zone', { zone: timeZone })}</p>
								{truncated && <p className="org-hint">{t('analytics.sales.truncated', { count: orders.length })}</p>}
							</>
						)}
					</section>

					<div className="org-cols">
						<section className="org-card" aria-labelledby="an-events">
							<div className="org-card__head">
								<h2 id="an-events">{t('analytics.byEvent.title')}</h2>
							</div>
							{!salesReady && !salesError ? (
								<span className="tz-skel tz-skel--block" aria-busy="true" />
							) : perEvent.every((p) => p.tickets === 0) ? (
								<p className="org-hint">{t('analytics.byEvent.empty')}</p>
							) : (
								<BarList
									label={t('analytics.byEvent.title')}
									total={totalRevenue}
									format={money}
									rows={perEvent
										.filter((p) => p.tickets > 0)
										.sort((a, b) => b.revenue - a.revenue)
										.slice(0, 10)
										.map((p) => ({ key: p.event._id, name: title(p.event), value: p.revenue, detail: t('analytics.byEvent.detail', { count: p.tickets, n: formatNumber(p.tickets, locale) }), selected: p.event._id === eventId }))}
								/>
							)}
						</section>
						<section className="org-card" aria-labelledby="an-mix">
							<div className="org-card__head">
								<h2 id="an-mix">{t('analytics.mix.title')}</h2>
							</div>
							{!salesReady && !salesError ? (
								<span className="tz-skel tz-skel--block" aria-busy="true" />
							) : mix.every((m) => m.tickets === 0) ? (
								<p className="org-hint">{t('analytics.mix.empty')}</p>
							) : (
								<>
									<BarList
										label={t('analytics.mix.title')}
										total={totalTickets}
										format={(v) => t('analytics.chart.tickets', { count: v, n: formatNumber(v, locale) })}
										rows={mix.filter((m) => m.tickets > 0).map((m) => ({ key: m.name, name: m.name, value: m.tickets, detail: money(m.revenue) }))}
									/>
									{!eventId && <p className="org-hint">{t('analytics.mix.merged')}</p>}
								</>
							)}
						</section>
					</div>

					<section className="org-card" aria-labelledby="an-reach">
						<div className="org-card__head">
							<h2 id="an-reach">{t('analytics.reach.title')}</h2>
							<span className="tz-badge tz-badge--neutral">{t('analytics.reach.derived')}</span>
						</div>
						<ul className="org-stats org-stats--four">
							<li className="org-stat">
								<span className="org-stat__label">{t('analytics.reach.views')}</span>
								<strong className="org-stat__value">{formatNumber(views, locale)}</strong>
							</li>
							<li className="org-stat">
								<span className="org-stat__label">{t('analytics.reach.likes')}</span>
								<strong className="org-stat__value">{formatNumber(likes, locale)}</strong>
							</li>
							<li className="org-stat">
								<span className="org-stat__label">{t('analytics.reach.followers')}</span>
								<strong className="org-stat__value">{me?.getMember ? formatNumber(me.getMember.memberFollowers, locale) : '–'}</strong>
							</li>
							<li className="org-stat">
								<span className="org-stat__label">{t('analytics.reach.buyers')}</span>
								<strong className="org-stat__value">{views > 0 && orderData ? `${formatNumber(Math.round((orderTotal / views) * 1000) / 10, locale)}%` : '–'}</strong>
								<span className="org-hint">{t('analytics.reach.buyersSub')}</span>
							</li>
						</ul>
						<p className="org-hint">{t('analytics.reach.note')}</p>
					</section>

					<p className="tz-alert tz-alert--info" role="note">
						<Info size={20} aria-hidden="true" />
						<span>{t('analytics.derivedNote')}</span>
					</p>
				</>
			)}
		</div>
	);
};

export default withOrganizerLayout(Analytics);
