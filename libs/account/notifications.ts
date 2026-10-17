import { MemberType } from '../enums/member.enum';
import { eventUrl, ROUTES } from '../routes';
import { NotificationItem } from '../types/account';

/**
 * Titles are English text from the server, so the UI translates them by `notificationType` (keys in account.json,
 * `notifications.type.*`) and falls back to the server's title for a type it does not know. Descriptions are data
 * (an order number, an event title, a comment) and are shown as sent.
 */
export const KNOWN_TYPES = [
	'LIKE',
	'COMMENT',
	'ORDER_PAID',
	'EVENT_REMINDER',
	'ORGANIZER_VERIFIED',
	'ORGANIZER_REJECTED',
	'ORGANIZER_SUSPENDED',
	'ORGANIZER_REINSTATED',
	'COMMISSION_UPDATED',
	'EVENT_APPROVED',
	'EVENT_REJECTED',
	'EVENT_CANCELLED',
	'REFUND_COMPLETED',
	'ORDER_REFUNDED',
	'NEW_MESSAGE',
	'PAYOUT_PAID',
	'PAYOUT_DUE',
] as const;

/**
 * ORDER_PAID goes to the buyer ("Payment received") and to the organizer ("New ticket sale").
 * PAYOUT_DUE goes to the organizer ("Your payout is due") and to every admin ("A payout is due").
 */
export function titleKey(item: Pick<NotificationItem, 'notificationType'>, memberType?: MemberType): string | null {
	if (!(KNOWN_TYPES as readonly string[]).includes(item.notificationType)) return null;
	if (item.notificationType === 'ORDER_PAID' && memberType && memberType !== MemberType.USER) return 'notifications.type.ORDER_PAID_SALE';
	if (item.notificationType === 'PAYOUT_DUE' && memberType === MemberType.ADMIN) return 'notifications.type.PAYOUT_DUE_ADMIN';
	return `notifications.type.${item.notificationType}`;
}

/** Key of the sentence of a notification (`{{sender}} approved your organizer account`), the same type rules as `titleKey`. */
export const sentenceKey = (item: Pick<NotificationItem, 'notificationType'>, memberType?: MemberType): string | null =>
	titleKey(item, memberType)?.replace('notifications.type.', 'notifications.sentence.') ?? null;

/** Who the notification names: an admin is "Admin", anyone else by name; null when the member no longer exists. */
export function senderOf(item: Pick<NotificationItem, 'authorData'>): { admin: boolean; name: string } | null {
	const author = item.authorData;
	if (!author) return null;
	return { admin: author.memberType === MemberType.ADMIN, name: author.memberFullName || author.memberNick || '' };
}

/**
 * The event name a notification carries as text (shown as a small chip), or the plain detail line otherwise. The server puts the
 * event title in the description of some types and a longer sentence in others; only the shapes known from the backend are cut.
 */
export function describeNotification(item: Pick<NotificationItem, 'notificationType' | 'notificationDesc'>): { chip?: string; detail?: string } {
	const desc = item.notificationDesc?.trim();
	if (!desc) return {};
	switch (item.notificationType) {
		case 'LIKE':
		case 'EVENT_REMINDER':
		case 'EVENT_APPROVED':
			return { chip: desc };
		case 'PAYOUT_DUE': {
			const match = desc.match(/^Payout for (.+) is due: .+$/);
			return match ? { chip: match[1] } : { detail: desc };
		}
		case 'PAYOUT_PAID': {
			const cut = desc.lastIndexOf(': ');
			return cut > 0 ? { chip: desc.slice(0, cut), detail: desc.slice(cut + 2) } : { detail: desc };
		}
		default:
			return { detail: desc };
	}
}

/** Where a notification leads. Order and ticket pages are the buyer's own; organizers get event links only. */
export function notificationHref(item: NotificationItem, memberType?: MemberType): string | null {
	const buyer = !memberType || memberType === MemberType.USER;
	switch (item.notificationType) {
		case 'ORDER_PAID':
		case 'REFUND_COMPLETED':
			return buyer && item.orderId ? `/orders/${item.orderId}` : null;
		case 'EVENT_REMINDER':
			return buyer ? '/tickets' : item.eventId ? eventUrl(item.eventId) : null;
		case 'NEW_MESSAGE':
			// only organizers and admins have conversations; the thread opens from the id
			if (!item.conversationId || buyer) return null;
			return `${memberType === MemberType.ADMIN ? '/admin' : '/organizer'}/messages?c=${encodeURIComponent(item.conversationId)}`;
		case 'PAYOUT_PAID':
		case 'PAYOUT_DUE':
			// PAYOUT_PAID goes to the organizer, PAYOUT_DUE to the organizer and the admins; the payouts page lists the event
			return buyer ? null : memberType === MemberType.ADMIN ? '/admin/payouts' : '/organizer/payouts';
		case 'ORGANIZER_VERIFIED':
			return memberType === MemberType.ORGANIZER ? ROUTES.organizerDashboard : null;
		case 'EVENT_CANCELLED':
		case 'LIKE':
		case 'COMMENT':
			return item.eventId ? eventUrl(item.eventId) : null;
		default:
			return null;
	}
}

/** "3 order(s) refunded, 1 failed" is the one description that is a sentence; it is rebuilt in the user's language. */
export function parseRefundSummary(desc?: string | null): { refunded: number; failed: number } | null {
	const match = desc?.match(/^(\d+) order\(s\) refunded, (\d+) failed$/);
	return match ? { refunded: Number(match[1]), failed: Number(match[2]) } : null;
}
