import { EventTranslation } from './event';

/** Shapes of the buyer-account operations (see ACCOUNT_ORDER_FIELDS, ACCOUNT_TICKET_FIELDS in apollo/user/query.ts). */
export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';
export type TicketStatus = 'VALID' | 'USED' | 'REFUNDED' | 'CANCELLED';

/** The event as the order and ticket queries return it, with its venue joined. */
export interface AccountEvent {
	_id: string;
	eventStatus: string;
	seatingType?: 'GENERAL' | 'RESERVED';
	eventTitle: string;
	eventTranslations: EventTranslation[];
	eventImages: string[];
	startAt: string;
	endAt: string;
	venueId: string;
	venueData?: VenueBrief | null;
}

export interface AccountOrder {
	_id: string;
	orderNumber: string;
	orderStatus: OrderStatus;
	eventId: string;
	items: { ticketTypeId: string; quantity: number; unitPrice: number }[];
	seatIds: string[];
	currency?: string | null;
	subtotal: number;
	totalAmount: number;
	expiresAt: string;
	paidAt?: string | null;
	refundedAt?: string | null;
	createdAt: string;
	eventData?: AccountEvent | null;
}

export interface AccountTicket {
	_id: string;
	ticketCode: string;
	ticketStatus: TicketStatus;
	qrToken?: string | null;
	orderId: string;
	eventId: string;
	ticketTypeId: string;
	checkedInAt?: string | null;
	seatData?: { sectionKey: string; row: number; number: number } | null;
	ticketTypeData?: { ticketTypeName: string; ticketPrice: number; ticketCurrency?: string | null } | null;
	eventData?: AccountEvent | null;
}

export interface VenueBrief {
	_id: string;
	venueName: string;
	venueCity: string;
	venueAddress: string;
	venueTimezone: string;
}

export interface RefundQuote {
	orderId: string;
	refundable: boolean;
	deadline: string;
	venueTimezone: string;
	refundableAmount: number;
	currency?: string | null;
	reason?: string | null;
}

export type NotificationType =
	| 'LIKE'
	| 'COMMENT'
	| 'ORDER_PAID'
	| 'EVENT_REMINDER'
	| 'ORGANIZER_VERIFIED'
	| 'ORGANIZER_REJECTED'
	| 'ORGANIZER_SUSPENDED'
	| 'ORGANIZER_REINSTATED'
	| 'COMMISSION_UPDATED'
	| 'EVENT_APPROVED'
	| 'EVENT_REJECTED'
	| 'EVENT_CANCELLED'
	| 'REFUND_COMPLETED'
	| 'ORDER_REFUNDED'
	| 'NEW_MESSAGE'
	| 'PAYOUT_PAID';

export interface NotificationItem {
	_id: string;
	notificationType: NotificationType;
	notificationStatus: 'WAIT' | 'READ';
	notificationGroup: 'MEMBER' | 'EVENT' | 'ORDER' | 'CONVERSATION';
	notificationTitle: string;
	notificationDesc?: string | null;
	eventId?: string | null;
	orderId?: string | null;
	conversationId?: string | null;
	createdAt: string;
}
