import { EventCategory, EventLocaleCode, EventStatus } from '../types/event';
import { LayoutSection } from '../seats/types';
import { VenueConflict } from '../venueConflict';
import { MemberStatus, MemberType } from '../enums/member.enum';

/** Shapes of the admin operations (see apollo/admin/query.ts). */

export type ModerationFlagType = 'DUPLICATE' | 'SUSPICIOUS' | 'INAPPROPRIATE' | 'MISLEADING_PRICE';

export interface ModerationFlag {
	/** The backend types this as a string; the AI prompt allows the four values above */
	type: string;
	reason?: string | null;
	confidence?: number | null;
}

/** `checked: false` means the AI check did not run or failed (backend DECISIONS #60). */
export interface Moderation {
	checked?: boolean | null;
	flags: ModerationFlag[];
	reason?: string | null;
	confidence?: number | null;
	model?: string | null;
	checkedAt?: string | null;
}

export interface CommissionOverride {
	rate: number;
	endsAt?: string | null;
	reason: string;
}

export interface AdminOrganizerRef {
	_id: string;
	memberNick?: string | null;
	memberFullName?: string | null;
	memberEmail?: string | null;
	memberImage?: string;
	memberStatus: MemberStatus;
	memberEvents?: number;
	completedEvents?: number;
	commissionOverride?: CommissionOverride | null;
}

export interface AdminEventRow {
	_id: string;
	eventCategory: EventCategory;
	eventStatus: EventStatus;
	seatingType: 'GENERAL' | 'RESERVED';
	eventTitle: string;
	eventTranslations: { locale: EventLocaleCode; title: string }[];
	startAt: string;
	endAt: string;
	organizerId: string;
	createdAt: string;
	updatedAt: string;
	rejectReason?: string | null;
	cancelReason?: string | null;
	eventModeration?: Moderation | null;
	memberData?: Pick<AdminOrganizerRef, '_id' | 'memberNick' | 'memberFullName' | 'memberStatus'> | null;
	venueData?: { _id: string; venueName: string; venueCity: string; venueTimezone: string } | null;
	/** admin-only: null = not checked (or not requested), [] = checked and nothing found */
	possibleVenueConflicts?: VenueConflict[] | null;
}

export interface AdminVenue {
	_id: string;
	venueName: string;
	venueCity: string;
	venueAddress: string;
	venueTimezone: string;
	venueCapacity?: number;
	venueStatus?: string;
	venueLayout?: { sections: LayoutSection[] } | null;
}

export interface AdminEvent extends Omit<AdminEventRow, 'memberData' | 'venueData' | 'eventTranslations'> {
	eventDesc?: string | null;
	eventImages: string[];
	eventTranslations: { locale: EventLocaleCode; title: string; description?: string | null }[];
	eventMinPrice: number;
	venueId: string;
	saleStartAt?: string | null;
	saleEndAt?: string | null;
	memberData?: AdminOrganizerRef | null;
	venueData?: AdminVenue | null;
}

export interface AdminTicketType {
	_id: string;
	ticketTypeName: string;
	ticketPrice: number;
	ticketCurrency: string;
	tierKey?: string | null;
	totalQuantity: number;
	soldQuantity: number;
	maxPerOrder: number;
	saleStartAt?: string | null;
	saleEndAt?: string | null;
	ticketTypeStatus: 'ACTIVE' | 'PAUSED' | 'SOLD_OUT';
}

export interface AdminOrganizer {
	_id: string;
	memberStatus: MemberStatus;
	memberEmail?: string | null;
	memberPhone?: string | null;
	memberNick?: string | null;
	memberFullName?: string | null;
	memberImage: string;
	memberDesc?: string | null;
	memberEvents: number;
	completedEvents: number;
	rejectReason?: string | null;
	createdAt: string;
	updatedAt: string;
	commissionOverride?: CommissionOverride | null;
}

export interface AdminMember {
	_id: string;
	memberType: MemberType;
	memberStatus: MemberStatus;
	memberEmail?: string | null;
	memberPhone?: string | null;
	memberNick?: string | null;
	memberFullName?: string | null;
	memberImage: string;
	memberEvents: number;
	completedEvents: number;
	createdAt: string;
	updatedAt: string;
}

export interface AdminOrder {
	_id: string;
	orderNumber: string;
	orderStatus: 'PENDING_PAYMENT' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';
	buyerId: string;
	eventId: string;
	items: { ticketTypeId: string; quantity: number; unitPrice: number }[];
	currency?: string | null;
	subtotal: number;
	commissionRate: number;
	commissionAmount: number;
	totalAmount: number;
	paidAt?: string | null;
	refundedAt?: string | null;
	createdAt: string;
	buyerNick?: string | null;
	buyerEmail?: string | null;
	eventTitle?: string | null;
	eventData?: { _id: string; eventTitle: string; eventTranslations?: { locale: EventLocaleCode; title: string }[]; organizerId: string } | null;
}

export const organizerName = (m?: { memberNick?: string | null; memberFullName?: string | null; memberEmail?: string | null } | null) =>
	m?.memberFullName || m?.memberNick || m?.memberEmail || '';
