import { useMemo } from 'react';
import { NextPage, GetStaticPropsContext } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { CheckCircle, CreditCard, WarningCircle } from 'phosphor-react';
import withAdminLayout from '../../libs/components/layout/LayoutAdmin';
import StateBlock from '../../libs/components/states/StateBlock';
import MemberStatusBadge from '../../libs/components/admin/MemberStatusBadge';
import {
	GET_ADMIN_ACTIVE_EVENTS,
	GET_ADMIN_ORDER_COUNT,
	GET_ADMIN_PAID_ORDERS,
	GET_ADMIN_PENDING_EVENTS,
	GET_ADMIN_PENDING_ORGANIZERS,
	PAID_SUM_LIMIT,
} from '../../apollo/admin/query';
import { isOnlyNoData } from '../../libs/admin/errors';
import { AdminEventRow, AdminOrganizer, organizerName } from '../../libs/admin/types';
import { localizedEvent } from '../../libs/events';
import { formatNumber, formatPrice, formatViewerDate } from '../../libs/format';
import { NETWORK_ERROR, parseApiError } from '../../libs/errors';
import { GET_ADMIN_PAYOUT_TOTALS } from '../../apollo/payouts';
import CountUp from '../../libs/components/common/CountUp';
import usePagedQuery from '../../libs/hooks/usePagedQuery';

export const getStaticProps = async ({ locale }: GetStaticPropsContext) => ({
	props: {
		...(await serverSideTranslations(locale ?? 'en', ['common', 'admin', 'organizer'])),
	},
});

const totalOf = (block: { metaCounter?: { total?: number }[] } | null | undefined) => block?.metaCounter?.[0]?.total ?? 0;

interface Money {
	currency: string;
	revenue: number;
	commission: number;
}

