import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { CreditCard, Info, WarningCircle } from 'phosphor-react';
import StateBlock from '../../states/StateBlock';
import PayoutStatusChip from '../../payouts/PayoutStatusChip';
import PayoutTiles from '../../payouts/PayoutTiles';
import PayoutPaging from '../../payouts/PayoutPaging';
import useListParams from '../../../admin/useListParams';
import { isOnlyNoData } from '../../../admin/errors';
import { GET_MY_PAYOUTS } from '../../../../apollo/payouts';
import { DEFAULT_TIMEZONE, formatEventDay, formatNumber, formatPrice, formatViewerDate } from '../../../format';
import { NETWORK_ERROR, parseApiError } from '../../../errors';
import { PAYOUT_STATUSES, PAYOUTS_PAGE_SIZE, PayoutRow, PayoutTotals, isPayoutStatus } from '../../../payouts';
import { organizerEventOrdersUrl } from '../../../routes';

const DEFAULTS = { status: 'ALL', sort: 'newest' };
const isStatus = (value: string) => value === 'ALL' || isPayoutStatus(value);
const isSort = (value: string) => value === 'newest' || value === 'oldest';

/** The organizer's payout schedule (`getMyPayouts`): totals, a status filter and one row per event. */
const MyPayouts = ({ skip }: { skip: boolean }) => {
	const { t } = useTranslation('organizer');
	const { t: tc } = useTranslation('common');
	const { locale } = useRouter();
	const { values, page, update, ready } = useListParams(DEFAULTS, { status: isStatus, sort: isSort });
	const money = (amount: number) => formatPrice(amount, locale, 'KRW');

	const { data, previousData, loading, error, refetch } = useQuery(GET_MY_PAYOUTS, {
		variables: {
			input: {
				page,
				limit: PAYOUTS_PAGE_SIZE,
				direction: values.sort === 'oldest' ? 'ASC' : 'DESC',
				...(values.status !== 'ALL' ? { payoutStatus: values.status } : {}),
			},
		},
		skip: skip || !ready,
		fetchPolicy: 'cache-and-network',
		errorPolicy: 'all',
	});

	const block = data?.getMyPayouts;
	const rows: PayoutRow[] = block?.list ?? [];
	const total: number = block?.metaCounter?.[0]?.total ?? 0;
	const totals: PayoutTotals | undefined = (block ?? previousData?.getMyPayouts)?.totals;
	const failed = Boolean(error) && !isOnlyNoData(error) && !block;
	const networkError = error ? parseApiError(error).code === NETWORK_ERROR : false;
	const firstLoad = !ready || (loading && !block && !error);
	const pageCount = Math.max(1, Math.ceil(total / PAYOUTS_PAGE_SIZE));
	const filtered = values.status !== 'ALL';

	useEffect(() => {
		if (block && page > pageCount) update({ page: pageCount }, 'replace');
	}, [block, page, pageCount, update]);

	return (
		<section aria-labelledby="pay-schedule" className="org-pay">
			<h2 id="pay-schedule" className="org-subtitle">
				{t('payouts.schedule.title')}
			</h2>
			<p className="org-hint">{t('payouts.schedule.explain')}</p>
			<p className="tz-alert tz-alert--info" role="note">
				<Info size={20} aria-hidden="true" />
				<span>{t('payouts.schedule.demo')}</span>
			</p>

			<PayoutTiles totals={totals} loading={firstLoad && !failed} label={t('payouts.schedule.totals')} />

			<div className="org-toolbar">
				<label className="org-select">
					<span className="org-visually-hidden">{t('payouts.schedule.statusFilter')}</span>
					<select className="tz-input" value={values.status} onChange={(event) => update({ status: event.target.value })}>
						<option value="ALL">{tc('payoutStatus.ALL')}</option>
						{PAYOUT_STATUSES.map((status) => (
							<option key={status} value={status}>
								{tc(`payoutStatus.${status}`)}
							</option>
						))}
					</select>
				</label>
				<label className="org-select">
					<span className="org-visually-hidden">{t('payouts.schedule.sort')}</span>
					<select className="tz-input" value={values.sort} onChange={(event) => update({ sort: event.target.value })}>
						<option value="newest">{t('payouts.schedule.newest')}</option>
						<option value="oldest">{t('payouts.schedule.oldest')}</option>
					</select>
				</label>
			</div>

			{failed ? (
				<StateBlock
					alert
					icon={<WarningCircle size={28} />}
					title={t('payouts.schedule.error')}
					text={networkError ? t('errors.network') : undefined}
					actions={
						<Button variant="outlined" onClick={() => refetch()}>
							{t('errors.retry')}
						</Button>
					}
				/>
			) : firstLoad ? (
				<ul className="org-rows" aria-busy="true" aria-label={t('payouts.schedule.loading')}>
					{[0, 1, 2].map((n) => (
						<li key={n} className="org-row">
							<span className="tz-skel tz-skel--block" />
						</li>
					))}
				</ul>
			) : rows.length === 0 ? (
				<StateBlock
					icon={<CreditCard size={28} />}
					title={filtered ? t('payouts.schedule.noneFiltered.title') : t('payouts.schedule.none.title')}
					text={filtered ? t('payouts.schedule.noneFiltered.text') : t('payouts.schedule.none.text')}
					actions={
						filtered ? (
							<Button variant="outlined" onClick={() => update({ status: 'ALL' })}>
								{t('payouts.schedule.clear')}
							</Button>
						) : undefined
					}
				/>
			) : (
				<>
					<div className="org-table org-table--schedule" role="table" aria-label={t('payouts.schedule.title')}>
						<div className="org-row org-row--head" role="row">
							<span role="columnheader">{t('payouts.cols.event')}</span>
							<span role="columnheader">{t('payouts.schedule.cols.date')}</span>
							<span role="columnheader">{t('payouts.cols.state')}</span>
							<span role="columnheader" className="org-num">
								{t('payouts.cols.gross')}
							</span>
							<span role="columnheader" className="org-num">
								{t('payouts.cols.commission')}
							</span>
							<span role="columnheader" className="org-num">
								{t('payouts.cols.net')}
							</span>
							<span role="columnheader" className="org-num">
								{t('payouts.schedule.cols.orders')}
							</span>
							<span role="columnheader">{t('payouts.schedule.cols.paid')}</span>
						</div>
						{rows.map((row) => (
							<div className="org-row" role="row" key={row.eventId}>
								<div role="cell" className="org-row__event">
									<Link href={organizerEventOrdersUrl(row.eventId)} className="org-row__title">
										{row.eventTitle}
									</Link>
								</div>
								<div role="cell">
									<span className="org-row__label">{t('payouts.schedule.cols.date')}</span>
									{formatEventDay(row.payoutDate, locale, DEFAULT_TIMEZONE)}
								</div>
								<div role="cell">
									<span className="org-row__label">{t('payouts.cols.state')}</span>
									<PayoutStatusChip status={row.payoutStatus} />
								</div>
								<div role="cell" className="org-num">
									<span className="org-row__label">{t('payouts.cols.gross')}</span>
									{money(row.gross)}
								</div>
								<div role="cell" className="org-num">
									<span className="org-row__label">{t('payouts.cols.commission')}</span>−{money(row.commission)}
								</div>
								<div role="cell" className="org-num">
									<span className="org-row__label">{t('payouts.cols.net')}</span>
									<strong>{money(row.net)}</strong>
								</div>
								<div role="cell" className="org-num">
									<span className="org-row__label">{t('payouts.schedule.cols.orders')}</span>
									{formatNumber(row.orderCount, locale)}
								</div>
								<div role="cell">
									<span className="org-row__label">{t('payouts.schedule.cols.paid')}</span>
									{row.payoutStatus === 'PAID_OUT' && row.paidAt ? formatViewerDate(row.paidAt, locale) : <span aria-label={t('payouts.schedule.notPaid')}>–</span>}
								</div>
							</div>
						))}
					</div>
					<PayoutPaging page={page} total={total} shown={rows.length} onChange={(next) => update({ page: next })} />
				</>
			)}
		</section>
	);
};

export default MyPayouts;
