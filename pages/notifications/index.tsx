import { useEffect } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Bell } from 'phosphor-react';
import { GET_MY_NOTIFICATIONS } from '../../apollo/user/query';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import { withAccount } from '../../libs/components/account/AccountShell';
import PageHead from '../../libs/components/account/PageHead';
import LoadError from '../../libs/components/account/LoadError';
import NotificationRow from '../../libs/components/notifications/NotificationRow';
import Seo from '../../libs/components/common/Seo';
import StateBlock from '../../libs/components/states/StateBlock';
import Pagination from '../../libs/components/events/Pagination';
import useAuth from '../../libs/hooks/useAuth';
import useUnreadCount from '../../libs/hooks/useUnreadCount';
import useNotificationActions from '../../libs/hooks/useNotificationActions';
import useUrlState from '../../libs/hooks/useUrlState';
import { formatNumber } from '../../libs/format';
import { NotificationItem } from '../../libs/types/account';

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
	props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'events', 'checkout', 'account'])) },
});

const PAGE_SIZE = 20;

const Notifications: NextPage = () => {
	const { t } = useTranslation('common');
	const { t: ta } = useTranslation('account');
	const { locale } = useRouter();
	const { user } = useAuth();
	const { page, value, ready, update } = useUrlState('filter');
	const unreadOnly = value === 'unread';
	const unread = useUnreadCount(false);
	const { markRead, markAllRead, markingAll } = useNotificationActions();

	const { data, loading, error, refetch } = useQuery(GET_MY_NOTIFICATIONS, {
		variables: { input: { page, limit: PAGE_SIZE, ...(unreadOnly ? { unreadOnly: true } : {}) } },
		skip: !ready,
		fetchPolicy: 'cache-and-network',
	});
	const list: NotificationItem[] = data?.getMyNotifications?.list ?? [];
	const total: number = data?.getMyNotifications?.metaCounter?.[0]?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const firstLoad = !data && (loading || !ready);

	useEffect(() => {
		if (data && page > pageCount) update({ page: pageCount });
	}, [data, page, pageCount, update]);

	return (
		<>
			<Seo title={t('notifications.title')} noindex />
			<PageHead
				title={t('notifications.title')}
				text={unread > 0 ? t('notifications.unreadCount', { count: unread, formatted: formatNumber(unread, locale) }) : t('notifications.allRead')}
				actions={
					<Button variant="outlined" onClick={markAllRead} disabled={unread === 0 || markingAll}>
						{t('notifications.markAll')}
					</Button>
				}
			/>
			<div className="acct__tabs" role="tablist" aria-label={ta('notifications.filter')}>
				{(['', 'unread'] as const).map((id) => (
					<button key={id || 'all'} type="button" role="tab" aria-selected={value === id || (id === '' && !unreadOnly)} className="acct__tab" onClick={() => update({ value: id })}>
						{t(id ? 'notifications.filterUnread' : 'notifications.filterAll')}
					</button>
				))}
			</div>
			{error && !data ? (
				<LoadError error={error} onRetry={() => refetch()} notFoundTitle={ta('state.loadError')} notFoundText={ta('state.network')} />
			) : firstLoad ? (
				<div className="notif-card" aria-busy="true">
					<span className="tz-skel tz-skel--block" />
					<span className="tz-skel tz-skel--block" />
					<span className="tz-skel tz-skel--block" />
				</div>
			) : list.length === 0 ? (
				<StateBlock
					icon={<Bell size={28} />}
					title={unreadOnly ? t('notifications.emptyUnread') : t('notifications.emptyTitle')}
					text={unreadOnly ? t('notifications.emptyUnreadText') : t('notifications.emptyText')}
				/>
			) : (
				<>
					<ul className="notif-list notif-card">
						{list.map((item) => (
							<NotificationRow key={item._id} item={item} memberType={user?.memberType} onOpen={(n) => markRead(n._id)} />
						))}
					</ul>
					<Pagination page={page} pageCount={pageCount} onChange={(next) => update({ page: next })} />
				</>
			)}
		</>
	);
};

export default withLayoutBasic(withAccount(Notifications));
