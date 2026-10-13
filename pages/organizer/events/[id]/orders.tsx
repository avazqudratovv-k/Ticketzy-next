import { useEffect, useMemo, useState } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ArrowLeft, Prohibit, Receipt, WarningCircle } from 'phosphor-react';
import { withOrganizerLayout } from '../../../../libs/components/layout/LayoutAdmin';
import BlockedPanel from '../../../../libs/components/organizer/BlockedPanel';
import OrderDrawer from '../../../../libs/components/organizer/orders/OrderDrawer';
import OrderStatusBadge from '../../../../libs/components/organizer/orders/OrderStatusBadge';
import Pagination from '../../../../libs/components/events/Pagination';
import StateBlock from '../../../../libs/components/states/StateBlock';
import useAuth from '../../../../libs/hooks/useAuth';
import { GET_EVENT_TICKET_TYPES, GET_MY_EVENT, GET_VENUE_DETAIL } from '../../../../apollo/organizer/query';
import { GET_MY_EVENT_ORDERS, GET_MY_ORDER_COUNTS } from '../../../../apollo/organizer/orders';
import { groupSeats, isOrderSortKey, isOrderStatus, ORDER_SORTS, ORDER_STATUSES, ORDERS_PAGE_SIZE, OrderSortKey, OrderStatusKey, OrgOrder } from '../../../../libs/organizer/orders';
import { OrgEvent } from '../../../../libs/organizer/types';
import { localizedEvent } from '../../../../libs/events';
import { formatNumber, formatPrice, formatViewerDate } from '../../../../libs/format';
import ScrollFade from '../../../../libs/components/common/ScrollFade';
import { NETWORK_ERROR, parseApiError } from '../../../../libs/errors';
import { organizerEventEditUrl, organizerEventsUrl } from '../../../../libs/routes';

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
	props: {
		...(await serverSideTranslations(locale as string, ['common', 'organizer', 'events'])),
	},
});

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';

