import { useEffect, useState } from 'react';
import { NextPage, GetStaticPropsContext } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useApolloClient, useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { CheckCircle, CreditCard, MagnifyingGlass, WarningCircle } from 'phosphor-react';
import withAdminLayout from '../../../libs/components/layout/LayoutAdmin';
import StateBlock from '../../../libs/components/states/StateBlock';
import MarkPaidDialog from '../../../libs/components/admin/MarkPaidDialog';
import PayoutStatusChip from '../../../libs/components/payouts/PayoutStatusChip';
import PayoutTiles from '../../../libs/components/payouts/PayoutTiles';
import PayoutPaging from '../../../libs/components/payouts/PayoutPaging';
import useListParams from '../../../libs/admin/useListParams';
import { describeAdminError, isOnlyNoData } from '../../../libs/admin/errors';
import { GET_PAYOUTS_BY_ADMIN, MARK_PAYOUT_PAID } from '../../../apollo/payouts';
import { dayBoundaryIso, DEFAULT_TIMEZONE, formatEventDay, formatNumber, formatPrice, formatViewerDate } from '../../../libs/format';
import { PAYOUT_STATUSES, PAYOUTS_PAGE_SIZE, PayoutRow, PayoutTotals, isPayoutStatus } from '../../../libs/payouts';

export const getStaticProps = async ({ locale }: GetStaticPropsContext) => ({
	props: {
		...(await serverSideTranslations(locale ?? 'en', ['common', 'admin', 'events'])),
	},
});

const DEFAULTS = { status: 'ALL', q: '', from: '', to: '', sort: 'newest' };
const isStatus = (value: string) => value === 'ALL' || isPayoutStatus(value);
const isSort = (value: string) => value === 'newest' || value === 'oldest';
const isDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

