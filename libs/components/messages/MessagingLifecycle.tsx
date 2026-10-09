import { useEffect } from 'react';
import { useApolloClient } from '@apollo/client';
import useAuth from '../../hooks/useAuth';
import { MemberType } from '../../enums/member.enum';
import { startMessaging } from '../../messaging/sync';

/**
 * Mounted once in _app. While an ORGANIZER or ADMIN is signed in it runs the shared socket and the conversation
 * store (unread badges, inbox, thread events); on logout, or when the member changes, it closes the socket and clears it.
 * USER members never connect: the backend refuses their sockets.
 */
const MessagingLifecycle = () => {
	const client = useApolloClient();
	const { user } = useAuth();
	const id = user?._id;
	const type = user?.memberType;

	useEffect(() => {
		if (!id || (type !== MemberType.ORGANIZER && type !== MemberType.ADMIN)) return undefined;
		return startMessaging(client, id, type);
	}, [client, id, type]);

	return null;
};

export default MessagingLifecycle;
