import { MemberStatus, MemberType } from '../enums/member.enum';

/** Shapes of `Conversation`, `ChatMessage` and the socket events (backend DECISIONS #58). */

export interface ConversationParty {
	_id: string;
	memberType: MemberType;
	memberStatus: MemberStatus;
	memberNick?: string | null;
	memberFullName?: string | null;
	memberImage?: string | null;
}

export interface ConversationEvent {
	_id: string;
	eventTitle: string;
	eventImages: string[];
	eventStatus: string;
	eventCategory: string;
	startAt: string;
	endAt: string;
}

export interface Conversation {
	_id: string;
	eventId?: string | null;
	isSupport: boolean;
	organizerId: string;
	adminId?: string | null;
	lastMessageAt: string;
	unreadForOrganizer: number;
	unreadForAdmin: number;
	createdAt: string;
	updatedAt: string;
	eventData?: ConversationEvent | null;
	organizerData?: ConversationParty | null;
	adminData?: ConversationParty | null;
}

export interface ChatMessage {
	_id: string;
	conversationId: string;
	senderId: string;
	body: string;
	readAt?: string | null;
	createdAt: string;
}

/** A message in a thread: the server's, or one of mine that is still being sent or failed. */
export interface ThreadMessage extends ChatMessage {
	/** Present only on messages that are not saved yet */
	local?: 'sending' | 'failed';
	/** Why it failed: a known server message key (messages.json `serverErrors`), or the server's own text */
	error?: { key?: string; raw: string; network: boolean };
}

/** One conversation as the inbox keeps it. `unread` is the count for the signed-in member's side. */
export interface ConversationEntry {
	conversation: Conversation;
	lastMessage: ChatMessage | null;
	unread: number;
	/** `lastMessageAt` the preview was fetched for */
	previewFor: string | null;
}

export type SocketStatus = 'off' | 'connecting' | 'open' | 'fallback';

/** Server to client socket messages: `{ event, data }` */
export interface TypingEvent {
	conversationId: string;
	memberId: string;
	isTyping: boolean;
}
export interface UnreadEvent {
	conversationId: string;
	unreadCount: number;
}
export interface ReadEvent {
	conversationId: string;
	readerId: string;
	readAt: string;
}
