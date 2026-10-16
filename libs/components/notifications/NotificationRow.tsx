import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { Bell, CalendarBlank, ChatCircle, Clock, Heart, Megaphone, Money, Receipt, ShieldCheck, Ticket, Warning } from 'phosphor-react';
import { MemberType } from '../../enums/member.enum';
import { daysAgo, formatEventTime, formatViewerDate } from '../../format';
import { notificationHref, parseRefundSummary, titleKey } from '../../account/notifications';
import { NotificationItem, NotificationType } from '../../types/account';

const ICONS: Partial<Record<NotificationType, typeof Bell>> = {
	LIKE: Heart,
	COMMENT: ChatCircle,
	NEW_MESSAGE: ChatCircle,
	ORDER_PAID: Ticket,
	REFUND_COMPLETED: Receipt,
	ORDER_REFUNDED: Receipt,
	EVENT_REMINDER: CalendarBlank,
	EVENT_CANCELLED: Warning,
	EVENT_REJECTED: Warning,
	ORGANIZER_REJECTED: Warning,
	ORGANIZER_SUSPENDED: Warning,
	ORGANIZER_VERIFIED: ShieldCheck,
	ORGANIZER_REINSTATED: ShieldCheck,
	EVENT_APPROVED: ShieldCheck,
	COMMISSION_UPDATED: Megaphone,
	PAYOUT_PAID: Money,
	PAYOUT_DUE: Clock,
};

interface Props {
	item: NotificationItem;
	memberType?: MemberType;
	onOpen: (item: NotificationItem) => void;
	/** Called after the row was opened, e.g. to close the dropdown */
	onNavigate?: () => void;
}

/** "Today, 14:32", "Yesterday, 10:05", then a full date; in the viewer's time zone and language. */
function useWhen(iso: string) {
	const { t } = useTranslation('common');
	const { locale } = useRouter();
	const days = daysAgo(iso);
	if (days === 0) return t('notifications.today', { time: formatEventTime(iso, locale, Intl.DateTimeFormat().resolvedOptions().timeZone) });
	if (days === 1) return t('notifications.yesterday', { time: formatEventTime(iso, locale, Intl.DateTimeFormat().resolvedOptions().timeZone) });
	return formatViewerDate(iso, locale);
}

/** One notification (bell dropdown and full page). The title is translated by type, the description is data. */
const NotificationRow = ({ item, memberType, onOpen, onNavigate }: Props) => {
	const { t } = useTranslation('common');
	const unread = item.notificationStatus === 'WAIT';
	const key = titleKey(item, memberType);
	const title = key ? t(key) : item.notificationTitle;
	const summary = parseRefundSummary(item.notificationDesc);
	const desc = summary
		? t('notifications.refundSummary', { refunded: summary.refunded, failed: summary.failed })
		: item.notificationDesc;
	const href = notificationHref(item, memberType);
	const when = useWhen(item.createdAt);
	const Icon = ICONS[item.notificationType] ?? Bell;

	const body = (
		<>
			<span className="notif__icon" aria-hidden="true">
				<Icon size={20} />
			</span>
			<span className="notif__text">
				<span className="notif__title">{title}</span>
				{desc && <span className="notif__desc">{desc}</span>}
				<span className="notif__when">{when}</span>
			</span>
			{unread && (
				<>
					<span className="notif__dot" aria-hidden="true" />
					<span className="tz-sr">{t('notifications.unread')}</span>
				</>
			)}
		</>
	);

	const handle = () => {
		if (unread) onOpen(item);
		onNavigate?.();
	};

	return (
		<li className={`notif${unread ? ' is-unread' : ''}`}>
			{href ? (
				<Link href={href} className="notif__main" onClick={handle}>
					{body}
				</Link>
			) : (
				<button type="button" className="notif__main" onClick={handle} aria-disabled={!unread}>
					{body}
				</button>
			)}
		</li>
	);
};

export default NotificationRow;
