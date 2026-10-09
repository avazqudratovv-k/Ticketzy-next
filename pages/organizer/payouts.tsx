import { useMemo } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { CreditCard, Info, WarningCircle } from 'phosphor-react';
import { withOrganizerLayout } from '../../libs/components/layout/LayoutAdmin';
import BlockedPanel from '../../libs/components/organizer/BlockedPanel';
import CommissionTier from '../../libs/components/organizer/sales/CommissionTier';
import StateBlock from '../../libs/components/states/StateBlock';
import useAuth from '../../libs/hooks/useAuth';
import useSalesEvents from '../../libs/organizer/useSalesEvents';
import { GET_MY_EARNINGS } from '../../apollo/organizer/query';
import { GET_ORDERS_FOR_SALES, GET_ORGANIZER_ME, salesOfEventsQuery } from '../../apollo/organizer/sales';
import { commissionState } from '../../libs/organizer/commission';
import { EventMoney, moneyByEvent, TypeSales } from '../../libs/organizer/payouts';
import { formatEventDate, formatNumber, formatPrice } from '../../libs/format';
import { organizerEventOrdersUrl } from '../../libs/routes';

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

const REFUND_LIMIT = 1000;

const Payouts: NextPage = () => {
	const { t } = useTranslation('organizer');
	const { locale } = useRouter();
	const { user, organizerAccess } = useAuth();
	const blocked = organizerAccess !== null && organizerAccess !== 'active';
	const skip = blocked || organizerAccess === null;

	const { events, loading: eventsLoading, error: eventsError, refetch: refetchEvents, title, truncated } = useSalesEvents(skip, locale);
	const { data: earningData, error: earningError, refetch: refetchEarnings } = useQuery(GET_MY_EARNINGS, { skip, fetchPolicy: 'cache-and-network', errorPolicy: 'all' });
	const { data: me } = useQuery(GET_ORGANIZER_ME, { variables: { memberId: user?._id }, skip: skip || !user, fetchPolicy: 'cache-and-network', errorPolicy: 'all' });
	const { data: refundData } = useQuery(GET_ORDERS_FOR_SALES, {
		variables: { input: { page: 1, limit: REFUND_LIMIT, orderStatus: 'REFUNDED' } },
		skip,
		fetchPolicy: 'cache-and-network',
		errorPolicy: 'all',
	});

	const ids = events.map((e) => e._id);
	const { data: salesData, error: salesError } = useQuery(salesOfEventsQuery(ids.length ? ids : ['none']), {
		variables: Object.fromEntries(ids.map((id, i) => [`id${i}`, id])),
		skip: skip || ids.length === 0,
		fetchPolicy: 'cache-and-network',
		errorPolicy: 'all',
	});

	const earnings: Earning[] = earningData?.getMyEarnings?.earnings ?? [];
	// KRW is the platform currency; any other currency in the data is named in a note
	const main = earnings.find((item) => item.currency === 'KRW') ?? earnings[0];
	const currency = main?.currency ?? 'KRW';
	const money = (amount: number) => formatPrice(amount, locale, currency);

	const member = me?.getMember;
	const state = member ? commissionState(member.completedEvents, member.commissionOverride) : null;

	const refunds = useMemo(() => (refundData?.getMyEventOrders?.list ?? []) as { eventId: string; totalAmount: number; currency?: string | null }[], [refundData]);
	const refundTotal: number = refundData?.getMyEventOrders?.metaCounter?.[0]?.total ?? 0;
	const rows: EventMoney[] = useMemo(() => {
		const sales = new Map<string, TypeSales[]>();
		ids.forEach((id, i) => sales.set(id, (salesData?.[`s${i}`]?.ticketTypes ?? []) as TypeSales[]));
		return moneyByEvent(events, sales, refunds, currency).filter((row) => row.tickets > 0 || row.refundedOrders > 0);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [events, salesData, refunds, currency]);
	const salesReady = ids.length === 0 || Boolean(salesData);
	const sum = (which: EventMoney['state'] | null, pick: (row: EventMoney) => number) => rows.filter((r) => !which || r.state === which).reduce((n, r) => n + pick(r), 0);

	if (organizerAccess && blocked) return <BlockedPanel access={organizerAccess} action="events" />;

	const failed = (earningError && !earningData) || eventsError;
	const eventDate = (row: EventMoney) => formatEventDate(row.event.endAt, locale, row.event.venueData?.venueTimezone, true);

	return (
		<div className="org-page">
			<Head>
				<title>{`${t('payouts.title')} · Ticketzy`}</title>
			</Head>
			<div className="tz-pagehead org-pagehead">
				<div>
					<h1>{t('payouts.title')}</h1>
					<p>{t('payouts.subtitle')}</p>
				</div>
			</div>

			<p className="tz-alert tz-alert--info" role="note">
				<Info size={20} aria-hidden="true" />
				<span>{t('payouts.notTracked')}</span>
			</p>

			{failed ? (
				<StateBlock
					alert
					icon={<WarningCircle size={28} />}
					title={t('payouts.error.title')}
					text={t('errors.network')}
					actions={
						<Button
							variant="outlined"
							onClick={() => {
								void refetchEarnings();
								void refetchEvents();
							}}
						>
							{t('errors.retry')}
						</Button>
					}
				/>
			) : (
				<>
					<section aria-labelledby="pay-summary">
						<h2 id="pay-summary" className="org-subtitle">
							{t('payouts.summary')}
						</h2>
						<ul className="org-stats org-stats--four">
							<li className="org-stat">
								<span className="org-stat__label">{t('payouts.gross')}</span>
								<strong className="org-stat__value">{earningData ? money(main?.revenue ?? 0) : '–'}</strong>
								<span className="org-hint">{earningData ? t('payouts.grossSub', { count: main?.ticketsSold ?? 0, n: formatNumber(main?.ticketsSold ?? 0, locale) }) : ' '}</span>
							</li>
							<li className="org-stat">
								<span className="org-stat__label">{t('payouts.commission')}</span>
								<strong className="org-stat__value">{earningData ? money(main?.commission ?? 0) : '–'}</strong>
								<span className="org-hint">{t('payouts.commissionSub')}</span>
							</li>
							<li className="org-stat">
								<span className="org-stat__label">{t('payouts.net')}</span>
								<strong className="org-stat__value">{earningData ? money(main?.netPayout ?? 0) : '–'}</strong>
								<span className="org-hint">{t('payouts.netSub')}</span>
							</li>
							<li className="org-stat">
								<span className="org-stat__label">{t('payouts.refunded')}</span>
								<strong className="org-stat__value">{earningData ? money(main?.refundedAmount ?? 0) : '–'}</strong>
								<span className="org-hint">{t('payouts.refundedSub')}</span>
							</li>
						</ul>
						<p className="org-hint">{t('payouts.allTime')}</p>
						{earnings.length > 1 && <p className="org-hint">{t('dashboard.otherCurrencies', { currencies: earnings.filter((e) => e !== main).map((e) => e.currency).join(', ') })}</p>}
					</section>

					<section className="org-card" aria-labelledby="pay-split">
						<div className="org-card__head">
							<h2 id="pay-split">{t('payouts.split.title')}</h2>
						</div>
						{!salesReady && !salesError ? (
							<span className="tz-skel tz-skel--block" aria-busy="true" />
						) : (
							<dl className="org-dl org-dl--wide">
								<div>
									<dt>{t('payouts.split.ended')}</dt>
									<dd>{money(sum('ended', (r) => r.net))}</dd>
								</div>
								<div>
									<dt>{t('payouts.split.selling')}</dt>
									<dd>{money(sum('selling', (r) => r.net))}</dd>
								</div>
							</dl>
						)}
						<p className="org-hint">{t('payouts.split.note')}</p>
					</section>

					<section className="org-card" aria-labelledby="pay-tier">
						<div className="org-card__head">
							<h2 id="pay-tier">{t('payouts.tier.title')}</h2>
						</div>
						{state && member ? <CommissionTier state={state} completed={member.completedEvents} /> : <span className="tz-skel tz-skel--block" aria-busy="true" />}
					</section>

					<section aria-labelledby="pay-events">
						<h2 id="pay-events" className="org-subtitle">
							{t('payouts.byEvent')}
						</h2>
						{eventsLoading || (!salesReady && !salesError) ? (
							<span className="tz-skel tz-skel--block" aria-busy="true" />
						) : rows.length === 0 ? (
							<StateBlock icon={<CreditCard size={28} />} title={t('payouts.empty.title')} text={t('payouts.empty.text')} />
						) : (
							<>
								<div className="org-table org-table--payouts" role="table" aria-label={t('payouts.byEvent')}>
									<div className="org-row org-row--head" role="row">
										<span role="columnheader">{t('payouts.cols.event')}</span>
										<span role="columnheader" className="org-num">
											{t('payouts.cols.gross')}
										</span>
										<span role="columnheader" className="org-num">
											{t('payouts.cols.commission')}
										</span>
										<span role="columnheader" className="org-num">
											{t('payouts.cols.refunded')}
										</span>
										<span role="columnheader" className="org-num">
											{t('payouts.cols.net')}
										</span>
										<span role="columnheader">{t('payouts.cols.state')}</span>
									</div>
									{rows.map((row) => (
										<div className="org-row" role="row" key={row.event._id}>
											<div role="cell" className="org-row__event">
												<Link href={organizerEventOrdersUrl(row.event._id)} className="org-row__title">
													{title(row.event)}
												</Link>
												<span className="org-row__meta">{t(row.state === 'selling' ? 'payouts.endsOn' : 'payouts.endedOn', { date: eventDate(row) })}</span>
												<span className="org-row__meta">{t('payouts.tickets', { count: row.tickets, n: formatNumber(row.tickets, locale) })}</span>
											</div>
											<div role="cell" className="org-num">
												<span className="org-row__label">{t('payouts.cols.gross')}</span>
												{money(row.gross)}
											</div>
											<div role="cell" className="org-num">
												<span className="org-row__label">{t('payouts.cols.commission')}</span>−{money(row.commission)}
											</div>
											<div role="cell" className="org-num">
												<span className="org-row__label">{t('payouts.cols.refunded')}</span>
												{money(row.refunded)}
											</div>
											<div role="cell" className="org-num">
												<span className="org-row__label">{t('payouts.cols.net')}</span>
												<strong>{money(row.net)}</strong>
											</div>
											<div role="cell">
												<span className={`tz-badge tz-badge--${row.state === 'selling' ? 'info' : row.state === 'ended' ? 'success' : 'neutral'}`}>{t(`payouts.state.${row.state}`)}</span>
											</div>
										</div>
									))}
								</div>
								<p className="org-hint">{t('payouts.tableNote')}</p>
								{(truncated || refundTotal > refunds.length) && <p className="org-hint">{t('payouts.partial')}</p>}
							</>
						)}
					</section>
				</>
			)}
		</div>
	);
};

export default withOrganizerLayout(Payouts);