const EventOrders: NextPage = () => {
	const { t } = useTranslation('organizer');
	const router = useRouter();
	const { locale } = router;
	const { user, organizerAccess } = useAuth();
	const eventId = first(router.query.id);
	const blocked = organizerAccess !== null && organizerAccess !== 'active';
	const skip = !router.isReady || !eventId || blocked;
	const [selected, setSelected] = useState<OrgOrder | null>(null);

	const statusParam = first(router.query.status).toUpperCase();
	const status: OrderStatusKey | '' = isOrderStatus(statusParam) ? statusParam : '';
	const sortParam = first(router.query.sort);
	const sortKey: OrderSortKey = isOrderSortKey(sortParam) ? sortParam : 'newest';
	const pageParam = parseInt(first(router.query.page), 10);
	const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

	const update = (patch: { status?: string; sort?: string; page?: number }) => {
		const next = { status: status.toLowerCase(), sort: sortKey, page, ...patch };
		if (!('page' in patch)) next.page = 1;
		const query: Record<string, string> = {};
		if (next.status) query.status = next.status.toLowerCase();
		if (next.sort !== 'newest') query.sort = next.sort;
		if (next.page > 1) query.page = String(next.page);
		void router.push({ pathname: router.pathname, query: { id: eventId, ...query } }, undefined, { shallow: true, scroll: false });
	};

	const { data: eventData, error: eventError } = useQuery(GET_MY_EVENT, { variables: { eventId }, skip, fetchPolicy: 'cache-and-network' });
	const event: OrgEvent | undefined = eventData?.getEvent;
	const mine = Boolean(event && user && event.organizerId === user._id);
	const ready = !skip && mine;

	const { data: typeData } = useQuery(GET_EVENT_TICKET_TYPES, { variables: { eventId }, skip: !ready, errorPolicy: 'all' });
	const { data: venueData } = useQuery(GET_VENUE_DETAIL, { variables: { venueId: event?.venueId }, skip: !ready || !event?.venueId, errorPolicy: 'all' });
	const { data: countData } = useQuery(GET_MY_ORDER_COUNTS, { variables: { eventId }, skip: !ready, fetchPolicy: 'cache-and-network' });
	const sort = ORDER_SORTS[sortKey];
	const { data, loading, error, refetch } = useQuery(GET_MY_EVENT_ORDERS, {
		variables: { input: { page, limit: ORDERS_PAGE_SIZE, sort: sort.sort, direction: sort.direction, eventId, ...(status ? { orderStatus: status } : {}) } },
		skip: !ready,
		fetchPolicy: 'cache-and-network',
	});

	const list: OrgOrder[] = useMemo(() => data?.getMyEventOrders?.list ?? [], [data]);
	const total: number = data?.getMyEventOrders?.metaCounter?.[0]?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE));
	const count = (key: OrderStatusKey | '') => countData?.[key || 'ALL']?.metaCounter?.[0]?.total ?? 0;

	useEffect(() => {
		if (data && page > pageCount) update({ page: pageCount });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data, page, pageCount]);

	const typeNames = useMemo(() => new Map<string, string>(((typeData?.getTicketTypes ?? []) as { _id: string; ticketTypeName: string }[]).map((tt) => [tt._id, tt.ticketTypeName])), [typeData]);
	const sections = useMemo(
		() => new Map<string, string>(((venueData?.getVenue?.venueLayout?.sections ?? []) as { key: string; name: string }[]).map((s) => [s.key, s.name])),
		[venueData],
	);
	const typeName = (id: string) => typeNames.get(id) ?? String(t('orders.unknownType'));
	const sectionName = (key: string) => sections.get(key) ?? key;
	const title = event ? localizedEvent(event, locale).title : '';
	const heading = t('orders.title');

	if (organizerAccess && blocked) return <BlockedPanel access={organizerAccess} action="events" />;

	const networkError = (error ?? eventError) ? parseApiError(error ?? eventError).code === NETWORK_ERROR : false;
	if (eventError && !event) {
		return (
			<StateBlock
				alert={networkError}
				icon={networkError ? <WarningCircle size={28} /> : <Prohibit size={28} />}
				title={networkError ? t('orders.error.title') : t('edit.notFound.title')}
				text={networkError ? t('errors.network') : t('edit.notFound.text')}
				actions={
					<Button component={Link} href={organizerEventsUrl} variant="outlined">
						{t('form.backToList')}
					</Button>
				}
			/>
		);
	}
	if (event && user && !mine) {
		return (
			<StateBlock
				icon={<Prohibit size={28} />}
				title={t('edit.notFound.title')}
				text={t('edit.notFound.text')}
				actions={
					<Button component={Link} href={organizerEventsUrl} variant="outlined">
						{t('form.backToList')}
					</Button>
				}
			/>
		);
	}

	const firstLoad = !data && !error;
	const noOrdersAtAll = !firstLoad && count('') === 0 && !error;
	const money = (order: OrgOrder, amount: number) => formatPrice(amount, locale, order.currency ?? 'KRW');
	const seatText = (order: OrgOrder) => {
		const groups = groupSeats(order.seats, sectionName);
		if (groups.length === 0) return '';
		const places = groups.flatMap((g) => g.places.map((p) => ({ section: g.section, ...p })));
		const shown = places.slice(0, 2).map((p) => t('orders.seatShort', { section: p.section, row: p.row, seats: p.numbers.join(', ') }));
		return places.length > 2 ? `${shown.join(' · ')} ${t('orders.more', { count: places.length - 2 })}` : shown.join(' · ');
	};

	return (
		<div className="org-page">
			<Head>
				<title>{`${heading} · Ticketzy`}</title>
			</Head>
			<div className="tz-pagehead org-pagehead">
				<div>
					<Link href={organizerEventsUrl} className="tz-link org-back">
						<ArrowLeft size={16} aria-hidden="true" /> {t('orders.back')}
					</Link>
					<h1>{heading}</h1>
					<p>{title ? t('orders.subtitle', { title }) : ' '}</p>
				</div>
				{event && (
					<Button component={Link} href={organizerEventEditUrl(event._id)} variant="outlined">
						{t('orders.openEvent')}
					</Button>
				)}
			</div>

			<ScrollFade className="org-tabs" activeKey={status} role="tablist" aria-label={t('orders.tabsLabel')}>
				{(['', ...ORDER_STATUSES] as (OrderStatusKey | '')[]).map((tab) => (
					<button key={tab || 'all'} type="button" role="tab" aria-selected={status === tab} className="org-tab" onClick={() => update({ status: tab })}>
						{tab ? t(`orders.status.${tab}`) : t('list.all')}
						<span className="org-tab__count">{formatNumber(count(tab), locale)}</span>
					</button>
				))}
			</ScrollFade>

			<div className="org-toolbar">
				<label className="org-select">
					<span className="org-visually-hidden">{t('list.sort')}</span>
					<select className="tz-input" value={sortKey} onChange={(e) => update({ sort: e.target.value })}>
						{(Object.keys(ORDER_SORTS) as OrderSortKey[]).map((key) => (
							<option key={key} value={key}>
								{t(`orders.sorts.${key}`)}
							</option>
						))}
					</select>
				</label>
			</div>

			{error && !data ? (
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
			) : firstLoad || (loading && !data) ? (
				<ul className="org-rows" aria-busy="true" aria-label={t('orders.loading')}>
					{[0, 1, 2, 3].map((n) => (
						<li key={n} className="org-row">
							<span className="tz-skel tz-skel--block" />
						</li>
					))}
				</ul>
			) : noOrdersAtAll ? (
				<StateBlock icon={<Receipt size={28} />} title={t('orders.empty.title')} text={t('orders.empty.text')} />
			) : list.length === 0 ? (
				<StateBlock
					icon={<Receipt size={28} />}
					title={t('orders.none.title')}
					text={t('orders.none.text')}
					actions={
						<Button variant="outlined" onClick={() => update({ status: '' })}>
							{t('orders.none.clear')}
						</Button>
					}
				/>
			) : (
				<>
					<div className="org-table org-table--orders" role="table" aria-label={heading}>
						<div className="org-row org-row--head" role="row">
							<span role="columnheader">{t('orders.cols.buyer')}</span>
							<span role="columnheader">{t('orders.cols.tickets')}</span>
							<span role="columnheader" className="org-num">
								{t('orders.cols.amount')}
							</span>
							<span role="columnheader" className="org-num">
								{t('orders.cols.commission')}
							</span>
							<span role="columnheader">{t('orders.cols.status')}</span>
							<span role="columnheader">{t('orders.cols.date')}</span>
						</div>
						{list.map((order) => (
							<div className="org-row org-row--click" role="row" key={order._id}>
								<div role="cell" className="org-row__event">
									<button type="button" className="org-row__title org-linkbtn" onClick={() => setSelected(order)} aria-haspopup="dialog">
										{order.buyerNick || t('orders.unknownBuyer')}
									</button>
									<span className="org-row__meta org-mono">{order.orderNumber}</span>
								</div>
								<div role="cell" className="org-row__event">
									<span>{order.items.map((item) => `${item.quantity} × ${typeName(item.ticketTypeId)}`).join(', ')}</span>
									{seatText(order) && <span className="org-row__meta">{seatText(order)}</span>}
								</div>
								<div role="cell" className="org-num">
									<span className="org-row__label">{t('orders.cols.amount')}</span>
									{money(order, order.totalAmount)}
								</div>
								<div role="cell" className="org-num">
									<span className="org-row__label">{t('orders.cols.commission')}</span>
									{money(order, order.commissionAmount)}
								</div>
								<div role="cell">
									<OrderStatusBadge status={order.orderStatus} />
								</div>
								<div role="cell" className="org-row__meta">
									{formatViewerDate(order.createdAt, locale, true)}
								</div>
							</div>
						))}
					</div>
					<div className="org-foot">
						<p>
							{t('list.showing', {
								from: formatNumber((page - 1) * ORDERS_PAGE_SIZE + 1, locale),
								to: formatNumber((page - 1) * ORDERS_PAGE_SIZE + list.length, locale),
								total: formatNumber(total, locale),
							})}
						</p>
						<Pagination page={page} pageCount={pageCount} onChange={(next) => update({ page: next })} />
					</div>
				</>
			)}
			<OrderDrawer order={selected} onClose={() => setSelected(null)} typeName={typeName} sectionName={sectionName} />
		</div>
	);
};

export default withOrganizerLayout(EventOrders);
