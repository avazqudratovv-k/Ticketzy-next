import { gql } from '@apollo/client';

/** Operations of the admin area. Names come from docs/ai/schema.json (admin: getEventsByAdmin, getOrganizersByAdmin, getAllMembersByAdmin, getAllOrdersByAdmin). */

export const MODERATION_FIELDS = gql`
	fragment AdminModerationFields on EventModeration {
		checked
		reason
		confidence
		model
		checkedAt
		flags {
			type
			reason
			confidence
		}
	}
`;

export const ADMIN_EVENT_ROW_FIELDS = gql`
	fragment AdminEventRowFields on Event {
		_id
		eventCategory
		eventStatus
		seatingType
		eventTitle
		eventTranslations {
			locale
			title
		}
		startAt
		endAt
		organizerId
		createdAt
		updatedAt
		rejectReason
		cancelReason
		eventModeration {
			...AdminModerationFields
		}
		memberData {
			_id
			memberNick
			memberFullName
			memberStatus
		}
		venueData {
			_id
			venueName
			venueCity
			venueTimezone
		}
	}
	${MODERATION_FIELDS}
`;

/** `getEventsByAdmin` answers "No data found!" for an empty list, so callers treat that error as "no events". */
export const GET_ADMIN_EVENTS = gql`
	query GetAdminEvents($input: EventsByAdminInquiry!) {
		getEventsByAdmin(input: $input) {
			list {
				...AdminEventRowFields
			}
			metaCounter {
				total
			}
		}
	}
	${ADMIN_EVENT_ROW_FIELDS}
`;

export const ADMIN_EVENT_STATUS_KEYS = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'ENDED'] as const;

/** One count per status in one request (limit 1: only `metaCounter` is read). An empty status errors, so run with errorPolicy "all" and read a missing alias as 0. */
export const GET_ADMIN_EVENT_COUNTS = gql`
	query GetAdminEventCounts {
		ALL: getEventsByAdmin(input: { page: 1, limit: 1, search: {} }) {
			metaCounter {
				total
			}
		}
		${ADMIN_EVENT_STATUS_KEYS.map(
			(status) => `${status}: getEventsByAdmin(input: { page: 1, limit: 1, search: { eventStatus: ${status} } }) {
			metaCounter {
				total
			}
		}`,
		).join('\n')}
	}
`;

/** Any event in any status, with the organizer (email included: admins only), the venue and its layout. */
export const GET_ADMIN_EVENT = gql`
	query GetAdminEvent($eventId: String!) {
		getEvent(eventId: $eventId) {
			_id
			eventCategory
			eventStatus
			seatingType
			eventTitle
			eventDesc
			eventImages
			eventTranslations {
				locale
				title
				description
			}
			eventMinPrice
			organizerId
			venueId
			startAt
			endAt
			saleStartAt
			saleEndAt
			rejectReason
			cancelReason
			createdAt
			updatedAt
			eventModeration {
				...AdminModerationFields
			}
			memberData {
				_id
				memberNick
				memberFullName
				memberEmail
				memberImage
				memberStatus
				memberEvents
				completedEvents
				commissionOverride {
					rate
					endsAt
					reason
				}
			}
			venueData {
				_id
				venueName
				venueCity
				venueAddress
				venueTimezone
				venueCapacity
				venueStatus
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
			}
		}
	}
	${MODERATION_FIELDS}
`;

/** The same ticket types query the organizer uses. It answers "No data found!" when the organizer is not ACTIVE. */
export const GET_ADMIN_TICKET_TYPES = gql`
	query GetAdminTicketTypes($eventId: String!) {
		getTicketTypes(eventId: $eventId) {
			_id
			eventId
			ticketTypeName
			ticketPrice
			ticketCurrency
			tierKey
			totalQuantity
			soldQuantity
			maxPerOrder
			saleStartAt
			saleEndAt
			ticketTypeStatus
		}
	}
`;

export const ADMIN_ORGANIZER_FIELDS = gql`
	fragment AdminOrganizerFields on Member {
		_id
		memberStatus
		memberEmail
		memberPhone
		memberNick
		memberFullName
		memberImage
		memberDesc
		memberEvents
		completedEvents
		memberFollowers
		rejectReason
		createdAt
		updatedAt
		commissionOverride {
			rate
			endsAt
			reason
		}
	}
`;

export const GET_ADMIN_ORGANIZERS = gql`
	query GetAdminOrganizers($input: OrganizersByAdminInquiry!) {
		getOrganizersByAdmin(input: $input) {
			list {
				...AdminOrganizerFields
			}
			metaCounter {
				total
			}
		}
	}
	${ADMIN_ORGANIZER_FIELDS}
`;

export const ORGANIZER_STATUS_KEYS = ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'] as const;

