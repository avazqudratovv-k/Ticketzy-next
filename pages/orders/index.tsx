import { useEffect } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Receipt } from 'phosphor-react';
import { GET_MY_ORDERS } from '../../apollo/user/query';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import { withAccount } from '../../libs/components/account/AccountShell';
import PageHead from '../../libs/components/account/PageHead';
import LoadError from '../../libs/components/account/LoadError';
import OrderRow, { OrderRowSkeleton } from '../../libs/components/account/OrderRow';
import Seo from '../../libs/components/common/Seo';
import StateBlock from '../../libs/components/states/StateBlock';
import Pagination from '../../libs/components/events/Pagination';
import useUrlState from '../../libs/hooks/useUrlState';
import { formatNumber } from '../../libs/format';
import { ROUTES } from '../../libs/routes';
import { AccountOrder, OrderStatus } from '../../libs/types/account';
import { useRouter } from 'next/router';
import { GetMyOrdersData, GetMyOrdersVars } from '../../libs/types/queries';

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
	props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'events', 'checkout', 'account'])) },
});

const PAGE_SIZE = 10;
const STATUSES: OrderStatus[] = ['PAID', 'REFUNDED', 'PENDING_PAYMENT', 'FAILED', 'CANCELLED', 'EXPIRED'];
const isStatus = (value: string): value is OrderStatus => (STATUSES as string[]).includes(value);

const Orders: NextPage = () => {
	const { t } = useTranslation('account');
	const { locale } = useRouter();
	const { page, value, ready, update } = useUrlState('status');
	const status = isStatus(value) ? value : undefined;

	const { data, loading, error, refetch } = useQuery<GetMyOrdersData, GetMyOrdersVars>(GET_MY_ORDERS, {
		variables: { input: { page, limit: PAGE_SIZE, sort: 'createdAt', direction: 'DESC', ...(status ? { orderStatus: status } : {}) } },
		skip: !ready,
		fetchPolicy: 'cache-and-network',
	});
	const list: AccountOrder[] = data?.getMyOrders?.list ?? [];
	const total: number = data?.getMyOrders?.metaCounter?.[0]?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const firstLoad = !data && (loading || !ready);

	// A shared link to a page that no longer exists goes to the last one
	useEffect(() => {
		if (data && page > pageCount) update({ page: pageCount });
	}, [data, page, pageCount, update]);

	const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
	const to = Math.min(total, page * PAGE_SIZE);

	return (
		<>
			<Seo title={t('orders.title')} noindex />
			<PageHead
				title={t('orders.title')}
				text={t('orders.sub')}
				actions={
					<label className="acct__filter">
						<span className="tz-sr">{t('orders.filter')}</span>
						<select className="tz-input" value={status ?? ''} onChange={(event) => update({ value: event.target.value })}>
							<option value="">{t('orders.allStatuses')}</option>
							{STATUSES.map((s) => (
								<option key={s} value={s}>
									{t(`order.status.${s}`)}
								</option>
							))}
						</select>
					</label>
				}
			/>
			{error && !data ? (
				<LoadError error={error} onRetry={() => refetch()} notFoundTitle={t('state.loadError')} notFoundText={t('state.network')} />
			) : firstLoad ? (
				<ul className="orows" aria-busy="true">
					<OrderRowSkeleton />
					<OrderRowSkeleton />
					<OrderRowSkeleton />
				</ul>
			) : list.length === 0 ? (
				<StateBlock
					icon={<Receipt size={28} />}
					title={status ? t('orders.emptyFiltered') : t('orders.emptyTitle')}
					text={status ? t('orders.emptyFilteredText') : t('orders.emptyText')}
					actions={
						status ? (
							<Button variant="outlined" onClick={() => update({ value: '' })}>
								{t('orders.clearFilter')}
							</Button>
						) : (
							<Button component={Link} href={ROUTES.events} variant="contained">
								{t('orders.browse')}
							</Button>
						)
					}
				/>
			) : (
				<>
					<ul className="orows">
						{list.map((order) => (
							<OrderRow key={order._id} order={order} />
						))}
					</ul>
					<div className="acct__pager">
						<p className="acct__range" aria-live="polite">
							{t('orders.showing', { from: formatNumber(from, locale), to: formatNumber(to, locale), total: formatNumber(total, locale) })}
						</p>
						<Pagination page={page} pageCount={pageCount} onChange={(next) => update({ page: next })} />
					</div>
				</>
			)}
		</>
	);
};

export default withLayoutBasic(withAccount(Orders));