/** Payouts of all organizers (`getPayoutsByAdmin`): filters live in the URL, DUE rows can be marked as paid out. */
const AdminPayouts: NextPage = () => {
	const { t } = useTranslation('admin');
	const { t: tc } = useTranslation('common');
	const { locale } = useRouter();
	const client = useApolloClient();
	const { values, page, update, ready } = useListParams(DEFAULTS, { status: isStatus, sort: isSort, from: isDay, to: isDay });
	const [search, setSearch] = useState(values.q);
	const [target, setTarget] = useState<PayoutRow | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const money = (amount: number) => formatPrice(amount, locale, 'KRW');

	useEffect(() => setSearch(values.q), [values.q]);
	useEffect(() => {
		if (search === values.q) return undefined;
		const id = window.setTimeout(() => update({ q: search }, 'replace'), 300);
		return () => window.clearTimeout(id);
	}, [search, values.q, update]);

	const text = values.q.trim();
	// an inverted range is sent as it is: the backend refuses it and its message is shown
	const { data, previousData, loading, error, refetch } = useQuery(GET_PAYOUTS_BY_ADMIN, {
		variables: {
			input: {
				page,
				limit: PAYOUTS_PAGE_SIZE,
				direction: values.sort === 'oldest' ? 'ASC' : 'DESC',
				...(values.status !== 'ALL' ? { payoutStatus: values.status } : {}),
				...(text ? { text } : {}),
				...(values.from ? { dateFrom: dayBoundaryIso(values.from, false) } : {}),
				...(values.to ? { dateTo: dayBoundaryIso(values.to, true) } : {}),
			},
		},
		skip: !ready,
		fetchPolicy: 'cache-and-network',
		errorPolicy: 'all',
	});

	const block = data?.getPayoutsByAdmin;
	const rows: PayoutRow[] = block?.list ?? [];
	const total: number = block?.metaCounter?.[0]?.total ?? 0;
	const totals: PayoutTotals | undefined = (block ?? previousData?.getPayoutsByAdmin)?.totals;
	const failed = Boolean(error) && !isOnlyNoData(error) && !block;
	const described = error ? describeAdminError(error) : null;
	const failText = !described ? '' : described.network ? t('errors.network') : described.key ? t(`serverErrors.${described.key}`) : described.raw || t('errors.generic');
	const firstLoad = !ready || (loading && !block && !error);
	const empty = !firstLoad && !failed && rows.length === 0;
	const filtered = Boolean(values.status !== 'ALL' || text || values.from || values.to);
	const pageCount = Math.max(1, Math.ceil(total / PAYOUTS_PAGE_SIZE));

	useEffect(() => {
		if (block && page > pageCount) update({ page: pageCount }, 'replace');
	}, [block, page, pageCount, update]);

	const markPaid = async (payout: PayoutRow, note: string) => {
		try {
			await client.mutate({ mutation: MARK_PAYOUT_PAID, variables: { input: { eventId: payout.eventId, ...(note ? { note } : {}) } } });
		} catch (err) {
			// the row may have changed under us (another admin paid it): show the refusal and reload the list behind the dialog
			void refetch();
			throw err;
		}
		setTarget(null);
		setNotice(t('payouts.notice.paid', { title: payout.eventTitle, amount: money(payout.net) }));
		await refetch();
	};

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

			<PayoutTiles totals={totals} loading={firstLoad && !failed} label={t('payouts.totals')} />

			{notice && (
				<p className="tz-alert tz-alert--success" role="status">
					<CheckCircle size={20} aria-hidden="true" />
					<span>{notice}</span>
				</p>
			)}

			<div className="org-toolbar">
				<label className="org-search">
					<MagnifyingGlass size={20} aria-hidden="true" />
					<span className="org-visually-hidden">{t('payouts.search')}</span>
					<input type="search" className="tz-input" value={search} placeholder={t('payouts.searchPlaceholder')} maxLength={100} onChange={(event) => setSearch(event.target.value)} />
				</label>
				<label className="org-select">
					<span className="org-visually-hidden">{t('payouts.statusFilter')}</span>
					<select className="tz-input" value={values.status} onChange={(event) => update({ status: event.target.value })}>
						<option value="ALL">{tc('payoutStatus.ALL')}</option>
						{PAYOUT_STATUSES.map((status) => (
							<option key={status} value={status}>
								{tc(`payoutStatus.${status}`)}
							</option>
						))}
					</select>
				</label>
				<label className="org-select adm-date">
					<span className="org-visually-hidden">{t('payouts.dateFrom')}</span>
					<span aria-hidden="true" className="adm-muted">
						{t('payouts.from')}
					</span>
					<input type="date" className="tz-input" value={values.from} onChange={(event) => update({ from: event.target.value })} />
				</label>
				<label className="org-select adm-date">
					<span className="org-visually-hidden">{t('payouts.dateTo')}</span>
					<span aria-hidden="true" className="adm-muted">
						{t('payouts.to')}
					</span>
					<input type="date" className="tz-input" value={values.to} onChange={(event) => update({ to: event.target.value })} />
				</label>
				<label className="org-select">
					<span className="org-visually-hidden">{t('payouts.sort')}</span>
					<select className="tz-input" value={values.sort} onChange={(event) => update({ sort: event.target.value })}>
						<option value="newest">{t('payouts.newest')}</option>
						<option value="oldest">{t('payouts.oldest')}</option>
					</select>
				</label>
			</div>

			{failed ? (
				<StateBlock
					alert
					icon={<WarningCircle size={28} />}
					title={t('payouts.error.title')}
					text={failText}
					actions={
						<Button variant="outlined" onClick={() => refetch()}>
							{t('errors.retry')}
						</Button>
					}
				/>
			) : firstLoad ? (
				<ul className="org-rows" aria-busy="true" aria-label={t('payouts.loading')}>
					{[0, 1, 2].map((n) => (
						<li key={n} className="org-row">
							<span className="tz-skel tz-skel--block" />
						</li>
					))}
				</ul>
			) : empty ? (
				<StateBlock
					icon={filtered ? <MagnifyingGlass size={28} /> : <CreditCard size={28} />}
					title={filtered ? t('payouts.none.title') : t('payouts.empty.title')}
					text={filtered ? t('payouts.none.text') : t('payouts.empty.text')}
					actions={
						filtered ? (
							<Button variant="outlined" onClick={() => update({ status: 'ALL', q: '', from: '', to: '' })}>
								{t('payouts.none.clear')}
							</Button>
						) : undefined
					}
				/>
			) : (
				<>
					<div className="org-table adm-table adm-table--payouts" role="table" aria-label={t('payouts.title')}>
						<div className="org-row org-row--head" role="row">
							<span role="columnheader">{t('payouts.cols.event')}</span>
							<span role="columnheader">{t('payouts.cols.date')}</span>
							<span role="columnheader">{t('payouts.cols.status')}</span>
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
								{t('payouts.cols.orders')}
							</span>
							<span role="columnheader">{t('payouts.cols.paid')}</span>
						</div>
						{rows.map((row) => (
							<div className="org-row" role="row" key={row.eventId}>
								<div role="cell" className="org-row__event">
									<Link href={`/admin/events/${row.eventId}`} className="org-row__title">
										{row.eventTitle}
									</Link>
									<span className="org-row__meta">{row.organizerNick || '–'}</span>
									{row.organizerEmail && <span className="org-row__meta">{row.organizerEmail}</span>}
								</div>
								<div role="cell">
									<span className="org-row__label">{t('payouts.cols.date')}</span>
									{formatEventDay(row.payoutDate, locale, DEFAULT_TIMEZONE)}
								</div>
								<div role="cell">
									<span className="org-row__label">{t('payouts.cols.status')}</span>
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
									<span className="org-row__label">{t('payouts.cols.orders')}</span>
									{formatNumber(row.orderCount, locale)}
								</div>
								<div role="cell" className="adm-paid">
									<span className="org-row__label">{t('payouts.cols.paid')}</span>
									{row.payoutStatus === 'DUE' ? (
										<Button
											variant="contained"
											size="small"
											aria-label={t('payouts.markAria', { title: row.eventTitle })}
											onClick={() => {
												setNotice(null);
												setTarget(row);
											}}
										>
											{t('payouts.mark')}
										</Button>
									) : row.payoutStatus === 'PAID_OUT' ? (
										<>
											<span>{row.paidAt ? formatViewerDate(row.paidAt, locale, true) : '–'}</span>
											{row.paidBy && (
												<span className="org-row__meta" title={row.paidBy}>
													{t('payouts.paidBy', { id: row.paidBy.slice(-6) })}
												</span>
											)}
											{row.note && <span className="org-row__meta">{row.note}</span>}
										</>
									) : (
										<span aria-label={t('payouts.notPaid')}>–</span>
									)}
								</div>
							</div>
						))}
					</div>
					<PayoutPaging page={page} total={total} shown={rows.length} onChange={(next) => update({ page: next })} />
				</>
			)}

			<MarkPaidDialog payout={target} onClose={() => setTarget(null)} onConfirm={markPaid} />
		</div>
	);
};

export default withAdminLayout(AdminPayouts);
