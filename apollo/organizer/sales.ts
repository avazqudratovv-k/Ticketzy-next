import { gql } from '@apollo/client';

/** Sales, attendee and profile reads of the organizer area. Names come from docs/ai/schema.json (backend DECISIONS #57, #69). */

/** The events an organizer can have sales for (an event that never went on sale has none). Views and likes are the owner's counters. */
export const GET_SALES_EVENTS = gql`
	query GetSalesEvents($input: OrganizerEventsInquiry!) {
		getMyEvents(input: $input) {
			list {
				_id
				eventStatus
				eventTitle
				eventTranslations {
					locale
					title
				}
				seatingType
				startAt
				endAt
				saleStartAt
				eventViews
				eventLikes
				venueId
				venueData {
					_id
					venueName
					venueTimezone
				}
			}
			metaCounter {
				total
			}
		}
	}
`;

/** Tickets of one event in one status. `getEventAttendees` hides refunded tickets unless `ticketStatus: REFUNDED` is asked for. */
export const GET_ATTENDEES = gql`
	query GetAttendees($input: AttendeesInquiry!) {
		getEventAttendees(input: $input) {
			list {
				ticketId
				ticketCode
				ticketStatus
				checkedInAt
				buyerName
				ticketTypeName
				orderNumber
				seat {
					sectionKey
					row
					number
				}
			}
			metaCounter {
				total
			}
		}
	}
`;

/** Per-ticket-type sales of several events in one request (aliases `s0`, `s1`, ...). */
export const salesOfEventsQuery = (ids: string[]) =>
	gql`
		query GetSalesOfEvents(${ids.map((_, i) => `$id${i}: String!`).join(', ')}) {
			${ids
				.map(
					(_, i) => `s${i}: getEventSales(eventId: $id${i}) {
				eventId
				ticketTypes {
					ticketTypeId
					ticketTypeName
					currency
					ticketsSold
					revenue
					commission
					netPayout
				}
			}`,
				)
				.join('\n')}
		}
	`;

/** Own account with the counters and the commission override that only the member can read. */
export const GET_ORGANIZER_ME = gql`
	query GetOrganizerMe($memberId: String!) {
		getMember(memberId: $memberId) {
			_id
			memberStatus
			memberNick
			memberFullName
			memberDesc
			memberAddress
			memberPhone
			memberEmail
			memberImage
			memberEvents
			completedEvents
			memberFollowers
			memberLikes
			memberViews
			commissionOverride {
				rate
				endsAt
				reason
			}
		}
	}
`;

/** Paid (or refunded) orders, as many as asked for, for the payouts table and the analytics charts. */
export const GET_ORDERS_FOR_SALES = gql`
	query GetOrdersForSales($input: OrganizerOrdersInquiry!) {
		getMyEventOrders(input: $input) {
			list {
				_id
				eventId
				orderStatus
				ticketCount
				currency
				subtotal
				commissionAmount
				totalAmount
				paidAt
				refundedAt
				createdAt
			}
			metaCounter {
				total
			}
		}
	}
`;
