import { useMemo } from 'react';
import { useReactiveVar } from '@apollo/client';
import { conversationsVar, messagingErrorVar, messagingReadyVar, socketStatusVar } from '../../apollo/store';
import { ConversationEntry, SocketStatus } from './types';

/** The member's conversations, newest activity first. */
export function useConversationEntries(): ConversationEntry[] {
	const map = useReactiveVar(conversationsVar);
	return useMemo(
		() =>
			Object.values(map).sort(
				(a, b) => b.conversation.lastMessageAt.localeCompare(a.conversation.lastMessageAt) || b.conversation._id.localeCompare(a.conversation._id),
			),
		[map],
	);
}

export function useConversationEntry(id: string | undefined): ConversationEntry | undefined {
	const map = useReactiveVar(conversationsVar);
	return id ? map[id] : undefined;
}

/** Unread messages over all conversations: the badge of the sidebar item. */
export function useMessagingUnread(): number {
	const map = useReactiveVar(conversationsVar);
	return useMemo(() => Object.values(map).reduce((sum, entry) => sum + entry.unread, 0), [map]);
}

export const useMessagingReady = (): boolean => useReactiveVar(messagingReadyVar);
export const useMessagingFailed = (): boolean => useReactiveVar(messagingErrorVar);
export const useSocketStatus = (): SocketStatus => useReactiveVar(socketStatusVar);
