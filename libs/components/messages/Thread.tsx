import { useEffect, useMemo, useRef, useState } from 'react';
import useIsomorphicLayoutEffect from '../../hooks/useIsomorphicLayoutEffect';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useApolloClient } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { ArrowDown, ArrowLeft, Check, Checks, Clock, WarningCircle, WifiSlash } from 'phosphor-react';
import { conversationsVar } from '../../../apollo/store';
import { MARK_CONVERSATION_READ } from '../../../apollo/messaging';
import { MemberType } from '../../enums/member.enum';
import { formatEventWhen } from '../../format';
import { organizerEventEditUrl } from '../../routes';
import { dayLabel, formatClock, groupByDay, partyName } from '../../messaging/format';
import { useSocketStatus } from '../../messaging/hooks';
import { markThreadNotificationsRead, setUnread, upsertConversation } from '../../messaging/sync';
import useThread from '../../messaging/useThread';
import { Conversation, ConversationEntry, ThreadMessage } from '../../messaging/types';
import EventImage from '../events/EventImage';
import EventStatusBadge from '../organizer/EventStatusBadge';
import { EventStatus } from '../../types/event';
import StateBlock from '../states/StateBlock';
import PartyAvatar from './PartyAvatar';
import Composer from './Composer';
import { conversationTitle } from './labels';

interface Props {
	entry: ConversationEntry;
	role: MemberType.ORGANIZER | MemberType.ADMIN;
	meId: string;
	onBack: () => void;
}

/** Closer than this to the bottom counts as "reading the newest messages": new ones scroll into view. */
const STICK_PX = 96;

