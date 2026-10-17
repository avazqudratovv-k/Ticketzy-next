import { makeVar } from '@apollo/client';
import { MemberProfile } from '../libs/types/member';
import { ConversationEntry, SocketStatus } from '../libs/messaging/types';

/** The signed-in member, or null. Filled by restoreSession() and logIn(). */
export const userVar = makeVar<MemberProfile | null>(null);

/** False until the first session restore has finished, so guards and the header do not flash the wrong state. */
export const authReadyVar = makeVar<boolean>(false);

/** Organizer / admin messaging: the conversations of the signed-in member by id, kept live by the shared socket (libs/messaging). */
export const conversationsVar = makeVar<Record<string, ConversationEntry>>({});

/** True once the conversation list has been loaded once for this session; `messagingErrorVar` when that first load failed. */
export const messagingReadyVar = makeVar<boolean>(false);
export const messagingErrorVar = makeVar<boolean>(false);

/** `open` = live; `fallback` = the socket cannot connect, everything polls every 10 seconds. */
export const socketStatusVar = makeVar<SocketStatus>('off');

/** Set when the member's account was just deleted: the closing window (AccountDeletedNotice) shows, then the session ends (F364). */
export const accountDeletedVar = makeVar<{ role: 'USER' | 'ORGANIZER' } | null>(null);
