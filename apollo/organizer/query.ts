import { gql } from '@apollo/client';

/** Operations of the organizer area. Names come from docs/ai/schema.json. */

export const ORGANIZER_EVENT_FIELDS = gql`
	fragment OrganizerEventFields on Event {
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
		venueData {
			_id
			venueName
			venueCity
			venueAddress
			venueTimezone
		}
	}
`;

/** `getMyEvents` is the organizer's own list, in every status. The search can only filter by status. */
export const GET_MY_EVENTS = gql`
	query GetMyEvents($input: OrganizerEventsInquiry!) {
		getMyEvents(input: $input) {
			list {
				...OrganizerEventFields
			}
			metaCounter {
				total
			}
		}
	}
	${ORGANIZER_EVENT_FIELDS}
`;

/** One count per status in one request (limit 1: only `metaCounter` is read). `ALL` has no status filter. */
export const EVENT_STATUS_KEYS = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'ENDED'] as const;
export const GET_MY_EVENT_COUNTS = gql`
	query GetMyEventCounts {
		ALL: getMyEvents(input: { page: 1, limit: 1, search: {} }) {
			metaCounter {
				total
			}
		}
		${EVENT_STATUS_KEYS.map(
			(status) => `${status}: getMyEvents(input: { page: 1, limit: 1, search: { eventStatus: ${status} } }) {
			metaCounter {
				total
			}
		}`,
		).join('\n')}
	}
`;

export const GET_MY_EVENT = gql`
	query GetMyEvent($eventId: String!) {
		getEvent(eventId: $eventId) {
			...OrganizerEventFields
		}
	}
	${ORGANIZER_EVENT_FIELDS}
`;

export const ORGANIZER_TICKET_TYPE_FIELDS = gql`
	fragment OrganizerTicketTypeFields on TicketType {
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
`;

export const GET_EVENT_TICKET_TYPES = gql`
	query GetEventTicketTypes($eventId: String!) {
		getTicketTypes(eventId: $eventId) {
			...OrganizerTicketTypeFields
		}
	}
	${ORGANIZER_TICKET_TYPE_FIELDS}
`;

/** Ticket types of several events (the dashboard and the list show "sold of total"), one aliased request. */
export const ticketTypesOfEventsQuery = (ids: string[]) =>
	gql`
		query GetTicketTypesOfEvents(${ids.map((_, i) => `$id${i}: String!`).join(', ')}) {
			${ids
				.map(
					(_, i) => `t${i}: getTicketTypes(eventId: $id${i}) {
				_id
				eventId
				totalQuantity
				soldQuantity
			}`,
				)
				.join('\n')}
		}
	`;

/** Venues the organizer can pick (the ACTIVE ones; there is no "my venues" filter), with the layout that decides tiers. */
export const GET_VENUE_OPTIONS = gql`
	query GetVenueOptions($input: VenuesInquiry!) {
		getVenues(input: $input) {
			list {
				_id
				venueName
				venueType
				venueCity
				venueAddress
				venueTimezone
				venueCapacity
				venueLayout {
					sections {
						key
						name
						kind
						rows
						seatsPerRow
						capacity
						tierKey
					}
				}
			}
			metaCounter {
				total
			}
		}
	}
`;

export const GET_MY_EARNINGS = gql`
	query GetMyEarnings {
		getMyEarnings {
			earnings {
				currency
				ordersCount
				ticketsSold
				revenue
				commission
				netPayout
				refundedAmount
			}
		}
	}
`;

/** One venue with its layout (an event may sit in a venue that is no longer ACTIVE, so it is not in the picker list). */
export const GET_VENUE_DETAIL = gql`
	query GetVenueDetail($venueId: String!) {
		getVenue(venueId: $venueId) {
			_id
			venueName
			venueType
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
					tierKey
				}
			}
		}
	}
`;
