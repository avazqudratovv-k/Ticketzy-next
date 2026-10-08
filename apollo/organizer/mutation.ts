import { gql } from '@apollo/client';
import { ORGANIZER_EVENT_FIELDS, ORGANIZER_TICKET_TYPE_FIELDS } from './query';

export const CREATE_EVENT = gql`
	mutation CreateEvent($input: EventInput!) {
		createEvent(input: $input) {
			...OrganizerEventFields
		}
	}
	${ORGANIZER_EVENT_FIELDS}
`;

export const UPDATE_EVENT = gql`
	mutation UpdateEvent($input: EventUpdate!) {
		updateEvent(input: $input) {
			...OrganizerEventFields
		}
	}
	${ORGANIZER_EVENT_FIELDS}
`;

export const SUBMIT_EVENT_FOR_APPROVAL = gql`
	mutation SubmitEventForApproval($eventId: String!) {
		submitEventForApproval(eventId: $eventId) {
			...OrganizerEventFields
		}
	}
	${ORGANIZER_EVENT_FIELDS}
`;

export const CREATE_TICKET_TYPE = gql`
	mutation CreateTicketType($input: TicketTypeInput!) {
		createTicketType(input: $input) {
			...OrganizerTicketTypeFields
		}
	}
	${ORGANIZER_TICKET_TYPE_FIELDS}
`;

export const UPDATE_TICKET_TYPE = gql`
	mutation UpdateTicketType($input: TicketTypeUpdate!) {
		updateTicketType(input: $input) {
			...OrganizerTicketTypeFields
		}
	}
	${ORGANIZER_TICKET_TYPE_FIELDS}
`;

/** Suggestions only: the backend saves nothing. It reads the title and description already saved on the event. */
export const TRANSLATE_EVENT = gql`
	mutation TranslateEvent($input: TranslateEventInput!) {
		translateEvent(input: $input) {
			locale
			title
			description
		}
	}
`;

/** Organizer cancel: `cancelMyEvent(input: EventReasonInput)`, backend DECISIONS #69. */
export const CANCEL_MY_EVENT = gql`
	mutation CancelMyEvent($input: EventReasonInput!) {
		cancelMyEvent(input: $input) {
			_id
			eventStatus
			cancelReason
		}
	}
`;