/** One conversation: header, event card, the messages by day, typing, composer (design: OrgMessagesThread, AdmMessagesThread). */
const Thread = ({ entry, role, meId, onBack }: Props) => {
	const { t } = useTranslation('messages');
	const { locale } = useRouter();
	const client = useApolloClient();
	const socketStatus = useSocketStatus();
	const { conversation } = entry;
	const id = conversation._id;
	const isAdmin = role === MemberType.ADMIN;
	const thread = useThread(id, conversation, { id: meId, isAdmin });
	const { messages } = thread;
	const groups = useMemo(() => groupByDay(messages), [messages]);

	const log = useRef<HTMLDivElement>(null);
	const stick = useRef(true);
	const previous = useRef<{ first?: string; last?: string; height: number }>({ height: 0 });
	const [newBelow, setNewBelow] = useState(false);

	// Scroll: to the newest on open and for my own messages; keep the place when older ones are added; otherwise offer a jump.
	useIsomorphicLayoutEffect(() => {
		const el = log.current;
		if (!el) return;
		const first = messages[0]?._id;
		const lastMessage = messages[messages.length - 1];
		const before = previous.current;
		if (before.first && first !== before.first && lastMessage?._id === before.last) {
			el.scrollTop += el.scrollHeight - before.height;
		} else if (lastMessage && lastMessage._id !== before.last) {
			if (!before.last || stick.current || lastMessage.senderId === meId) {
				el.scrollTop = el.scrollHeight;
				setNewBelow(false);
			} else {
				setNewBelow(true);
			}
		} else if (stick.current) {
			// the newest message changed in place (sending, failed, read): keep it fully in view
			el.scrollTop = el.scrollHeight;
		}
		previous.current = { first, last: lastMessage?._id, height: el.scrollHeight };
	}, [messages, meId]);

	// The typing line appears below the messages: keep the end in view if the reader was there.
	useIsomorphicLayoutEffect(() => {
		const el = log.current;
		if (el && stick.current) el.scrollTop = el.scrollHeight;
	}, [thread.typingIds.length]);

	const onScroll = () => {
		const el = log.current;
		if (!el) return;
		stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX;
		if (stick.current) setNewBelow(false);
	};
	const jumpToNewest = () => {
		const el = log.current;
		if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
	};

	// Mark as read while the thread is open and the tab is in front and focused.
	const [focused, setFocused] = useState(true);
	useEffect(() => {
		const update = () => setFocused(document.visibilityState === 'visible' && document.hasFocus());
		update();
		window.addEventListener('focus', update);
		window.addEventListener('blur', update);
		document.addEventListener('visibilitychange', update);
		return () => {
			window.removeEventListener('focus', update);
			window.removeEventListener('blur', update);
			document.removeEventListener('visibilitychange', update);
		};
	}, []);
	const marking = useRef(false);
	const [retryTick, setRetryTick] = useState(0);
	const unread = entry.unread;
	useEffect(() => {
		if (!focused || unread <= 0 || marking.current) return undefined;
		marking.current = true;
		let retry: ReturnType<typeof setTimeout> | undefined;
		client
			.mutate({ mutation: MARK_CONVERSATION_READ, variables: { conversationId: id } })
			.then(({ data }) => {
				const updated: Conversation = data.markConversationRead;
				// a message that came in while this was running keeps its own, newer count
				if (conversationsVar()[id]?.unread === unread) upsertConversation(updated, role);
				else setUnread(id, conversationsVar()[id]?.unread ?? 0);
				markThreadNotificationsRead(client, id);
			})
			.catch(() => {
				// try again in a while instead of in a loop
				retry = setTimeout(() => setRetryTick((tick) => tick + 1), 10_000);
			})
			.finally(() => {
				marking.current = false;
			});
		return () => clearTimeout(retry);
	}, [focused, unread, id, role, client, retryTick]);

	const title = conversationTitle(conversation, role, t);
	const handler = partyName(conversation.adminData);
	const subtitle = isAdmin
		? conversation.organizerData?.memberNick && conversation.organizerData.memberNick !== title
			? conversation.organizerData.memberNick
			: t('thread.organizer')
		: handler
		? t('thread.handling', { name: handler })
		: conversation.adminId
		? t('thread.handlingTeam')
		: t('thread.noAdminYet');

	const senderName = (message: ThreadMessage): string => {
		if (message.senderId === meId) return t('thread.you');
		if (message.senderId === conversation.organizerId) return partyName(conversation.organizerData) || t('thread.organizer');
		if (message.senderId === conversation.adminId) return partyName(conversation.adminData) || t('thread.admin');
		return t('thread.admin');
	};
	const typingName = (memberId: string): string => (memberId === conversation.organizerId ? partyName(conversation.organizerData) || t('thread.organizer') : partyName(conversation.adminData) || t('thread.admin'));
	const typingText = thread.typingIds.length ? t('thread.typing', { name: thread.typingIds.map(typingName).filter((n, i, all) => all.indexOf(n) === i).join(', ') }) : '';

	const event = conversation.eventData;

	return (
		<section className="msgs-thread" aria-label={t('thread.label', { title })}>
			<header className="msgs-thread__head">
				<button type="button" className="msgs-back" onClick={onBack} aria-label={t('thread.back')}>
					<ArrowLeft size={20} aria-hidden="true" />
				</button>
				<PartyAvatar conversation={conversation} role={role} size={44} />
				<div className="msgs-thread__who">
					<h2 className="msgs-thread__title">{title}</h2>
					<span className="msgs-thread__sub">{subtitle}</span>
				</div>
			</header>

			{socketStatus === 'fallback' && (
				<p className="msgs-note" role="status">
					<WifiSlash size={18} aria-hidden="true" />
					<span>{t('thread.fallback')}</span>
				</p>
			)}

			{event ? (
				<Link className="msgs-eventcard" href={isAdmin ? `/admin/events/${event._id}` : organizerEventEditUrl(event._id)}>
					<span className="msgs-eventcard__media">
						<EventImage src={event.eventImages?.[0]} sizes="64px" />
					</span>
					<span className="msgs-eventcard__body">
						<span className="msgs-eventcard__title">{event.eventTitle}</span>
						<span className="msgs-eventcard__sub">{formatEventWhen(event.startAt, event.endAt, locale)}</span>
						<span className="msgs-eventcard__foot">
							<EventStatusBadge status={event.eventStatus as EventStatus} />
							<span className="tz-link">{isAdmin ? t('thread.openEvent') : t('thread.editEvent')}</span>
						</span>
					</span>
				</Link>
			) : (
				<p className="msgs-support">{t(isAdmin ? 'thread.supportNoteAdmin' : 'thread.supportNote')}</p>
			)}

			<div className="msgs-logwrap">
				<div className="msgs-log" ref={log} onScroll={onScroll} role="log" aria-live="polite" aria-label={t('thread.logLabel')} aria-busy={thread.loading}>
					{thread.loading && messages.length === 0 && !thread.loadError && (
						<div className="msgs-skeleton" aria-hidden="true">
							<span className="tz-skel msgs-skeleton__in" />
							<span className="tz-skel msgs-skeleton__out" />
							<span className="tz-skel msgs-skeleton__in" />
						</div>
					)}
					{thread.loadError && messages.length === 0 && (
						<StateBlock
							alert
							icon={<WarningCircle size={28} />}
							title={t('thread.loadError.title')}
							text={thread.loadError.network ? t('errors.network') : t('thread.loadError.text')}
							actions={
								<Button variant="outlined" onClick={() => thread.reload()}>
									{t('errors.retry')}
								</Button>
							}
						/>
					)}
					{thread.hasMore && (
						<div className="msgs-older">
							<Button variant="outlined" size="small" onClick={() => thread.loadOlder()} disabled={thread.loadingOlder}>
								{thread.loadingOlder ? t('thread.loadingOlder') : t('thread.loadOlder')}
							</Button>
							{thread.olderError && (
								<span className="msgs-older__error" role="alert">
									{t('thread.olderError')}
								</span>
							)}
						</div>
					)}
					{!thread.loading && !thread.loadError && messages.length === 0 && <p className="msgs-empty">{t('thread.empty')}</p>}
					{groups.map((group) => {
						const label = dayLabel(group.iso, locale);
						return (
							<div className="msgs-day" key={group.key} role="group" aria-label={label.kind === 'date' ? label.text : t(`thread.${label.kind}`)}>
								<div className="msgs-day__label">
									<span>{label.kind === 'date' ? label.text : t(`thread.${label.kind}`)}</span>
								</div>
								{group.messages.map((message) => (
									<Bubble
										key={message._id}
										message={message}
										mine={message.senderId === meId}
										name={senderName(message)}
										locale={locale}
										onRetry={() => thread.retry(message._id)}
										onDiscard={() => thread.discard(message._id)}
									/>
								))}
							</div>
						);
					})}
					{typingText && (
						<div className="msgs-typing" role="status">
							<span className="msgs-typing__dots" aria-hidden="true">
								<i />
								<i />
								<i />
							</span>
							{typingText}
						</div>
					)}
				</div>
				{newBelow && (
					<button type="button" className="msgs-jump" onClick={jumpToNewest}>
						<ArrowDown size={16} aria-hidden="true" />
						{t('thread.newBelow')}
					</button>
				)}
			</div>

			<Composer conversationId={id} sending={thread.sending} onSend={(body) => thread.send(body)} onTyping={thread.notifyTyping} />
		</section>
	);
};

