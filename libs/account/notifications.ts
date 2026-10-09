import { MemberType } from '../enums/member.enum';
import { eventUrl } from '../routes';
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
] as const;

/** ORDER_PAID goes to the buyer ("Payment received") and to the organizer ("New ticket sale"). */
export function titleKey(item: Pick<NotificationItem, 'notificationType'>, memberType?: MemberType): string | null {
	if (!(KNOWN_TYPES as readonly string[]).includes(item.notificationType)) return null;
	if (item.notificationType === 'ORDER_PAID' && memberType && memberType !== MemberType.USER) return 'notifications.type.ORDER_PAID_SALE';
	return `notifications.type.${item.notificationType}`;
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
