import { useMemo } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { CheckCircle, WarningCircle } from 'phosphor-react';
import withAdminLayout from '../../libs/components/layout/LayoutAdmin';
import StateBlock from '../../libs/components/states/StateBlock';
import MemberStatusBadge from '../../libs/components/admin/MemberStatusBadge';
import { GET_ADMIN_OVERVIEW, GET_ADMIN_PAID_ORDERS, PAID_SUM_LIMIT } from '../../apollo/admin/query';
import { isOnlyNoData } from '../../libs/admin/errors';
import { AdminEventRow, AdminOrganizer, organizerName } from '../../libs/admin/types';
import { localizedEvent } from '../../libs/events';
import { formatNumber, formatPrice, formatViewerDate } from '../../libs/format';
import { NETWORK_ERROR, parseApiError } from '../../libs/errors';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common', 'admin', 'organizer'])),
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
	// An empty list is an error ("No data found!") on some admin queries, so partial results are kept
	const overview = useQuery(GET_ADMIN_OVERVIEW, { errorPolicy: 'all', fetchPolicy: 'cache-and-network' });
	const paid = useQuery(GET_ADMIN_PAID_ORDERS, { errorPolicy: 'all', fetchPolicy: 'cache-and-network' });

	const data = overview.data;
	const realError = overview.error && !isOnlyNoData(overview.error);
	const failedAll = Boolean(realError) && !data?.allOrders && !data?.activeEvents && !data?.pendingOrganizers;
	const firstLoad = !data && overview.loading;
	const networkError = overview.error ? parseApiError(overview.error).code === NETWORK_ERROR : false;

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
	const count = (block: { metaCounter?: { total?: number }[] } | null | undefined) => (firstLoad ? skeleton : formatNumber(totalOf(block), locale));

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
								overview.refetch();
								paid.refetch();
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