interface BubbleProps {
	message: ThreadMessage;
	mine: boolean;
	name: string;
	locale?: string;
	onRetry: () => void;
	onDiscard: () => void;
}

const Bubble = ({ message, mine, name, locale, onRetry, onDiscard }: BubbleProps) => {
	const { t } = useTranslation('messages');
	const failed = message.local === 'failed';
	const sending = message.local === 'sending';
	const error = message.error;
	const errorText = error ? (error.network ? t('errors.network') : error.key ? t(`serverErrors.${error.key}`) : error.raw || t('errors.generic')) : '';
	return (
		<div className={`msgs-msg ${mine ? 'msgs-msg--me' : 'msgs-msg--them'}${failed ? ' is-failed' : ''}${sending ? ' is-sending' : ''}`}>
			<span className="msgs-msg__who">
				{name} · {formatClock(message.createdAt, locale)}
			</span>
			<p className="msgs-msg__body">{message.body}</p>
			{mine && (
				<span className="msgs-msg__state">
					{sending && (
						<>
							<Clock size={14} aria-hidden="true" />
							{t('thread.state.sending')}
						</>
					)}
					{failed && (
						<>
							<WarningCircle size={14} aria-hidden="true" />
							{t('thread.state.failed')}
						</>
					)}
					{!sending && !failed && message.readAt && (
						<>
							<Checks size={14} aria-hidden="true" />
							{t('thread.state.read')}
						</>
					)}
					{!sending && !failed && !message.readAt && (
						<>
							<Check size={14} aria-hidden="true" />
							{t('thread.state.sent')}
						</>
					)}
				</span>
			)}
			{failed && (
				<span className="msgs-msg__failed" role="alert">
					<span>{errorText}</span>
					<button type="button" className="tz-link" onClick={onRetry}>
						{t('thread.state.retry')}
					</button>
					<button type="button" className="tz-link msgs-msg__remove" onClick={onDiscard}>
						{t('thread.state.remove')}
					</button>
				</span>
			)}
		</div>
	);
};

export default Thread;
