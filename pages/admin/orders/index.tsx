import { useEffect, useMemo, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button, Drawer, IconButton } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { MagnifyingGlass, Receipt, WarningCircle, X } from 'phosphor-react';
import withAdminLayout from '../../../libs/components/layout/LayoutAdmin';
import StateBlock from '../../../libs/components/states/StateBlock';
import Pagination from '../../../libs/components/events/Pagination';
import OrderStatusBadge from '../../../libs/components/organizer/orders/OrderStatusBadge';
import useListParams from '../../../libs/admin/useListParams';
import { isOrderSortKey, isOrderTab, ORDER_SORTS, ORDER_TABS, OrderSortKey, orderCountKey, OrderTab, orderTabStatus, ORDERS_PAGE_SIZE } from '../../../libs/admin/orders';
import { describeAdminError, isOnlyNoData } from '../../../libs/admin/errors';
import { AdminOrder } from '../../../libs/admin/types';
import { GET_ADMIN_ORDER_COUNTS, GET_ADMIN_ORDER_EVENTS, GET_ADMIN_ORDERS } from '../../../apollo/admin/query';
import { localizedEvent } from '../../../libs/events';
import { dayBoundaryIso, formatNumber, formatPrice, formatViewerDate } from '../../../libs/format';
import ScrollFade from '../../../libs/components/common/ScrollFade';
import { NETWORK_ERROR, parseApiError } from '../../../libs/errors';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common', 'admin', 'organizer', 'events'])),
	},
});

const DEFAULTS = { tab: 'all', sort: 'newest', event: '', q: '', from: '', to: '' };
const isDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
const isObjectId = (value: string) => /^[a-f\d]{24}$/i.test(value);

