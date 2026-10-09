import { useEffect, useMemo, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button, Drawer, IconButton } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Receipt, WarningCircle, X } from 'phosphor-react';
import withAdminLayout from '../../../libs/components/layout/LayoutAdmin';
import StateBlock from '../../../libs/components/states/StateBlock';
import Pagination from '../../../libs/components/events/Pagination';
import OrderStatusBadge from '../../../libs/components/organizer/orders/OrderStatusBadge';
import useListParams from '../../../libs/admin/useListParams';
import { isOrderSortKey, isOrderTab, ORDER_SORTS, ORDER_TABS, OrderSortKey, orderCountKey, OrderTab, orderTabStatus, ORDERS_PAGE_SIZE } from '../../../libs/admin/orders';
import { isOnlyNoData } from '../../../libs/admin/errors';
import { AdminOrder } from '../../../libs/admin/types';
import { GET_ADMIN_ORDER_COUNTS, GET_ADMIN_ORDERS } from '../../../apollo/admin/query';
import { localizedEvent } from '../../../libs/events';
import { formatNumber, formatPrice, formatViewerDate } from '../../../libs/format';
import { NETWORK_ERROR, parseApiError } from '../../../libs/errors';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common', 'admin', 'organizer'])),
	},
});

const DEFAULTS = { tab: 'all', sort: 'newest' };

