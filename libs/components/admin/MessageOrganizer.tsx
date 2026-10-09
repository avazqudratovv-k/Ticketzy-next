import { useState } from 'react';
import { useRouter } from 'next/router';
import { useApolloClient } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { ChatCircleDots } from 'phosphor-react';
import { START_CONVERSATION_WITH_ORGANIZER } from '../../../apollo/messaging';
import { MemberType } from '../../enums/member.enum';
import { describeMessagingError } from '../../messaging/errors';
import { addConversation, syncConversations } from '../../messaging/sync';

interface Props {
	organizerId: string;
	/** `link` is the short form for table rows */
	variant?: 'button' | 'link';
}

/**
 * Opens the admin's conversation with this organizer, creating it when it does not exist
 * (`startConversationWithOrganizerByAdmin` is idempotent and accepts organizers in any status). The conversation is put
 * into the list and its room joined before the page opens, because no socket event announces a new conversation.
 */
const MessageOrganizer = ({ organizerId, variant = 'button' }: Props) => {
	const { t } = useTranslation('admin');
	const client = useApolloClient();
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const label = variant === 'link' ? t('organizers.message.short') : t('organizers.message.action');

	const open = async () => {
		if (busy) return;
		setBusy(true);
		setError(null);
		try {
			const { data } = await client.mutate({ mutation: START_CONVERSATION_WITH_ORGANIZER, variables: { organizerId } });
			const conversation = data.startConversationWithOrganizerByAdmin;
			addConversation(conversation, MemberType.ADMIN);
			await router.push({ pathname: '/admin/messages', query: { c: conversation._id } });
			// the list is the source of truth for the unread count and the preview; refresh it without waiting for the poll
			syncConversations(client, MemberType.ADMIN);
		} catch (err) {
			const described = describeMessagingError(err);
			const key = described.network ? 'network' : described.key === 'adminOrganizersOnly' ? 'adminOnly' : described.key === 'noData' ? 'notFound' : described.key === 'notAllowed' ? 'notAllowed' : 'generic';
			setError(t(`organizers.message.errors.${key}`));
		} finally {
			setBusy(false);
		}
	};

	const note = error && (
		<p role="alert" className="adm-actions__error">
			{error}
		</p>
	);
	const text = busy ? t('organizers.message.opening') : label;

	if (variant === 'link') {
		return (
			<>
				<button type="button" className="tz-link org-linkbtn" onClick={open} disabled={busy} aria-busy={busy}>
					{text}
				</button>
				{note}
			</>
		);
	}

	return (
		<>
			<Button variant="outlined" onClick={open} disabled={busy} aria-busy={busy} startIcon={<ChatCircleDots size={20} aria-hidden="true" />}>
				{text}
			</Button>
			{note}
		</>
	);
};

export default MessageOrganizer;
