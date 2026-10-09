import { TFunction } from 'i18next';
import { MemberType } from '../../enums/member.enum';
import { partyName } from '../../messaging/format';
import { Conversation } from '../../messaging/types';

/** Who the conversation is with, from the signed-in member's side: the admin team, or the organizer. */
export function conversationTitle(conversation: Conversation, role: MemberType, t: TFunction): string {
	if (role === MemberType.ADMIN) return partyName(conversation.organizerData) || t('list.unknownOrganizer');
	return t('list.adminTeam');
}

/** What it is about: the event, or the general support conversation. */
export const conversationAbout = (conversation: Conversation, t: TFunction): string =>
	conversation.eventData?.eventTitle || (conversation.isSupport ? t('list.support') : t('list.event'));
