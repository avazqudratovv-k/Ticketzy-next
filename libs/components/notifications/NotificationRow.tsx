import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { Bell, CalendarBlank, ChatCircle, Clock, Heart, Megaphone, Money, Receipt, ShieldCheck, Ticket, Warning } from 'phosphor-react';
import { MemberType } from '../../enums/member.enum';
import { daysAgo, formatEventTime, formatViewerDate } from '../../format';
import { describeNotification, notificationHref, parseRefundSummary, senderOf, sentenceKey, titleKey } from '../../account/notifications';
import { NotificationItem, NotificationType } from '../../types/account';
import OrganizerAvatar from '../common/OrganizerAvatar';

/** Stands where the sender goes in a translated sentence, so the name can be set in bold wherever the language puts it. */
const SENDER_MARK = '\u2063';

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

/**
 * One notification (bell dropdown and full page): a sentence that starts with who did it, in bold ("Admin approved your organizer account"),
 * the event name as a small chip, the time below. The sentence is translated by type; names, event titles and previews are data (F358).
 */
const NotificationRow = ({ item, memberType, onOpen, onNavigate }: Props) => {
	const { t } = useTranslation('common');
	const unread = item.notificationStatus === 'WAIT';
	const sentence = sentenceKey(item, memberType);
	const title = titleKey(item, memberType);
	const sender = senderOf(item);
	const senderName = !sender ? t('notifications.sender.someone') : sender.admin ? t('notifications.sender.admin') : sender.name || t('notifications.sender.someone');
	const summary = parseRefundSummary(item.notificationDesc);
	const { chip, detail } = summary ? { chip: undefined, detail: t('notifications.refundSummary', { refunded: summary.refunded, failed: summary.failed }) } : describeNotification(item);
	const href = notificationHref(item, memberType);
	const when = useWhen(item.createdAt);
	const Icon = ICONS[item.notificationType] ?? Bell;
	// A person (buyer, commenter, message sender) shows their photo; an admin or the system shows the type icon
	const person = sender && !sender.admin ? item.authorData : null;

	const text = sentence ? t(sentence, { sender: SENDER_MARK }) : title ? t(title) : item.notificationTitle;
	const parts = text.split(SENDER_MARK);

	const body = (
		<>
			{person ? (
				<span className="notif__avatar" aria-hidden="true">
					<OrganizerAvatar member={person} size={40} />
					<span className="notif__badge">
						<Icon size={12} weight="fill" />
					</span>
				</span>
			) : (
				<span className="notif__icon" aria-hidden="true">
					<Icon size={20} />
				</span>
			)}
			<span className="notif__text">
				<span className="notif__sentence">
					{parts.map((part, index) => (
						<span key={index}>
							{index > 0 && <strong className="notif__sender">{senderName}</strong>}
							{part}
						</span>
					))}
				</span>
				{chip && <span className="notif__chip">{chip}</span>}
				{detail && <span className="notif__desc">{detail}</span>}
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
