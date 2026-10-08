import { useMemo } from 'react';
import { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Clock, Prohibit, Receipt, WarningCircle } from 'phosphor-react';
import { withOrganizerLayout } from '../../libs/components/layout/LayoutAdmin';
import EventStatusBadge from '../../libs/components/organizer/EventStatusBadge';
import useAuth from '../../libs/hooks/useAuth';
import { GET_MY_EARNINGS, GET_MY_EVENT_COUNTS, GET_MY_EVENTS, ticketTypesOfEventsQuery } from '../../apollo/organizer/query';
import { EVENT_STATUSES, isUpcoming } from '../../libs/organizer/events';
import { OrgEvent } from '../../libs/organizer/types';
import { localizedEvent } from '../../libs/events';
import { formatEventDate, formatNumber, formatPrice } from '../../libs/format';
import { organizerEventEditUrl, organizerEventNewUrl, organizerEventsUrl } from '../../libs/routes';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common', 'organizer'])),
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
								<strong className="org-stat__value">{active ? formatNumber(total(status), locale) : '–'}</strong>
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
					<ul className="org-stats">
						<li className="org-stat">
							<span className="org-stat__label">{t('dashboard.ticketsSold')}</span>
							<strong className="org-stat__value">{active ? formatNumber(main?.ticketsSold ?? 0, locale) : '–'}</strong>
						</li>
						<li className="org-stat">
							<span className="org-stat__label">{t('dashboard.revenue')}</span>
							<strong className="org-stat__value">{active ? formatPrice(main?.revenue ?? 0, locale, currency) : '–'}</strong>
						</li>
						<li className="org-stat">
							<span className="org-stat__label">{t('dashboard.commission')}</span>
							<strong className="org-stat__value">{active ? formatPrice(main?.commission ?? 0, locale, currency) : '–'}</strong>
						</li>
						<li className="org-stat">
							<span className="org-stat__label">{t('dashboard.netPayout')}</span>
							<strong className="org-stat__value">{active ? formatPrice(main?.netPayout ?? 0, locale, currency) : '–'}</strong>
						</li>
					</ul>
				)}
				<p className="org-hint">{t('dashboard.salesNote')}</p>
			</section>

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
											{formatEventDate(event.startAt, locale, event.venueData?.venueTimezone, true)}
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
						<div className="org-placeholder">
							<Receipt size={28} aria-hidden="true" />
							<p>
								<strong>{t('dashboard.ordersSoonTitle')}</strong> {t('dashboard.ordersSoonText')}
							</p>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
};

export default withOrganizerLayout(Overview);