/** Filters of `getAllOrdersByAdmin`: status (tabs), event, buyer text (nick, full name, email) and a createdAt range (Seoul days). All live in the URL. */
const AdminOrders: NextPage = () => {
	const { t } = useTranslation('admin');
	const { t: to } = useTranslation('organizer');
	const { locale } = useRouter();
	const { values, page, update, ready } = useListParams(DEFAULTS, { tab: isOrderTab, sort: isOrderSortKey, event: isObjectId, from: isDay, to: isDay });
	const tab = values.tab as OrderTab;
	const sortKey = values.sort as OrderSortKey;
	const [selected, setSelected] = useState<AdminOrder | null>(null);

	const [search, setSearch] = useState(values.q);
	useEffect(() => setSearch(values.q), [values.q]);
	useEffect(() => {
		if (search === values.q) return undefined;
		const id = window.setTimeout(() => update({ q: search }, 'replace'), 300);
		return () => window.clearTimeout(id);
	}, [search, values.q, update]);

	const text = values.q.trim();
	const rangeInvalid = Boolean(values.from && values.to && values.from > values.to);
	// an inverted range is refused by the backend, so it is caught here and nothing is requested
	const filter = {
		eventId: values.event || null,
		text: text || null,
		dateFrom: values.from && !rangeInvalid ? dayBoundaryIso(values.from, false) : null,
		dateTo: values.to && !rangeInvalid ? dayBoundaryIso(values.to, true) : null,
	};
	const filtered = Boolean(values.event || text || values.from || values.to);

	const { data: eventData } = useQuery(GET_ADMIN_ORDER_EVENTS, { skip: !ready, errorPolicy: 'all' });
	const eventOptions: { _id: string; title: string }[] = useMemo(
		() =>
			(eventData?.getEventsByAdmin?.list ?? []).map((event: any) => ({
				_id: event._id,
				title: localizedEvent({ eventTitle: event.eventTitle, eventDesc: null, eventTranslations: event.eventTranslations ?? [] }, locale).title,
			})),
		[eventData, locale],
	);

	const { data: countData } = useQuery(GET_ADMIN_ORDER_COUNTS, { variables: filter, skip: !ready || rangeInvalid, errorPolicy: 'all', fetchPolicy: 'cache-and-network' });
	const status = orderTabStatus(tab);
	const sort = ORDER_SORTS[sortKey];
	const { data, loading, error, refetch } = useQuery(GET_ADMIN_ORDERS, {
		variables: { input: { page, limit: ORDERS_PAGE_SIZE, sort: sort.sort, direction: sort.direction, ...(status ? { orderStatus: status } : {}), ...(values.event ? { eventId: values.event } : {}), ...(text ? { text } : {}), ...(filter.dateFrom ? { dateFrom: filter.dateFrom } : {}), ...(filter.dateTo ? { dateTo: filter.dateTo } : {}) } },
		skip: !ready || rangeInvalid,
		fetchPolicy: 'cache-and-network',
	});

	const rows: AdminOrder[] = useMemo(() => data?.getAllOrdersByAdmin?.list ?? [], [data]);
	const total: number = data?.getAllOrdersByAdmin?.metaCounter?.[0]?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE));
	const count = (key: OrderTab) => countData?.[orderCountKey(key)]?.metaCounter?.[0]?.total ?? 0;
	const failed = !rangeInvalid && Boolean(error) && !isOnlyNoData(error) && !data?.getAllOrdersByAdmin;
	const serverError = error ? describeAdminError(error) : null;
	const networkError = error ? parseApiError(error).code === NETWORK_ERROR : false;
	const firstLoad = !rangeInvalid && (!ready || (loading && !data && !error));
	const empty = !rangeInvalid && !firstLoad && !failed && rows.length === 0;
	const clearAll = () => update({ tab: 'all', event: '', q: '', from: '', to: '' });
	const money = (amount: number, currency?: string | null) => formatPrice(amount, locale, currency || 'KRW');
	const eventTitle = (order: AdminOrder) =>
		order.eventData
			? localizedEvent({ eventTitle: order.eventData.eventTitle, eventDesc: null, eventTranslations: order.eventData.eventTranslations ?? [] }, locale).title
			: order.eventTitle || t('orders.eventGone');

	const buyerName = (order: AdminOrder) => order.buyerNick || order.buyerEmail || t('orders.buyerGone');

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

			<ScrollFade className="org-tabs" activeKey={tab} role="tablist" aria-label={t('orders.tabsLabel')}>
				{ORDER_TABS.map((key) => (
					<button key={key} type="button" role="tab" aria-selected={tab === key} className="org-tab" onClick={() => update({ tab: key })}>
						{key === 'all' ? t('orders.tabs.all') : to(`orders.status.${key.toUpperCase()}`)}
						<span className="org-tab__count">{formatNumber(count(key), locale)}</span>
					</button>
				))}
			</ScrollFade>

			<div className="org-toolbar">
				<label className="org-search">
					<MagnifyingGlass size={20} aria-hidden="true" />
					<span className="org-visually-hidden">{t('orders.search')}</span>
					<input type="search" className="tz-input" value={search} placeholder={t('orders.searchPlaceholder')} maxLength={100} onChange={(event) => setSearch(event.target.value)} />
				</label>
				<label className="org-select">
					<span className="org-visually-hidden">{t('orders.eventFilter')}</span>
					<select className="tz-input" value={values.event} onChange={(event) => update({ event: event.target.value })}>
						<option value="">{t('orders.allEvents')}</option>
						{values.event && !eventOptions.some((option) => option._id === values.event) && <option value={values.event}>{t('orders.eventGone')}</option>}
						{eventOptions.map((option) => (
							<option key={option._id} value={option._id}>
								{option.title}
							</option>
						))}
					</select>
				</label>
				<label className="org-select adm-date">
					<span className="org-visually-hidden">{t('orders.dateFrom')}</span>
					<span aria-hidden="true" className="adm-muted">{t('orders.from')}</span>
					<input type="date" className="tz-input" value={values.from} max={values.to || undefined} onChange={(event) => update({ from: event.target.value })} />
				</label>
				<label className="org-select adm-date">
					<span className="org-visually-hidden">{t('orders.dateTo')}</span>
					<span aria-hidden="true" className="adm-muted">{t('orders.to')}</span>
					<input type="date" className="tz-input" value={values.to} min={values.from || undefined} onChange={(event) => update({ to: event.target.value })} />
				</label>
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

			{filtered && (
				<p className="adm-muted">
					<button type="button" className="tz-link org-linkbtn" onClick={clearAll}>
						{t('orders.clearFilters')}
					</button>
				</p>
			)}

			{rangeInvalid ? (
				<p className="tz-alert tz-alert--error" role="alert">
					<WarningCircle size={20} aria-hidden="true" />
					<span>{t('serverErrors.dateRange')}</span>
				</p>
			) : failed ? (
				<StateBlock
					alert
					icon={<WarningCircle size={28} />}
					title={t('orders.error.title')}
					text={networkError ? t('errors.network') : serverError?.key ? t(`serverErrors.${serverError.key}`) : t('orders.error.text')}
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
					title={tab === 'all' && !filtered ? t('orders.empty.title') : t('orders.none.title')}
					text={tab === 'all' && !filtered ? t('orders.empty.text') : t('orders.none.text')}
					actions={
						tab !== 'all' || filtered ? (
							<Button variant="outlined" onClick={clearAll}>
								{filtered ? t('orders.clearFilters') : t('orders.none.clear')}
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
							<span role="columnheader">{t('orders.cols.buyer')}</span>
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
								<div role="cell" className="org-row__event">
									<span className="org-row__label">{t('orders.cols.buyer')}</span>
									<span className="org-row__title adm-plain">{buyerName(order)}</span>
									{order.buyerNick && order.buyerEmail && <span className="org-row__meta">{order.buyerEmail}</span>}
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
									<dd>
										{buyerName(selected)}
										{selected.buyerNick && selected.buyerEmail && <span className="org-row__meta adm-block">{selected.buyerEmail}</span>}
									</dd>
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
