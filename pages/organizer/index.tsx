import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { NextPage, GetStaticPropsContext } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Clock, Prohibit, Receipt, WarningCircle } from 'phosphor-react';

import OrderStatusBadge from '../../libs/components/organizer/orders/OrderStatusBadge';
import { withOrganizerLayout } from '../../libs/components/layout/LayoutAdmin';
import EventStatusBadge from '../../libs/components/organizer/EventStatusBadge';
import useAuth from '../../libs/hooks/useAuth';
import { GET_MY_EARNINGS, GET_MY_EVENT_COUNTS, GET_MY_EVENTS, ticketTypesOfEventsQuery } from '../../apollo/organizer/query';
import { GET_MY_EVENT_ORDERS, GET_PAID_ORDERS_FOR_CHART } from '../../apollo/organizer/orders';
import { OrgOrder } from '../../libs/organizer/orders';
import { dailyRevenue, PaidOrder } from '../../libs/organizer/salesSeries';
import { EVENT_STATUSES, isUpcoming } from '../../libs/organizer/events';
import { OrgEvent } from '../../libs/organizer/types';
import { localizedEvent } from '../../libs/events';
import { formatEventWhen, formatNumber, formatPrice, formatViewerDate } from '../../libs/format';
import { organizerEventEditUrl, organizerEventNewUrl, organizerEventOrdersUrl, organizerEventsUrl } from '../../libs/routes';
import CountUp from '../../libs/components/common/CountUp';

const SalesChart = dynamic(() => import('../../libs/components/organizer/SalesChart'), { ssr: false, loading: () => <div className="tz-skel lazy-skel" aria-hidden="true" /> });

export const getStaticProps = async ({ locale }: GetStaticPropsContext) => ({
	props: {
		...(await serverSideTranslations(locale ?? 'en', ['common', 'organizer'])),
	},
});

interface Earning {
	currency?: string | null;
	ordersCount: number;
	ticketsSold: number;
	revenue: number;
	commission: number;
	netPayout: number;
	refundedAmount: number;
}

