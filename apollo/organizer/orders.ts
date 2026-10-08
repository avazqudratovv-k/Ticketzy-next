import { gql } from '@apollo/client';

/** Orders of the organizer's own events and the gate (backend DECISIONS #53, #69). Names come from docs/ai/schema.json. */

export const ORGANIZER_ORDER_FIELDS = gql`
	fragment OrganizerOrderFields on OrganizerOrder {
		_id
		orderNumber
		orderStatus
		buyerNick
		eventId
		ticketCount
		items {
			ticketTypeId
			quantity
			unitPrice
		}
		seats {
			sectionKey
			row
			number
		}
		currency
		subtotal
		commissionRate
		commissionAmount
		totalAmount
		paidAt
		refundedAt
		createdAt
		eventData {
			_id
			eventTitle
			eventTranslations {
				locale
				title
				description
			}
		}
	}
`;

export const GET_MY_EVENT_ORDERS = gql`
	query GetMyEventOrders($input: OrganizerOrdersInquiry!) {
		getMyEventOrders(input: $input) {
			list {
				...OrganizerOrderFields
			}
			metaCounter {
				total
			}
		}
	}
	${ORGANIZER_ORDER_FIELDS}
`;

export const ORDER_STATUS_KEYS = ['PENDING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'] as const;

/** One count per order status of one event (or of all own events when `eventId` is empty): limit 1, only `metaCounter` is read. */
export const GET_MY_ORDER_COUNTS = gql`
	query GetMyOrderCounts($eventId: String) {
		ALL: getMyEventOrders(input: { page: 1, limit: 1, eventId: $eventId }) {
			metaCounter {
				total
			}
		}
		${ORDER_STATUS_KEYS.map(
			(status) => `${status}: getMyEventOrders(input: { page: 1, limit: 1, eventId: $eventId, orderStatus: ${status} }) {
			metaCounter {
				total
			}
		}`,
		).join('\n')}
	}
`;

export const CHECK_IN_TICKET = gql`
	mutation CheckInTicket($qrToken: String!, $eventId: String) {
		checkInTicket(qrToken: $qrToken, eventId: $eventId) {
			ticketStatus
			buyerName
			ticketTypeName
			seat {
				sectionKey
				row
				number
			}
			ticket {
				_id
				ticketCode
				checkedInAt
			}
		}
	}
`;

/** Attendee counts of one event: total, and how many are USED. */
export const GET_CHECKIN_COUNTS = gql`
	query GetCheckInCounts($eventId: String!) {
		all: getEventAttendees(input: { eventId: $eventId, page: 1, limit: 1 }) {
			metaCounter {
				total
			}
		}
		used: getEventAttendees(input: { eventId: $eventId, page: 1, limit: 1, ticketStatus: USED }) {
			metaCounter {
				total
			}
		}
	}
`;

/** Paid orders for the sales chart: the latest ones, newest first. */
export const GET_PAID_ORDERS_FOR_CHART = gql`
	query GetPaidOrdersForChart($limit: Int!) {
		getMyEventOrders(input: { page: 1, limit: $limit, orderStatus: PAID, sort: "createdAt", direction: DESC }) {
			list {
				_id
				paidAt
				createdAt
				totalAmount
				currency
			}
			metaCounter {
				total
			}
		}
	}
`;
