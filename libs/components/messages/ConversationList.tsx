import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { daysAgo, formatViewerDay } from '../../format';
import { MemberType } from '../../enums/member.enum';
import { formatClock } from '../../messaging/format';
import { ConversationEntry } from '../../messaging/types';
import PartyAvatar from './PartyAvatar';
import { conversationAbout, conversationTitle } from './labels';

interface Props {
	entries: ConversationEntry[];
	role: MemberType.ORGANIZER | MemberType.ADMIN;
	meId: string;
	selectedId: string;
	onSelect: (id: string) => void;
}

/** "13:05" today, "Yesterday", then "2 Oct" (with the year in another year). */
function useListTime() {
	const { t } = useTranslation('messages');
	const { locale } = useRouter();
	return (iso: string) => {
		const days = daysAgo(iso);
		if (days === 0) return formatClock(iso, locale);
		if (days === 1) return t('list.yesterday');
		return formatViewerDay(iso, locale, new Date(iso).getFullYear() !== new Date().getFullYear());
	};
}

/** The conversations, newest activity first (design: pg-convs). */
const ConversationList = ({ entries, role, meId, selectedId, onSelect }: Props) => {
	const { t } = useTranslation('messages');
	const when = useListTime();
	return (
		<ul className="msgs-convs">
			{entries.map((entry) => {
				const { conversation, lastMessage, unread } = entry;
				const title = conversationTitle(conversation, role, t);
				const selected = conversation._id === selectedId;
				const preview = lastMessage ? (lastMessage.senderId === meId ? t('list.you', { text: lastMessage.body }) : lastMessage.body) : t('list.noMessages');
				return (
					<li key={conversation._id}>
						<button type="button" className="msgs-conv" aria-current={selected ? 'true' : undefined} onClick={() => onSelect(conversation._id)}>
							<PartyAvatar conversation={conversation} role={role} size={40} />
							<span className="msgs-conv__text">
								<span className="msgs-conv__top">
									<span className={`msgs-conv__name${unread > 0 ? ' is-unread' : ''}`}>{title}</span>
									<span className="msgs-conv__time">{when(lastMessage?.createdAt ?? conversation.lastMessageAt)}</span>
								</span>
								<span className="msgs-conv__about">{conversationAbout(conversation, t)}</span>
								<span className="msgs-conv__prev">{preview}</span>
							</span>
							{unread > 0 && (
								<span className="msgs-badge" role="img" aria-label={t('list.unread', { count: unread })}>
									{unread > 99 ? '99+' : unread}
								</span>
							)}
						</button>
					</li>
				);
			})}
		</ul>
	);
};

export default ConversationList;