/** The backend lists orders with a status filter and a sort only (no text search, no event filter), so that is all this page offers. */
const AdminOrders: NextPage = () => {
	const { t } = useTranslation('admin');
	const { t: to } = useTranslation('organizer');
	const { locale } = useRouter();
	const { values, page, update, ready } = useListParams(DEFAULTS, { tab: isOrderTab, sort: isOrderSortKey });
	const tab = values.tab as OrderTab;
	const sortKey = values.sort as OrderSortKey;
	const [selected, setSelected] = useState<AdminOrder | null>(null);

	const { data: countData } = useQuery(GET_ADMIN_ORDER_COUNTS, { skip: !ready, errorPolicy: 'all', fetchPolicy: 'cache-and-network' });
	const status = orderTabStatus(tab);
	const sort = ORDER_SORTS[sortKey];
	const { data, loading, error, refetch } = useQuery(GET_ADMIN_ORDERS, {
		variables: { input: { page, limit: ORDERS_PAGE_SIZE, sort: sort.sort, direction: sort.direction, ...(status ? { orderStatus: status } : {}) } },
		skip: !ready,
		fetchPolicy: 'cache-and-network',
	});

	const rows: AdminOrder[] = useMemo(() => data?.getAllOrdersByAdmin?.list ?? [], [data]);
	const total: number = data?.getAllOrdersByAdmin?.metaCounter?.[0]?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE));
	const count = (key: OrderTab) => countData?.[orderCountKey(key)]?.metaCounter?.[0]?.total ?? 0;
	const failed = Boolean(error) && !isOnlyNoData(error) && !data?.getAllOrdersByAdmin;
	const networkError = error ? parseApiError(error).code === NETWORK_ERROR : false;
	const firstLoad = !ready || (loading && !data && !error);
	const empty = !firstLoad && !failed && rows.length === 0;
	const money = (amount: number, currency?: string | null) => formatPrice(amount, locale, currency || 'KRW');
	const eventTitle = (order: AdminOrder) => (order.eventData ? localizedEvent({ eventTitle: order.eventData.eventTitle, eventDesc: null, eventTranslations: order.eventData.eventTranslations ?? [] }, locale).title : t('orders.eventGone'));

	useEffect(() => {
		if (data && page > pageCount) update({ page: pageCount }, 'replace');
	}, [data, page, pageCount, update]);

	return (
		<div className="org-page">
			<Head>
				<title>{`${t('orders.title')} · Ticketzy`}</title>
			</Head>
			<div className="tz-pagehead org-pagehead">
				<div>
					<h1>{t('orders.title')}</h1>
					<p>{t('orders.subtitle')}</p>
				</div>
			</div>

			<div className="org-tabs" role="tablist" aria-label={t('orders.tabsLabel')}>
				{ORDER_TABS.map((key) => (
					<button key={key} type="button" role="tab" aria-selected={tab === key} className="org-tab" onClick={() => update({ tab: key })}>
						{key === 'all' ? t('orders.tabs.all') : to(`orders.status.${key.toUpperCase()}`)}
						<span className="org-tab__count">{formatNumber(count(key), locale)}</span>
					</button>
				))}
			</div>

			<div className="org-toolbar">
				<label className="org-select">
					<span className="org-visually-hidden">{t('orders.sort')}</span>
					<select className="tz-input" value={sortKey} onChange={(event) => update({ sort: event.target.value })}>
						{(Object.keys(ORDER_SORTS) as OrderSortKey[]).map((key) => (
							<option key={key} value={key}>
								{t(`orders.sorts.${key}`)}
							</option>
						))}
					</select>
				</label>
			</div>

			{failed ? (
				<StateBlock
					alert
					icon={<WarningCircle size={28} />}
					title={t('orders.error.title')}
					text={networkError ? t('errors.network') : t('orders.error.text')}
					actions={
						<Button variant="outlined" onClick={() => refetch()}>
							{t('errors.retry')}
						</Button>
					}
				/>
			) : firstLoad ? (
				<ul className="org-rows" aria-busy="true" aria-label={t('orders.loading')}>
					{[0, 1, 2, 3].map((n) => (
						<li key={n} className="org-row">
							<span className="tz-skel tz-skel--block" />
						</li>
					))}
				</ul>
			) : empty ? (
				<StateBlock
					icon={<Receipt size={28} />}
					title={tab === 'all' ? t('orders.empty.title') : t('orders.none.title')}
					text={tab === 'all' ? t('orders.empty.text') : t('orders.none.text')}
					actions={
						tab !== 'all' ? (
							<Button variant="outlined" onClick={() => update({ tab: 'all' })}>
								{t('orders.none.clear')}
							</Button>
						) : undefined
					}
				/>
			) : (
				<>
					<div className="org-table adm-table adm-table--orders" role="table" aria-label={t('orders.title')}>
						<div className="org-row org-row--head" role="row">
							<span role="columnheader">{t('orders.cols.order')}</span>
							<span role="columnheader">{t('orders.cols.event')}</span>
							<span role="columnheader">{t('orders.cols.status')}</span>
							<span role="columnheader" className="org-num">
								{t('orders.cols.amount')}
							</span>
							<span role="columnheader" className="org-num">
								{t('orders.cols.commission')}
							</span>
							<span role="columnheader">{t('orders.cols.date')}</span>
						</div>
						{rows.map((order) => (
							<div className="org-row" role="row" key={order._id}>
								<div role="cell" className="org-row__event">
									<button type="button" className="org-row__title adm-rowbtn adm-mono" onClick={() => setSelected(order)}>
										{order.orderNumber}
									</button>
									<span className="org-row__meta">{t('orders.tickets', { count: order.items.reduce((sum, item) => sum + item.quantity, 0) })}</span>
								</div>
								<div role="cell" className="org-row__event">
									<span className="org-row__title adm-plain">{eventTitle(order)}</span>
								</div>
								<div role="cell" className="org-row__status">
									<OrderStatusBadge status={order.orderStatus} />
								</div>
								<div role="cell" className="org-num">
									<span className="org-row__label">{t('orders.cols.amount')}</span>
									{money(order.totalAmount, order.currency)}
								</div>
								<div role="cell" className="org-num">
									<span className="org-row__label">{t('orders.cols.commission')}</span>
									{money(order.commissionAmount, order.currency)}
									<span className="org-row__meta adm-block">{t('percent', { value: formatNumber(order.commissionRate, locale) })}</span>
								</div>
								<div role="cell" className="org-row__date">
									<span>{formatViewerDate(order.createdAt, locale, true)}</span>
								</div>
							</div>
						))}
					</div>
					<div className="org-foot">
						<p>
							{t('orders.showing', {
								from: formatNumber((page - 1) * ORDERS_PAGE_SIZE + 1, locale),
								to: formatNumber((page - 1) * ORDERS_PAGE_SIZE + rows.length, locale),
								total: formatNumber(total, locale),
							})}
						</p>
						<Pagination page={Math.min(page, pageCount)} pageCount={pageCount} onChange={(next) => update({ page: next })} />
					</div>
				</>
			)}

			<Drawer anchor="right" open={Boolean(selected)} onClose={() => setSelected(null)} PaperProps={{ className: 'org-drawer', role: 'dialog', 'aria-labelledby': 'ord-drawer-title' } as object}>
				{selected && (
					<>
						<div className="org-drawer__head">
							<div>
								<h2 id="ord-drawer-title" className="adm-mono">
									{selected.orderNumber}
								</h2>
								<OrderStatusBadge status={selected.orderStatus} />
							</div>
							<IconButton onClick={() => setSelected(null)} aria-label={t('orders.drawer.close')}>
								<X size={22} aria-hidden="true" />
							</IconButton>
						</div>
						<div className="org-drawer__body">
							<dl className="org-dl">
								<div>
									<dt>{t('orders.cols.event')}</dt>
									<dd>
										{selected.eventData ? (
											<Link href={`/admin/events/${selected.eventData._id}`} className="tz-link">
												{eventTitle(selected)}
											</Link>
										) : (
											t('orders.eventGone')
										)}
									</dd>
								</div>
								<div>
									<dt>{t('orders.drawer.buyer')}</dt>
									<dd className="adm-mono">{selected.buyerId}</dd>
								</div>
								<div>
									<dt>{t('orders.drawer.placed')}</dt>
									<dd>{formatViewerDate(selected.createdAt, locale, true)}</dd>
								</div>
								{selected.paidAt && (
									<div>
										<dt>{t('orders.drawer.paid')}</dt>
										<dd>{formatViewerDate(selected.paidAt, locale, true)}</dd>
									</div>
								)}
								{selected.refundedAt && (
									<div>
										<dt>{t('orders.drawer.refunded')}</dt>
										<dd>{formatViewerDate(selected.refundedAt, locale, true)}</dd>
									</div>
								)}
							</dl>
							<h3 className="org-drawer__sub">{t('orders.drawer.tickets', { count: selected.items.reduce((sum, item) => sum + item.quantity, 0) })}</h3>
							<ul className="org-lines">
								{selected.items.map((item) => (
									<li key={item.ticketTypeId}>
										<span>{t('orders.drawer.line', { quantity: item.quantity, price: money(item.unitPrice, selected.currency) })}</span>
										<span>{money(item.unitPrice * item.quantity, selected.currency)}</span>
									</li>
								))}
							</ul>
							<h3 className="org-drawer__sub">{t('orders.drawer.money')}</h3>
							<ul className="org-lines org-lines--money">
								<li>
									<span>{t('orders.drawer.buyerPaid')}</span>
									<span>{money(selected.totalAmount, selected.currency)}</span>
								</li>
								<li>
									<span>{t('orders.drawer.commission', { rate: formatNumber(selected.commissionRate, locale) })}</span>
									<span>{money(selected.commissionAmount, selected.currency)}</span>
								</li>
								<li className="is-total">
									<span>{t('orders.drawer.payout')}</span>
									<span>{money(selected.subtotal - selected.commissionAmount, selected.currency)}</span>
								</li>
							</ul>
							{selected.orderStatus === 'REFUNDED' && <p className="adm-muted">{t('orders.drawer.refundNote')}</p>}
							<p className="adm-muted">{t('orders.drawer.readOnly')}</p>
						</div>
					</>
				)}
			</Drawer>
		</div>
	);
};

export default withAdminLayout(AdminOrders);