export const GET_ADMIN_ORGANIZER_COUNTS = gql`
	query GetAdminOrganizerCounts {
		ALL: getOrganizersByAdmin(input: { page: 1, limit: 1, search: {} }) {
			metaCounter {
				total
			}
		}
		${ORGANIZER_STATUS_KEYS.map(
			(status) => `${status}: getOrganizersByAdmin(input: { page: 1, limit: 1, search: { memberStatus: ${status} } }) {
			metaCounter {
				total
			}
		}`,
		).join('\n')}
	}
`;

/** Orders of the whole platform. The list carries the event and its venue, not the buyer (only `buyerId`). */
export const ADMIN_ORDER_FIELDS = gql`
	fragment AdminOrderFields on AdminOrder {
		_id
		orderNumber
		orderStatus
		buyerId
		eventId
		items {
			ticketTypeId
			quantity
			unitPrice
		}
		currency
		subtotal
		commissionRate
		commissionAmount
		totalAmount
		paidAt
		refundedAt
		createdAt
		buyerNick
		buyerEmail
		eventTitle
		eventData {
			_id
			eventTitle
			eventTranslations {
				locale
				title
			}
			organizerId
		}
	}
`;

export const GET_ADMIN_ORDERS = gql`
	query GetAdminOrders($input: AdminOrdersInquiry!) {
		getAllOrdersByAdmin(input: $input) {
			list {
				...AdminOrderFields
			}
			metaCounter {
				total
			}
		}
	}
	${ADMIN_ORDER_FIELDS}
`;

export const ADMIN_ORDER_STATUS_KEYS = ['PAID', 'REFUNDED', 'PENDING_PAYMENT', 'FAILED', 'CANCELLED', 'EXPIRED'] as const;

/** Counts per status under the same filters as the list (event, buyer text, date range), so the tabs add up with the rows. */
const ORDER_FILTER = 'eventId: $eventId, text: $text, dateFrom: $dateFrom, dateTo: $dateTo';
export const GET_ADMIN_ORDER_COUNTS = gql`
	query GetAdminOrderCounts($eventId: String, $text: String, $dateFrom: DateTime, $dateTo: DateTime) {
		ALL: getAllOrdersByAdmin(input: { page: 1, limit: 1, ${ORDER_FILTER} }) {
			metaCounter {
				total
			}
		}
		${ADMIN_ORDER_STATUS_KEYS.map(
			(status) => `${status}: getAllOrdersByAdmin(input: { page: 1, limit: 1, orderStatus: ${status}, ${ORDER_FILTER} }) {
			metaCounter {
				total
			}
		}`,
		).join('\n')}
	}
`;

/** Events for the order filter (any status: cancelled and ended events keep their orders). */
export const GET_ADMIN_ORDER_EVENTS = gql`
	query GetAdminOrderEvents {
		getEventsByAdmin(input: { page: 1, limit: 200, sort: "startAt", direction: DESC, search: {} }) {
			list {
				_id
				eventTitle
				eventTranslations {
					locale
					title
				}
			}
		}
	}
`;

/** Dashboard: every figure is a count or a sum over what the backend lists (it has no admin statistics query). */
export const GET_ADMIN_OVERVIEW = gql`
	query GetAdminOverview {
		pendingEvents: getEventsByAdmin(input: { page: 1, limit: 5, sort: "updatedAt", direction: ASC, search: { eventStatus: PENDING } }) {
			list {
				...AdminEventRowFields
			}
			metaCounter {
				total
			}
		}
		activeEvents: getEventsByAdmin(input: { page: 1, limit: 1, search: { eventStatus: APPROVED } }) {
			metaCounter {
				total
			}
		}
		pendingOrganizers: getOrganizersByAdmin(input: { page: 1, limit: 5, sort: "createdAt", direction: ASC, search: { memberStatus: PENDING } }) {
			list {
				...AdminOrganizerFields
			}
			metaCounter {
				total
			}
		}
		allOrders: getAllOrdersByAdmin(input: { page: 1, limit: 1 }) {
			metaCounter {
				total
			}
		}
	}
	${ADMIN_EVENT_ROW_FIELDS}
	${ADMIN_ORGANIZER_FIELDS}
`;

/** The money figures: PAID orders only. The newest 1000 are summed; the dashboard says so when there are more. */
export const PAID_SUM_LIMIT = 1000;
export const GET_ADMIN_PAID_ORDERS = gql`
	query GetAdminPaidOrders {
		getAllOrdersByAdmin(input: { page: 1, limit: ${PAID_SUM_LIMIT}, sort: "createdAt", direction: DESC, orderStatus: PAID }) {
			list {
				_id
				currency
				subtotal
				totalAmount
				commissionAmount
			}
			metaCounter {
				total
			}
		}
	}
`;
