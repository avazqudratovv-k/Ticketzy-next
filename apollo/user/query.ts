import { gql } from '@apollo/client';
import { EVENT_CARD_FIELDS, MEMBER_FIELDS } from './fragments';

/**************************
 *         MEMBER         *
 *************************/

export const GET_MEMBER = gql`
	query GetMember($memberId: String!) {
		getMember(memberId: $memberId) {
			...MemberFields
		}
	}
	${MEMBER_FIELDS}
`;

/**************************
 *         EVENTS         *
 *************************/

export const GET_EVENTS = gql`
	query GetEvents($input: EventsInquiry!) {
		getEvents(input: $input) {
			list {
				...EventCardFields
			}
			metaCounter {
				total
			}
		}
	}
	${EVENT_CARD_FIELDS}
`;

/** One round trip for the home page; each alias is a `getEvents` call. */
export const GET_HOME = gql`
	query GetHome(
		$upcoming: EventsInquiry!
		$popular: EventsInquiry!
		$concerts: EventsInquiry!
		$football: EventsInquiry!
		$comedy: EventsInquiry!
		$organizers: OrganizersInquiry!
	) {
		upcoming: getEvents(input: $upcoming) {
			list {
				...EventCardFields
			}
		}
		popular: getEvents(input: $popular) {
			list {
				...EventCardFields
			}
		}
		concerts: getEvents(input: $concerts) {
			list {
				...EventCardFields
			}
		}
		football: getEvents(input: $football) {
			list {
				...EventCardFields
			}
		}
		comedy: getEvents(input: $comedy) {
			list {
				...EventCardFields
			}
		}
		organizers: getOrganizers(input: $organizers) {
			list {
				_id
				memberNick
				memberFullName
				memberImage
				memberDesc
				memberEvents
			}
		}
	}
	${EVENT_CARD_FIELDS}
`;

export const GET_VENUES = gql`
	query GetVenues($input: VenuesInquiry!) {
		getVenues(input: $input) {
			list {
				_id
				venueCity
			}
		}
	}
`;

export const GET_EVENT = gql`
	query GetEvent($eventId: String!) {
		getEvent(eventId: $eventId) {
			...EventCardFields
			cancelReason
			memberData {
				_id
				memberNick
				memberFullName
				memberImage
				memberDesc
				memberEvents
				completedEvents
				memberFollowers
			}
			venueData {
				_id
				venueName
				venueCity
				venueAddress
				venueTimezone
				venueCoordinates
			}
		}
	}
	${EVENT_CARD_FIELDS}
`;

export const GET_TICKET_TYPES = gql`
	query GetTicketTypes($eventId: String!) {
		getTicketTypes(eventId: $eventId) {
			_id
			ticketTypeName
			ticketPrice
			ticketCurrency
			tierKey
			totalQuantity
			soldQuantity
			maxPerOrder
			ticketTypeStatus
			saleStartAt
			saleEndAt
		}
	}
`;

export const GET_COMMENTS = gql`
	query GetComments($input: CommentsInquiry!) {
		getComments(input: $input) {
			list {
				_id
				commentContent
				memberId
				createdAt
				memberData {
					_id
					memberNick
					memberFullName
					memberImage
				}
			}
			metaCounter {
				total
			}
		}
	}
`;

export const GET_ORGANIZER = gql`
	query GetOrganizer($memberId: String!) {
		getMember(memberId: $memberId) {
			_id
			memberType
			memberNick
			memberFullName
			memberImage
			memberDesc
			memberAddress
			memberEvents
			completedEvents
			memberFollowers
		}
	}
`;

/**************************
 *         SEATS          *
 *************************/

export const GET_SEAT_CONFIG = gql`
	query GetSeatConfig {
		getSeatConfig {
			seatHoldSeconds
			maxSeatsPerOrder
		}
	}
`;

/** Only taken seats come back (SOLD, or HELD with a live hold); every seat not listed is available. */
export const GET_EVENT_SEAT_MAP = gql`
	query GetEventSeatMap($eventId: String!) {
		getEventSeatMap(eventId: $eventId) {
			eventId
			venueTimezone
			venueLayout {
				sections {
					key
					name
					kind
					rows
					seatsPerRow
					capacity
					x
					y
					rotation
					spacing
					tierKey
				}
			}
			seats {
				sectionKey
				row
				number
				seatStatus
				mine
				holdExpiresAt
			}
		}
	}
`;

/**************************
 *         ORDERS         *
 *************************/

export const ORDER_FIELDS = gql`
	fragment OrderFields on Order {
		_id
		orderNumber
		orderStatus
		eventId
		items {
			ticketTypeId
			quantity
			unitPrice
		}
		seatIds
		currency
		subtotal
		commissionAmount
		totalAmount
		expiresAt
		paidAt
		createdAt
		eventData {
			_id
			eventStatus
			seatingType
			eventTitle
			eventTranslations {
				locale
				title
			}
			eventImages
			startAt
			endAt
			venueId
		}
	}
`;

export const GET_ORDER = gql`
	query GetOrder($orderId: String!) {
		getOrder(orderId: $orderId) {
			...OrderFields
		}
	}
	${ORDER_FIELDS}
`;

/** The buyer's orders that still wait for payment; the seat picker offers to resume one. */
export const GET_MY_PENDING_ORDERS = gql`
	query GetMyPendingOrders($input: OrdersInquiry!) {
		getMyOrders(input: $input) {
			list {
				_id
				eventId
				expiresAt
				orderStatus
			}
		}
	}
`;

/** Tickets of the buyer; the confirmation page picks the ones of one order (there is no orderId filter). */
export const GET_MY_TICKETS = gql`
	query GetMyTickets($input: TicketsInquiry!) {
		getMyTickets(input: $input) {
			list {
				_id
				ticketCode
				ticketStatus
				orderId
				ticketTypeId
				seatData {
					sectionKey
					row
					number
				}
			}
		}
	}
`;
