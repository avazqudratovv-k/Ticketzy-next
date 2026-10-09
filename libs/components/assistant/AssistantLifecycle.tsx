import { useEffect } from 'react';
import { useReactiveVar } from '@apollo/client';
import { authReadyVar, userVar } from '../../../apollo/store';
import { hydrateAssistant, syncAssistantOwner } from '../../assistant/store';

/**
 * Mounted once in _app (the widget itself is per page). Loads the chat saved for this tab, and starts a clean one
 * when the signed-in member changes, so a chat never outlives a logout, even one done on an organizer page.
 */
const AssistantLifecycle = () => {
	const user = useReactiveVar(userVar);
	const ready = useReactiveVar(authReadyVar);

	useEffect(() => {
		hydrateAssistant();
	}, []);

	useEffect(() => {
		if (ready) syncAssistantOwner(user?._id ?? 'guest');
	}, [ready, user?._id]);

	return null;
};

export default AssistantLifecycle;
