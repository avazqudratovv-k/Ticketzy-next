import Link from 'next/link';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { ChatCircleDots } from 'phosphor-react';
import { useOrganizerConversation } from '../../messaging/hooks';

interface Props {
	organizerId: string;
	/** `link` is the short form for table rows */
	variant?: 'button' | 'link';
}

/**
 * Opens the admin's conversation with this organizer. The backend lets only ORGANIZERS start a conversation
 * (`startConversation` answers CONVERSATION_ORGANIZERS_ONLY to anyone else), so when the organizer has not written yet
 * there is nothing to open: the action is disabled and says why.
 */
const MessageOrganizer = ({ organizerId, variant = 'button' }: Props) => {
	const { t } = useTranslation('admin');
	const { ready, conversationId } = useOrganizerConversation(organizerId);
	const href = conversationId ? `/admin/messages?c=${conversationId}` : null;
	const label = variant === 'link' ? t('organizers.message.short') : t('organizers.message.action');

	if (variant === 'link') {
		return href ? (
			<Link href={href} className="tz-link org-linkbtn">
				{label}
			</Link>
		) : (
			<span className="adm-muted" title={t('organizers.message.noneHint')}>
				{ready ? t('organizers.message.none') : '…'}
			</span>
		);
	}

	return (
		<>
			{href ? (
				<Button component={Link} href={href} variant="outlined" startIcon={<ChatCircleDots size={20} aria-hidden="true" />}>
					{label}
				</Button>
			) : (
				<Button variant="outlined" disabled startIcon={<ChatCircleDots size={20} aria-hidden="true" />} aria-describedby={`msg-none-${organizerId}`}>
					{label}
				</Button>
			)}
			{!href && ready && (
				<p id={`msg-none-${organizerId}`} className="adm-muted adm-actions__note">
					{t('organizers.message.noneHint')}
				</p>
			)}
		</>
	);
};

export default MessageOrganizer;