const Overview: NextPage = () => {
	const { t } = useTranslation('admin');
	const { locale } = useRouter();
	// An empty list is an error ("No data found!") on some admin queries and nulls the whole document, so every figure has its own query
	const options = { errorPolicy: 'all', fetchPolicy: 'cache-and-network' } as const;
	const pendingEventsQuery = useQuery(GET_ADMIN_PENDING_EVENTS, options);
	const activeEventsQuery = useQuery(GET_ADMIN_ACTIVE_EVENTS, options);
	const pendingOrganizersQuery = useQuery(GET_ADMIN_PENDING_ORGANIZERS, options);
	const orderCountQuery = useQuery(GET_ADMIN_ORDER_COUNT, options);
	const paid = usePagedQuery(GET_ADMIN_PAID_ORDERS, 'getAllOrdersByAdmin', { sort: 'createdAt', direction: 'DESC', orderStatus: 'PAID' }, { maxRows: PAID_SUM_LIMIT });
	// a side figure: if it fails the overview shows nothing for it and stays as it was
	const payoutsQuery = useQuery(GET_ADMIN_PAYOUT_TOTALS, options);
	const dueBlock = payoutsQuery.data?.getPayoutsByAdmin;
	const dueCount: number = dueBlock?.metaCounter?.[0]?.total ?? 0;
	const overview = [pendingEventsQuery, activeEventsQuery, pendingOrganizersQuery, orderCountQuery];

	const merged = { ...pendingEventsQuery.data, ...activeEventsQuery.data, ...pendingOrganizersQuery.data, ...orderCountQuery.data };
	const data = overview.some((q) => q.data) ? merged : undefined;
	const overviewError = overview.map((q) => q.error).find((error) => error && !isOnlyNoData(error));
	const realError = overviewError;
	const failedAll = Boolean(realError) && !data?.allOrders && !data?.activeEvents && !data?.pendingOrganizers;
	const firstLoad = !data && overview.some((q) => q.loading);
	const networkError = overviewError ? parseApiError(overviewError).code === NETWORK_ERROR : false;

	const pendingEvents: AdminEventRow[] = data?.pendingEvents?.list ?? [];
	const pendingOrganizers: AdminOrganizer[] = data?.pendingOrganizers?.list ?? [];

	const money: Money[] = useMemo(() => {
		const list = (paid.data?.getAllOrdersByAdmin?.list ?? []) as { currency?: string | null; totalAmount: number; commissionAmount: number }[];
		const map = new Map<string, Money>();
		list.forEach((order) => {
			const currency = order.currency || 'KRW';
			const entry = map.get(currency) ?? { currency, revenue: 0, commission: 0 };
			entry.revenue += order.totalAmount;
			entry.commission += order.commissionAmount;
			map.set(currency, entry);
		});
		return Array.from(map.values());
	}, [paid.data]);
	const paidTotal = totalOf(paid.data?.getAllOrdersByAdmin);
	const paidLoaded = (paid.data?.getAllOrdersByAdmin?.list ?? []).length;
	const moneyFailed = Boolean(paid.error) && !isOnlyNoData(paid.error) && !paid.data?.getAllOrdersByAdmin;
	const moneyLoading = !paid.data && paid.loading;

	const moneyValue = (key: 'revenue' | 'commission') => {
		if (moneyLoading) return <span className="tz-skel tz-skel--title" aria-busy="true" />;
		if (moneyFailed) return <span className="adm-muted">–</span>;
		if (!money.length) return formatPrice(0, locale, 'KRW');
		return (
			<>
				{money.map((m) => (
					<span key={m.currency} className="adm-block">
						{formatPrice(m[key], locale, m.currency)}
					</span>
				))}
			</>
		);
	};

	const tile = (label: string, value: React.ReactNode, href?: string, hint?: string) => (
		<li className="org-stat">
			{href ? (
				<Link href={href}>
					<span className="org-stat__label">{label}</span>
					<span className="org-stat__value">{value}</span>
				</Link>
			) : (
				<>
					<span className="org-stat__label">{label}</span>
					<span className="org-stat__value">{value}</span>
				</>
			)}
			{hint && <span className="org-row__meta">{hint}</span>}
		</li>
	);

	const skeleton = <span className="tz-skel tz-skel--title" aria-busy="true" />;
	const count = (block: { metaCounter?: { total?: number }[] } | null | undefined) => (firstLoad ? skeleton : <CountUp value={totalOf(block)} format={(n) => formatNumber(n, locale)} />);

	return (
		<div className="org-page">
			<Head>
				<title>{`${t('overview.title')} · Ticketzy`}</title>
			</Head>
			<div className="tz-pagehead org-pagehead">
				<div>
					<h1>{t('overview.title')}</h1>
					<p>{t('overview.subtitle')}</p>
				</div>
			</div>

			{failedAll ? (
				<StateBlock
					alert
					icon={<WarningCircle size={28} />}
					title={t('overview.error.title')}
					text={networkError ? t('errors.network') : t('overview.error.text')}
					actions={
						<Button
							variant="outlined"
							onClick={() => {
								overview.forEach((q) => q.refetch());
								paid.refetch();
								payoutsQuery.refetch();
							}}
						>
							{t('errors.retry')}
						</Button>
					}
				/>
			) : (
				<>
					<ul className="org-stats adm-stats" aria-label={t('overview.figures')}>
						{tile(t('overview.pendingEvents'), count(data?.pendingEvents), '/admin/events', t('overview.pendingEventsHint'))}
						{tile(t('overview.pendingOrganizers'), count(data?.pendingOrganizers), '/admin/organizers', t('overview.pendingOrganizersHint'))}
						{tile(t('overview.activeEvents'), count(data?.activeEvents), '/admin/events?tab=approved', t('overview.activeEventsHint'))}
						{tile(t('overview.totalOrders'), count(data?.allOrders), '/admin/orders', t('overview.totalOrdersHint'))}
						{tile(t('overview.revenue'), moneyValue('revenue'), undefined, moneyFailed ? t('overview.moneyFailed') : t('overview.revenueHint', { paid: formatNumber(paidTotal, locale) }))}
						{tile(t('overview.commission'), moneyValue('commission'), '/admin/commission', t('overview.commissionHint'))}
					</ul>
					{dueBlock && (
						<p className="adm-due-link">
							<CreditCard size={20} aria-hidden="true" />
							<span>
								{dueCount > 0
									? t('overview.payoutsDue', { n: formatNumber(dueCount, locale), amount: formatPrice(dueBlock.totals?.totalDue ?? 0, locale, 'KRW') })
									: t('overview.payoutsNone')}
							</span>
							<Link href={dueCount > 0 ? '/admin/payouts?status=DUE' : '/admin/payouts'} className="tz-link">
								{t('overview.payoutsOpen')}
							</Link>
						</p>
					)}
					{paidTotal > paidLoaded && paidLoaded > 0 && <p className="org-hint">{t('overview.moneyCap', { limit: formatNumber(PAID_SUM_LIMIT, locale), total: formatNumber(paidTotal, locale) })}</p>}

					<div className="adm-queues">
						<section className="adm-card" aria-labelledby="q-events">
							<div className="adm-card__head">
								<h2 id="q-events" className="adm-card__title">
									{t('overview.queueEvents')}
								</h2>
								<Link href="/admin/events" className="tz-link">
									{t('overview.viewAll')}
								</Link>
							</div>
							{firstLoad ? (
								<span className="tz-skel tz-skel--block" aria-busy="true" />
							) : pendingEvents.length === 0 ? (
								<p className="adm-empty">
									<CheckCircle size={20} aria-hidden="true" /> {t('overview.queueEventsEmpty')}
								</p>
							) : (
								<ul className="adm-queue">
									{pendingEvents.map((event) => (
										<li key={event._id}>
											<Link href={`/admin/events/${event._id}`} className="org-row__title">
												{localizedEvent({ ...event, eventDesc: null }, locale).title}
											</Link>
											<span className="org-row__meta">
												{t('events.by', { name: organizerName(event.memberData) || '–' })} · {t('events.updated', { date: formatViewerDate(event.updatedAt, locale, true) })}
											</span>
										</li>
									))}
								</ul>
							)}
						</section>
						<section className="adm-card" aria-labelledby="q-orgs">
							<div className="adm-card__head">
								<h2 id="q-orgs" className="adm-card__title">
									{t('overview.queueOrganizers')}
								</h2>
								<Link href="/admin/organizers" className="tz-link">
									{t('overview.viewAll')}
								</Link>
							</div>
							{firstLoad ? (
								<span className="tz-skel tz-skel--block" aria-busy="true" />
							) : pendingOrganizers.length === 0 ? (
								<p className="adm-empty">
									<CheckCircle size={20} aria-hidden="true" /> {t('overview.queueOrganizersEmpty')}
								</p>
							) : (
								<ul className="adm-queue">
									{pendingOrganizers.map((organizer) => (
										<li key={organizer._id}>
											<Link href={`/admin/organizers?q=${encodeURIComponent(organizer.memberNick || organizer.memberEmail || '')}`} className="org-row__title">
												{organizerName(organizer)}
											</Link>
											<span className="org-row__meta">
												<MemberStatusBadge status={organizer.memberStatus} /> {t('organizers.registered', { date: formatViewerDate(organizer.createdAt, locale, true) })}
											</span>
										</li>
									))}
								</ul>
							)}
						</section>
					</div>
				</>
			)}
		</div>
	);
};

export default withAdminLayout(Overview);
