import { gql } from '@apollo/client';

/** Operations of the organizer's venues (names from docs/ai/schema.json). `getVenues` has no "mine" filter, so the list filters by `memberId`. */
export const VENUE_FIELDS = gql`
	fragment VenueFields on Venue {
		_id
		venueName
		venueType
		venueCity
		venueAddress
		venueTimezone
		venueCapacity
		venueImages
		venueStatus
		memberId
		createdAt
		updatedAt
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
				level
			}
			focalArea {
				type
				x
				y
				width
				height
			}
		}
	}
`;

/** The four server templates (concert hall, arena, football stadium, comedy club); a venue is created from a copy. */
export const GET_VENUE_TEMPLATES = gql`
	query GetVenueTemplates {
		getVenueTemplates {
			key
			name
			description
			venueType
			capacity
			layout {
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
					level
				}
				focalArea {
					type
					x
					y
					width
					height
				}
			}
		}
	}
`;

export const GET_VENUES_PAGE = gql`
	query GetVenuesPage($input: VenuesInquiry!) {
		getVenues(input: $input) {
			list {
				...VenueFields
			}
			metaCounter {
				total
			}
		}
	}
	${VENUE_FIELDS}
`;

export const GET_VENUE_FULL = gql`
	query GetVenueFull($venueId: String!) {
		getVenue(venueId: $venueId) {
			...VenueFields
		}
	}
	${VENUE_FIELDS}
`;

export const CREATE_VENUE = gql`
	mutation CreateVenue($input: VenueInput!) {
		createVenue(input: $input) {
			...VenueFields
		}
	}
	${VENUE_FIELDS}
`;

export const UPDATE_VENUE = gql`
	mutation UpdateVenue($input: VenueUpdate!) {
		updateVenue(input: $input) {
			...VenueFields
		}
	}
	${VENUE_FIELDS}
`;

/** Events of the organizer with the fields that decide how a venue may change (the list has no per-venue count on the server). */
export const GET_EVENTS_FOR_VENUES = gql`
	query GetEventsForVenues($input: OrganizerEventsInquiry!) {
		getMyEvents(input: $input) {
			list {
				_id
				eventTitle
				eventStatus
				seatingType
				venueId
				startAt
			}
			metaCounter {
				total
			}
		}
	}
`;

/** Tier keys of the ticket types of several events, one aliased request (the "this change would orphan a tier" warning). */
export const ticketTiersOfEventsQuery = (ids: string[]) =>
	gql`
		query GetTierKeysOfEvents(${ids.map((_, i) => `$id${i}: String!`).join(', ')}) {
			${ids
				.map(
					(_, i) => `t${i}: getTicketTypes(eventId: $id${i}) {
				_id
				eventId
				tierKey
				ticketTypeName
				soldQuantity
			}`,
				)
				.join('\n')}
		}
	`;