const Overview: NextPage = () => {
	const { t } = useTranslation('organizer');
	const { locale } = useRouter();
	const { user, organizerAccess } = useAuth();
	const active = organizerAccess === 'active';
	const skip = !active;

	const { data: counts } = useQuery(GET_MY_EVENT_COUNTS, { skip, fetchPolicy: 'cache-and-network' });
	const { data: earningData, error: earningError } = useQuery(GET_MY_EARNINGS, { skip, fetchPolicy: 'cache-and-network', errorPolicy: 'all' });
	const { data: approved, loading: approvedLoading } = useQuery(GET_MY_EVENTS, {
		variables: { input: { page: 1, limit: 100, sort: 'startAt', direction: 'ASC', search: { eventStatus: 'APPROVED' } } },
		skip,
		fetchPolicy: 'cache-and-network',
	});
	const { data: rejected } = useQuery(GET_MY_EVENTS, {
		variables: { input: { page: 1, limit: 3, sort: 'updatedAt', direction: 'DESC', search: { eventStatus: 'REJECTED' } } },
		skip,
		fetchPolicy: 'cache-and-network',
	});

	const CHART_ORDERS = 200;
	const CHART_DAYS = 30;
	const { data: recentData, loading: recentLoading, error: recentError, refetch: refetchRecent } = useQuery(GET_MY_EVENT_ORDERS, {
		variables: { input: { page: 1, limit: 5, sort: 'createdAt', direction: 'DESC' } },
		skip,
		fetchPolicy: 'cache-and-network',
	});
	const { data: chartData, error: chartError } = useQuery(GET_PAID_ORDERS_FOR_CHART, { variables: { limit: CHART_ORDERS }, skip, fetchPolicy: 'cache-and-network' });

	const upcoming: OrgEvent[] = useMemo(
		() => ((approved?.getMyEvents?.list ?? []) as OrgEvent[]).filter((event) => isUpcoming(event.endAt)).slice(0, 4),
		[approved],
	);
	const ids = upcoming.map((event) => event._id);
	const { data: typeData } = useQuery(ticketTypesOfEventsQuery(ids.length ? ids : ['none']), {
		variables: Object.fromEntries(ids.map((id, i) => [`id${i}`, id])),
		skip: skip || ids.length === 0,
		errorPolicy: 'all',
	});

	const total = (status: string) => counts?.[status]?.metaCounter?.[0]?.total ?? 0;
	const earnings: Earning[] = earningData?.getMyEarnings?.earnings ?? [];
	// KRW is the platform currency; any other currency in the data is shown as its own line
	const main = earnings.find((item) => item.currency === 'KRW') ?? earnings[0];
	const currency = main?.currency ?? 'KRW';
	const recent: OrgOrder[] = recentData?.getMyEventOrders?.list ?? [];
	const paidList: PaidOrder[] = useMemo(() => chartData?.getMyEventOrders?.list ?? [], [chartData]);
	const paidTotal: number = chartData?.getMyEventOrders?.metaCounter?.[0]?.total ?? 0;
	const series = useMemo(() => dailyRevenue(paidList, currency, CHART_DAYS), [paidList, currency]);
	const seriesRevenue = series.reduce((sum, point) => sum + point.revenue, 0);
	// the chart reads the newest 200 paid orders: if there are more and the oldest one read is still inside the window, the early days are incomplete
	const oldestRead = paidList.length ? new Date(paidList[paidList.length - 1].paidAt ?? paidList[paidList.length - 1].createdAt).getTime() : Infinity;
	const chartTruncated = paidTotal > paidList.length && oldestRead > Date.now() - CHART_DAYS * 86_400_000;
	const upcomingTotal = ((approved?.getMyEvents?.list ?? []) as OrgEvent[]).filter((event) => isUpcoming(event.endAt)).length;
	const rejectedList: OrgEvent[] = rejected?.getMyEvents?.list ?? [];
	const title = (event: OrgEvent) => localizedEvent(event, locale).title;

	return (
		<div className="org-page">
			<div className="tz-pagehead org-pagehead">
				<div>
					<h1>{t('dashboard.title')}</h1>
					<p>{t('dashboard.subtitle')}</p>
				</div>
				{active && (
					<Button component={Link} href={organizerEventNewUrl} variant="contained">
						{t('list.create')}
					</Button>
				)}
			</div>

			{organizerAccess && !active && (
				<div className="tz-alert tz-alert--warning" role="note">
					{organizerAccess === 'pending' ? <Clock size={20} aria-hidden="true" /> : <Prohibit size={20} aria-hidden="true" />}
					<span>
						<strong>{t(`blocked.${organizerAccess}.title`)}</strong> {t(`blocked.${organizerAccess}.dashboard`)}
						{organizerAccess === 'rejected' && user?.rejectReason ? ` ${t('blocked.reason', { reason: user.rejectReason })}` : ''}
					</span>
				</div>
			)}

			<section aria-labelledby="dash-status">
				<h2 id="dash-status" className="org-subtitle">
					{t('dashboard.byStatus')}
				</h2>
				<ul className="org-stats">
					{EVENT_STATUSES.map((status) => (
						<li key={status} className="org-stat">
							<Link href={`${organizerEventsUrl}?status=${status.toLowerCase()}`}>
								<span className="org-stat__label">{t(`status.${status}`)}</span>
								<strong className="org-stat__value">{active ? <CountUp value={total(status)} format={(n) => formatNumber(n, locale)} /> : '–'}</strong>
							</Link>
						</li>
					))}
				</ul>
			</section>

			<section aria-labelledby="dash-sales">
				<h2 id="dash-sales" className="org-subtitle">
					{t('dashboard.sales')}
				</h2>
				{earningError && !earningData ? (
					<p className="tz-alert tz-alert--error" role="alert">
						<WarningCircle size={20} aria-hidden="true" />
						<span>{t('dashboard.salesError')}</span>
					</p>
				) : (
					<ul className="org-stats org-stats--sales">
						<li className="org-stat">
							<span className="org-stat__label">{t('dashboard.orders')}</span>
							<strong className="org-stat__value">{active ? <CountUp value={main?.ordersCount ?? 0} format={(n) => formatNumber(n, locale)} /> : '–'}</strong>
						</li>
						<li className="org-stat">
							<span className="org-stat__label">{t('dashboard.ticketsSold')}</span>
							<strong className="org-stat__value">{active ? <CountUp value={main?.ticketsSold ?? 0} format={(n) => formatNumber(n, locale)} /> : '–'}</strong>
						</li>
						<li className="org-stat">
							<span className="org-stat__label">{t('dashboard.revenue')}</span>
							<strong className="org-stat__value">{active ? <CountUp value={main?.revenue ?? 0} format={(n) => formatPrice(n, locale, currency)} /> : '–'}</strong>
						</li>
						<li className="org-stat">
							<span className="org-stat__label">{t('dashboard.commission')}</span>
							<strong className="org-stat__value">{active ? <CountUp value={main?.commission ?? 0} format={(n) => formatPrice(n, locale, currency)} /> : '–'}</strong>
						</li>
						<li className="org-stat">
							<span className="org-stat__label">{t('dashboard.netPayout')}</span>
							<strong className="org-stat__value">{active ? <CountUp value={main?.netPayout ?? 0} format={(n) => formatPrice(n, locale, currency)} /> : '–'}</strong>
						</li>
						<li className="org-stat">
							<span className="org-stat__label">{t('dashboard.upcomingCount')}</span>
							<strong className="org-stat__value">{active ? <CountUp value={upcomingTotal} format={(n) => formatNumber(n, locale)} /> : '–'}</strong>
						</li>
					</ul>
				)}
				<p className="org-hint">{t('dashboard.salesNote')}</p>
				{earnings.length > 1 && <p className="org-hint">{t('dashboard.otherCurrencies', { currencies: earnings.filter((e) => e !== main).map((e) => e.currency).join(', ') })}</p>}
				{(main?.refundedAmount ?? 0) > 0 && <p className="org-hint">{t('dashboard.refunded', { amount: formatPrice(main?.refundedAmount ?? 0, locale, currency) })}</p>}
			</section>

			{active && (
				<section className="org-card" aria-labelledby="dash-chart">
					<div className="org-card__head">
						<h2 id="dash-chart">{t('dashboard.chart.title', { days: CHART_DAYS })}</h2>
						{!chartError && chartData && <span className="org-hint">{formatPrice(seriesRevenue, locale, currency)}</span>}
					</div>
					{chartError && !chartData ? (
						<p className="tz-alert tz-alert--error" role="alert">
							<WarningCircle size={20} aria-hidden="true" />
							<span>{t('dashboard.chart.error')}</span>
						</p>
					) : !chartData ? (
						<span className="tz-skel tz-skel--block" aria-busy="true" />
					) : paidList.length === 0 ? (
						<p className="org-hint">{t('dashboard.chart.empty')}</p>
					) : (
						<>
							<SalesChart points={series} currency={currency} locale={locale} />
							{seriesRevenue === 0 && <p className="org-hint">{t('dashboard.chart.quiet', { days: CHART_DAYS })}</p>}
							{chartTruncated && <p className="org-hint">{t('dashboard.chart.truncated', { count: paidList.length })}</p>}
						</>
					)}
				</section>
			)}

			<div className="org-cols">
				<section className="org-card" aria-labelledby="dash-upcoming">
					<div className="org-card__head">
						<h2 id="dash-upcoming">{t('dashboard.upcoming')}</h2>
						<Link href={`${organizerEventsUrl}?status=approved`} className="tz-link">
							{t('dashboard.allEvents')}
						</Link>
					</div>
					{!active ? (
						<p className="org-hint">{t('dashboard.noneYet')}</p>
					) : approvedLoading && !approved ? (
						<span className="tz-skel tz-skel--block" aria-busy="true" />
					) : upcoming.length === 0 ? (
						<p className="org-hint">{t('dashboard.noUpcoming')}</p>
					) : (
						<ul className="org-upcoming">
							{upcoming.map((event, i) => {
								const list = (typeData?.[`t${i}`] ?? []) as { totalQuantity: number; soldQuantity: number }[];
								const totalQty = list.reduce((sum, tt) => sum + tt.totalQuantity, 0);
								const sold = list.reduce((sum, tt) => sum + tt.soldQuantity, 0);
								const percent = totalQty > 0 ? Math.min(100, Math.round((sold / totalQty) * 100)) : 0;
								return (
									<li key={event._id}>
										<div className="org-upcoming__top">
											<Link href={organizerEventEditUrl(event._id)} className="org-row__title">
												{title(event)}
											</Link>
											<EventStatusBadge status={event.eventStatus} />
										</div>
										<span className="org-row__meta">
											{formatEventWhen(event.startAt, event.endAt, locale, event.venueData?.venueTimezone, true)}
											{event.venueData ? ` · ${event.venueData.venueName}` : ''}
										</span>
										<div className="org-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={t('dashboard.soldBar', { title: title(event) })}>
											<span style={{ width: `${percent}%` }} />
										</div>
										<span className="org-row__meta">{totalQty > 0 ? t('list.soldOf', { sold: formatNumber(sold, locale), total: formatNumber(totalQty, locale) }) : t('list.noTickets')}</span>
									</li>
								);
							})}
						</ul>
					)}
				</section>

				<div className="org-stack">
					{rejectedList.length > 0 && (
						<section className="org-card" aria-labelledby="dash-attention">
							<div className="org-card__head">
								<h2 id="dash-attention">{t('dashboard.attention')}</h2>
							</div>
							<ul className="org-upcoming">
								{rejectedList.map((event) => (
									<li key={event._id}>
										<div className="org-upcoming__top">
											<Link href={organizerEventEditUrl(event._id)} className="org-row__title">
												{title(event)}
											</Link>
											<EventStatusBadge status="REJECTED" />
										</div>
										{event.rejectReason && <span className="org-row__reason">{t('list.rejectReason', { reason: event.rejectReason })}</span>}
										<Link href={organizerEventEditUrl(event._id)} className="tz-link">
											{t('list.actions.fix')}
										</Link>
									</li>
								))}
							</ul>
						</section>
					)}
					<section className="org-card" aria-labelledby="dash-orders">
						<div className="org-card__head">
							<h2 id="dash-orders">{t('dashboard.recentOrders')}</h2>
						</div>
						{!active ? (
							<p className="org-hint">{t('dashboard.noneYet')}</p>
						) : recentError && !recentData ? (
							<p className="tz-alert tz-alert--error" role="alert">
								<WarningCircle size={20} aria-hidden="true" />
								<span>
									{t('dashboard.ordersError')}{' '}
									<button type="button" className="tz-link org-linkbtn" onClick={() => refetchRecent()}>
										{t('errors.retry')}
									</button>
								</span>
							</p>
						) : recentLoading && !recentData ? (
							<span className="tz-skel tz-skel--block" aria-busy="true" />
						) : recent.length === 0 ? (
							<div className="org-placeholder">
								<Receipt size={28} aria-hidden="true" />
								<p>
									<strong>{t('dashboard.noOrdersTitle')}</strong> {t('dashboard.noOrdersText')}
								</p>
							</div>
						) : (
							<ul className="org-upcoming">
								{recent.map((order) => (
									<li key={order._id}>
										<div className="org-upcoming__top">
											<Link href={organizerEventOrdersUrl(order.eventId)} className="org-row__title">
												{order.buyerNick || t('orders.unknownBuyer')}
											</Link>
											<OrderStatusBadge status={order.orderStatus} />
										</div>
										<span className="org-row__meta">
											{formatViewerDate(order.createdAt, locale, true)} · <span className="org-mono">{order.orderNumber}</span>
										</span>
										<span className="org-row__meta">
											{order.eventData ? localizedEvent({ eventTitle: order.eventData.eventTitle, eventTranslations: order.eventData.eventTranslations } as OrgEvent, locale).title : ''}
										</span>
										<span className="org-row__meta">
											{t('dashboard.orderLine', { count: order.ticketCount, total: formatPrice(order.totalAmount, locale, order.currency ?? 'KRW') })}
										</span>
									</li>
								))}
							</ul>
						)}
					</section>
				</div>
			</div>
		</div>
	);
};

export default withOrganizerLayout(Overview);
