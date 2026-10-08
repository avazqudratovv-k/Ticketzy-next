import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { Popover } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { Bell } from 'phosphor-react';
import { GET_MY_NOTIFICATIONS } from '../../../apollo/user/query';
import { MemberProfile } from '../../types/member';
import { NotificationItem } from '../../types/account';
import { ROUTES } from '../../routes';
import useUnreadCount from '../../hooks/useUnreadCount';
import useNotificationActions from '../../hooks/useNotificationActions';
import NotificationRow from './NotificationRow';

const LATEST = 6;

/** Header bell: unread count badge (polled every 30 s while the tab is visible) and a dropdown with the latest items (design: BellBuyer). */
const NotificationBell = ({ user }: { user: MemberProfile }) => {
	const { t } = useTranslation('common');
	const [anchor, setAnchor] = useState<HTMLElement | null>(null);
	const unread = useUnreadCount();
	const open = Boolean(anchor);
	const { data, loading, error, refetch } = useQuery(GET_MY_NOTIFICATIONS, {
		variables: { input: { page: 1, limit: LATEST } },
		skip: !open,
		fetchPolicy: 'cache-and-network',
	});
	const { markRead, markAllRead, markingAll } = useNotificationActions();
	const list: NotificationItem[] = data?.getMyNotifications?.list ?? [];
	const close = () => setAnchor(null);

	return (
		<>
			<button
				type="button"
				className="tz-bell"
				aria-label={unread > 0 ? t('bell.labelUnread', { count: unread }) : t('bell.label')}
				aria-haspopup="dialog"
				aria-expanded={open}
				onClick={(event) => setAnchor(event.currentTarget)}
			>
				<Bell size={22} aria-hidden="true" />
				{unread > 0 && (
					<span className="tz-bell__badge" aria-hidden="true">
						{unread > 99 ? '99+' : unread}
					</span>
				)}
			</button>
			<Popover
				open={open}
				anchorEl={anchor}
				onClose={close}
				anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
				transformOrigin={{ vertical: 'top', horizontal: 'right' }}
				slotProps={{ paper: { className: 'bell', role: 'dialog', 'aria-label': t('bell.title') } as never }}
			>
				<div className="bell__head">
					<h2 className="bell__title">{t('bell.title')}</h2>
					<button type="button" className="bell__markall" onClick={markAllRead} disabled={unread === 0 || markingAll}>
						{t('notifications.markAll')}
					</button>
				</div>
				<div className="bell__body" aria-busy={loading && list.length === 0}>
					{loading && list.length === 0 && (
						<div className="bell__skeleton" aria-hidden="true">
							<span className="tz-skel" />
							<span className="tz-skel" />
							<span className="tz-skel" />
						</div>
					)}
					{error && list.length === 0 && (
						<p className="bell__empty" role="alert">
							{t('notifications.loadError')}{' '}
							<button type="button" className="tz-link" onClick={() => refetch()}>
								{t('notifications.retry')}
							</button>
						</p>
					)}
					{!loading && !error && list.length === 0 && <p className="bell__empty">{t('notifications.emptyShort')}</p>}
					{list.length > 0 && (
						<ul className="notif-list">
							{list.map((item) => (
								<NotificationRow key={item._id} item={item} memberType={user.memberType} onOpen={(n) => markRead(n._id)} onNavigate={close} />
							))}
						</ul>
					)}
				</div>
				<div className="bell__foot">
					<Link href={ROUTES.notifications} className="tz-link" onClick={close}>
						{t('bell.seeAll')}
					</Link>
				</div>
			</Popover>
		</>
	);
};

export default NotificationBell;
