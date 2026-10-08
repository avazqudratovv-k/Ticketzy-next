/** Fields of the `Event`, `Venue`, `TicketType`, `Comment` GraphQL types the public pages read. */
export type EventCategory =
	| 'CONCERT'
	| 'SPORT'
	| 'FOOTBALL'
	| 'COMEDY'
	| 'THEATER'
	| 'CONFERENCE'
	| 'FESTIVAL'
	| 'OTHER';
export type EventStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'ENDED';
export type EventLocaleCode = 'EN' | 'KO' | 'RU' | 'UZ';

export interface EventTranslation {
	locale: EventLocaleCode;
	title: string;
	description?: string | null;
}

export interface Venue {
	_id: string;
	venueName: string;
	venueCity: string;
	venueAddress: string;
	venueTimezone: string;
	venueCoordinates?: number[] | null;
}

export interface EventOrganizer {
	_id: string;
	memberNick?: string | null;
	memberFullName?: string | null;
	memberImage: string;
	memberDesc?: string | null;
	memberEvents?: number;
	completedEvents?: number;
	memberFollowers?: number;
}

export interface EventItem {
	_id: string;
	eventCategory: EventCategory;
	eventStatus: EventStatus;
	seatingType: 'GENERAL' | 'RESERVED';
	eventTitle: string;
	eventDesc?: string | null;
	eventImages: string[];
	eventTranslations: EventTranslation[];
	eventMinPrice: number;
	eventViews: number;
	eventLikes: number;
	eventComments: number;
	organizerId: string;
	startAt: string;
	endAt: string;
	cancelReason?: string | null;
	venueData?: Venue | null;
	memberData?: EventOrganizer | null;
	meLiked?: { myFavorite: boolean }[] | null;
}

export type TicketTypeStatus = 'ACTIVE' | 'PAUSED' | 'SOLD_OUT';

export interface TicketTypeItem {
	_id: string;
	ticketTypeName: string;
	ticketPrice: number;
	ticketCurrency: string;
	totalQuantity: number;
	soldQuantity: number;
	maxPerOrder: number;
	ticketTypeStatus: TicketTypeStatus;
	saleStartAt?: string | null;
	saleEndAt?: string | null;
}

export interface CommentItem {
	_id: string;
	commentContent: string;
	memberId: string;
	createdAt: string;
	memberData?: { _id: string; memberNick?: string | null; memberFullName?: string | null; memberImage: string } | null;
}
