/** Shapes of the seat and checkout operations (see docs/ai/schema.json). */
export type SeatStatus = 'SOLD' | 'HELD';
export type SectionKind = 'SEATED' | 'STANDING';
export type SectionSpacing = 'COMPACT' | 'NORMAL' | 'WIDE';

export interface LayoutSection {
	key: string;
	name: string;
	kind: SectionKind;
	rows: number;
	seatsPerRow: number;
	capacity?: number | null;
	x: number;
	y: number;
	rotation: number;
	spacing: SectionSpacing;
	tierKey?: string | null;
}

/** A seat that is not available. Every seat not listed in the map is available. */
export interface TakenSeat {
	sectionKey: string;
	row: number;
	number: number;
	seatStatus: SeatStatus;
	mine?: boolean | null;
	holdExpiresAt?: string | null;
}

export interface SeatMapData {
	eventId: string;
	venueTimezone: string;
	venueLayout: { sections: LayoutSection[] };
	seats: TakenSeat[];
}

export interface SeatRef {
	sectionKey: string;
	row: number;
	number: number;
}

export interface SeatConfig {
	seatHoldSeconds: number;
	maxSeatsPerOrder: number;
}

export interface HeldSeat extends SeatRef {
	_id: string;
	ticketTypeId: string;
}

export interface SeatHold {
	eventId: string;
	seats: HeldSeat[];
	heldUntil: string;
	holdSeconds: number;
	serverTime: string;
}

export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';

export interface OrderItem {
	ticketTypeId: string;
	quantity: number;
	unitPrice: number;
}

export interface OrderData {
	_id: string;
	orderNumber: string;
	orderStatus: OrderStatus;
	eventId: string;
	items: OrderItem[];
	seatIds: string[];
	currency?: string | null;
	subtotal: number;
	commissionAmount: number;
	totalAmount: number;
	expiresAt: string;
	paidAt?: string | null;
	createdAt: string;
	eventData?: {
		_id: string;
		eventStatus: string;
		seatingType: 'GENERAL' | 'RESERVED';
		eventTitle: string;
		eventTranslations: { locale: string; title: string }[];
		eventImages: string[];
		startAt: string;
		endAt: string;
		venueId: string;
	} | null;
}
