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

/** The organizers block of the home page. The events come from GET_EVENTS (one query for the hero, one per category row). */
export const GET_HOME_ORGANIZERS = gql`
	query GetHomeOrganizers($organizers: OrganizersInquiry!) {
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
			venueData {
				_id
				venueName
				venueCity
				venueAddress
				venueTimezone
			}
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
				ticketTypeData {
					ticketTypeName
					ticketPrice
				}
			}
		}
	}
`;

/**************************
 *    ACCOUNT (BUYER)     *
 *************************/

/** Order rows and details. `eventData.venueData` is joined by the server (backend DECISIONS #68); it is null only when the venue no longer exists. */
export const ACCOUNT_ORDER_FIELDS = gql`
	fragment AccountOrderFields on Order {
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
		totalAmount
		expiresAt
		paidAt
		refundedAt
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
			venueData {
				_id
				venueName
				venueCity
				venueAddress
				venueTimezone
			}
		}
	}
`;

export const GET_MY_ORDERS = gql`
	query GetMyOrders($input: OrdersInquiry!) {
		getMyOrders(input: $input) {
			list {
				...AccountOrderFields
			}
			metaCounter {
				total
			}
		}
	}
	${ACCOUNT_ORDER_FIELDS}
`;

export const GET_ORDER_DETAIL = gql`
	query GetOrderDetail($orderId: String!) {
		getOrder(orderId: $orderId) {
			...AccountOrderFields
		}
	}
	${ACCOUNT_ORDER_FIELDS}
`;

/** The backend decides refund eligibility; the deadline is in UTC and `venueTimezone` says whose wall clock it follows. */
export const GET_REFUND_QUOTE = gql`
	query GetRefundQuote($orderId: String!) {
		getRefundQuote(orderId: $orderId) {
			orderId
			refundable
			deadline
			venueTimezone
			refundableAmount
			currency
			reason
		}
	}
`;

export const ACCOUNT_TICKET_FIELDS = gql`
	fragment AccountTicketFields on Ticket {
		_id
		ticketCode
		ticketStatus
		qrToken
		orderId
		eventId
		ticketTypeId
		checkedInAt
		seatData {
			sectionKey
			row
			number
		}
		ticketTypeData {
			ticketTypeName
			ticketPrice
			ticketCurrency
		}
		eventData {
			_id
			eventStatus
			eventTitle
			eventTranslations {
				locale
				title
			}
			eventImages
			startAt
			endAt
			venueId
			venueData {
				_id
				venueName
				venueCity
				venueAddress
				venueTimezone
			}
		}
	}
`;

export const GET_MY_TICKETS_LIST = gql`
	query GetMyTicketsList($input: TicketsInquiry!) {
		getMyTickets(input: $input) {
			list {
				...AccountTicketFields
			}
			metaCounter {
				total
			}
		}
	}
	${ACCOUNT_TICKET_FIELDS}
`;

export const GET_TICKET = gql`
	query GetTicket($ticketId: String!) {
		getTicket(ticketId: $ticketId) {
			...AccountTicketFields
		}
	}
	${ACCOUNT_TICKET_FIELDS}
`;

export const GET_MY_NOTIFICATIONS = gql`
	query GetMyNotifications($input: NotificationsInquiry!) {
		getMyNotifications(input: $input) {
			list {
				_id
				notificationType
				notificationStatus
				notificationGroup
				notificationTitle
				notificationDesc
				eventId
				orderId
				conversationId
				createdAt
				authorData {
					_id
					memberType
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

export const GET_UNREAD_NOTIFICATION_COUNT = gql`
	query GetUnreadNotificationCount {
		getUnreadNotificationCount
	}
`;

/** Own status and the approval-celebration flag, cheap to poll (backend #120). Allowed for PENDING, REJECTED and SUSPENDED members too. */
export const GET_MY_ACCOUNT_STATE = gql`
	query GetMyAccountState {
		getMyAccountState {
			memberStatus
			approvalCelebrationPending
		}
	}
`;

/** USER or ORGANIZER, own account, no arguments: may the account be deleted, what blocks it, how many unused tickets a buyer holds (backend #123). */
export const GET_MY_ACCOUNT_DELETION_CHECK = gql`
	query GetMyAccountDeletionCheck {
		getMyAccountDeletionCheck {
			canDelete
			blockers {
				reason
				count
				eventNames
			}
			unusedUpcomingTickets
		}
	}
`;

export const GET_MY_FAVORITES = gql`
	query GetMyFavorites($input: OrdinaryInquiry!) {
		getFavorites(input: $input) {
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
