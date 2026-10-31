import { EventCategory, EventLocaleCode, EventStatus } from '../types/event';

/** Shapes of the organizer operations (see apollo/organizer/query.ts). */
export interface LayoutSection {
	key: string;
	name: string;
	kind: 'SEATED' | 'STANDING';
	rows: number;
	seatsPerRow: number;
	capacity?: number | null;
	tierKey?: string | null;
}

export interface OrgVenue {
	_id: string;
	venueName: string;
	venueType?: string;
	venueCity: string;
	venueAddress: string;
	venueTimezone: string;
	venueCapacity?: number;
	venueStatus?: 'ACTIVE' | 'CLOSED' | 'DELETE';
	venueLayout?: { sections: LayoutSection[] } | null;
}

export interface OrgEvent {
	_id: string;
	eventCategory: EventCategory;
	eventStatus: EventStatus;
	seatingType: 'GENERAL' | 'RESERVED';
	eventTitle: string;
	eventDesc?: string | null;
	eventImages: string[];
	eventTranslations: { locale: EventLocaleCode; title: string; description?: string | null }[];
	eventMinPrice: number;
	organizerId: string;
	venueId: string;
	startAt: string;
	endAt: string;
	saleStartAt?: string | null;
	saleEndAt?: string | null;
	rejectReason?: string | null;
	cancelReason?: string | null;
	/** absent in old data: refundable until the day before */
	refundPolicy?: { policyType: 'REFUNDABLE' | 'NON_REFUNDABLE'; daysBefore: number } | null;
	createdAt: string;
	updatedAt: string;
	venueData?: OrgVenue | null;
}

export interface OrgTicketType {
	_id: string;
	eventId: string;
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

export type TranslatedLocale = 'KO' | 'RU' | 'UZ';
export const TRANSLATED_LOCALES: TranslatedLocale[] = ['KO', 'RU', 'UZ'];
