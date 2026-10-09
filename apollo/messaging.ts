import { gql } from '@apollo/client';

/** Conversation operations (names from docs/ai/schema.json). Only ORGANIZER and ADMIN members may call them. */

export const CONVERSATION_FIELDS = gql`
	fragment ConversationFields on Conversation {
		_id
		eventId
		isSupport
		organizerId
		adminId
		lastMessageAt
		unreadForOrganizer
		unreadForAdmin
		createdAt
		updatedAt
		eventData {
			_id
			eventTitle
			eventImages
			eventStatus
			eventCategory
			startAt
			endAt
		}
		organizerData {
			_id
			memberType
			memberStatus
			memberNick
			memberFullName
			memberImage
		}
		adminData {
			_id
			memberType
			memberStatus
			memberNick
			memberFullName
			memberImage
		}
	}
`;

export const MESSAGE_FIELDS = `
	_id
	conversationId
	senderId
	body
	readAt
	createdAt
`;

export const GET_MY_CONVERSATIONS = gql`
	query GetMyConversations($input: OrdinaryInquiry!) {
		getMyConversations(input: $input) {
			list {
				...ConversationFields
			}
			metaCounter {
				total
			}
		}
	}
	${CONVERSATION_FIELDS}
`;

export const GET_CONVERSATION = gql`
	query GetConversation($conversationId: String!) {
		getConversation(conversationId: $conversationId) {
			...ConversationFields
		}
	}
	${CONVERSATION_FIELDS}
`;

export const GET_MESSAGES = gql`
	query GetMessages($conversationId: String!, $input: OrdinaryInquiry!) {
		getMessages(conversationId: $conversationId, input: $input) {
			list {
				${MESSAGE_FIELDS}
			}
			metaCounter {
				total
			}
		}
	}
`;

export const START_CONVERSATION = gql`
	mutation StartConversation($eventId: String) {
		startConversation(eventId: $eventId) {
			...ConversationFields
		}
	}
	${CONVERSATION_FIELDS}
`;

/** ADMIN only. Idempotent: returns the organizer's support conversation, creating it the first time. */
export const START_CONVERSATION_WITH_ORGANIZER = gql`
	mutation StartConversationWithOrganizerByAdmin($organizerId: String!) {
		startConversationWithOrganizerByAdmin(organizerId: $organizerId) {
			...ConversationFields
		}
	}
	${CONVERSATION_FIELDS}
`;

export const SEND_MESSAGE = gql`
	mutation SendMessage($conversationId: String!, $body: String!) {
		sendMessage(conversationId: $conversationId, body: $body) {
			${MESSAGE_FIELDS}
		}
	}
`;

export const MARK_CONVERSATION_READ = gql`
	mutation MarkConversationRead($conversationId: String!) {
		markConversationRead(conversationId: $conversationId) {
			...ConversationFields
		}
	}
	${CONVERSATION_FIELDS}
`;

/** The newest message of many conversations in one request (the list needs a preview, `Conversation` has none). */
export const lastMessagesQuery = (count: number) => {
	const vars = Array.from({ length: count }, (_, i) => `$c${i}: String!`).join(', ');
	const fields = Array.from(
		{ length: count },
		(_, i) => `m${i}: getMessages(conversationId: $c${i}, input: { page: 1, limit: 1 }) { list { ${MESSAGE_FIELDS} } }`,
	).join('\n');
	return gql`query GetLastMessages(${vars}) { ${fields} }`;
};
