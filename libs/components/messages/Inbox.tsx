import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useApolloClient } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { ChatCircleDots, MagnifyingGlass, WarningCircle } from 'phosphor-react';
import { START_CONVERSATION } from '../../../apollo/messaging';
import useAuth from '../../hooks/useAuth';
import { MemberType } from '../../enums/member.enum';
import { describeMessagingError, MessagingError } from '../../messaging/errors';
import { partyName } from '../../messaging/format';
import { useConversationEntries, useConversationEntry, useMessagingFailed, useMessagingReady } from '../../messaging/hooks';
import { fetchConversation, syncConversations, upsertConversation } from '../../messaging/sync';
import StateBlock from '../states/StateBlock';
import ConversationList from './ConversationList';
import Thread from './Thread';
import { conversationAbout, conversationTitle } from './labels';

type Role = MemberType.ORGANIZER | MemberType.ADMIN;

/** Two panes from 1024 px; below that the list or the thread, chosen by `?c=` in the URL (so Back works). */
function useWide(): boolean {
	const [wide, setWide] = useState(false);
	useEffect(() => {
		const query = window.matchMedia('(min-width: 1024px)');
		const update = () => setWide(query.matches);
		update();
		query.addEventListener('change', update);
		return () => query.removeEventListener('change', update);
	}, []);
	return wide;
}

/** Organizer inbox (conversations with the admin team) and admin inbox (conversations with organizers). */
const Inbox = ({ role }: { role: Role }) => {
	const { t } = useTranslation('messages');
	const router = useRouter();
	const client = useApolloClient();
	const { user } = useAuth();
	const isAdmin = role === MemberType.ADMIN;
	const entries = useConversationEntries();
	const ready = useMessagingReady();
	const failed = useMessagingFailed();
	const wide = useWide();
	const selectedId = typeof router.query.c === 'string' ? router.query.c : '';
	const selected = useConversationEntry(selectedId || undefined);
	const [search, setSearch] = useState('');
	const [unreadOnly, setUnreadOnly] = useState(false);
	const [starting, setStarting] = useState(false);
	const [startError, setStartError] = useState<MessagingError | null>(null);
	const [missing, setMissing] = useState('');

	const select = (id: string, replace = false) => {
		const nav = replace ? router.replace : router.push;
		nav({ pathname: router.pathname, query: id ? { c: id } : {} }, undefined, { shallow: true, scroll: false });
	};

	// Wide screens show a thread next to the list: the newest one until another is picked.
	useEffect(() => {
		if (router.isReady && ready && wide && !selectedId && entries.length) select(entries[0].conversation._id, true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [router.isReady, ready, wide, selectedId, entries.length]);

	// A link (a notification) can point at a conversation the list does not have yet.
	useEffect(() => {
		if (!user || !ready || !selectedId || selected || missing === selectedId) return;
		fetchConversation(client, selectedId, role).catch(() => setMissing(selectedId));
	}, [client, user, ready, selectedId, selected, missing, role]);

	const filtered = useMemo(() => {
		const text = search.trim().toLowerCase();
		return entries.filter((entry) => {
			if (unreadOnly && entry.unread === 0) return false;
			if (!text) return true;
			const haystack = [conversationTitle(entry.conversation, role, t), conversationAbout(entry.conversation, t), partyName(entry.conversation.organizerData), entry.conversation.organizerData?.memberNick, entry.lastMessage?.body]
				.filter(Boolean)
				.join(' ')
				.toLowerCase();
			return haystack.includes(text);
		});
	}, [entries, search, unreadOnly, role, t]);

	const hasSupport = entries.some((entry) => entry.conversation.isSupport);

	const contactSupport = async () => {
		setStarting(true);
		setStartError(null);
		try {
			const { data } = await client.mutate({ mutation: START_CONVERSATION, variables: {} });
			upsertConversation(data.startConversation, role);
			select(data.startConversation._id);
			syncConversations(client, role);
		} catch (err) {
			setStartError(describeMessagingError(err));
		} finally {
			setStarting(false);
		}
	};

	const errorText = (error: MessagingError) => (error.network ? t('errors.network') : error.key ? t(`serverErrors.${error.key}`) : error.raw || t('errors.generic'));
	const loading = !ready && !failed;
	const empty = ready && entries.length === 0 && !selectedId;

	let body;
	if (failed && !ready) {
		body = (
			<StateBlock
				alert
				icon={<WarningCircle size={28} />}
				title={t('loadError.title')}
				text={t('loadError.text')}
				actions={
					<Button variant="outlined" onClick={() => syncConversations(client, role)}>
						{t('errors.retry')}
					</Button>
				}
			/>
		);
	} else if (loading) {
		body = (
			<div className="msgs" aria-busy="true" aria-label={t('loading')}>
				<div className="msgs-panel msgs-list">
					{[0, 1, 2].map((n) => (
						<span key={n} className="tz-skel tz-skel--block" />
					))}
				</div>
			</div>
		);
	} else if (empty) {
		body = (
			<StateBlock
				icon={<ChatCircleDots size={28} />}
				title={t(isAdmin ? 'empty.admin.title' : 'empty.organizer.title')}
				text={t(isAdmin ? 'empty.admin.text' : 'empty.organizer.text')}
				actions={
					!isAdmin && (
						<>
							<Button variant="contained" onClick={contactSupport} disabled={starting}>
								{starting ? t('empty.organizer.starting') : t('empty.organizer.action')}
							</Button>
							{startError && (
								<p className="tz-alert tz-alert--error" role="alert">
									<WarningCircle size={20} aria-hidden="true" />
									<span>{errorText(startError)}</span>
								</p>
							)}
						</>
					)
				}
			/>
		);
	} else {
		body = (
			<div className={`msgs${selectedId ? ' is-thread' : ''}`}>
				<section className="msgs-panel msgs-list" aria-label={t('list.label')}>
					<div className="msgs-tools">
						<label className="msgs-search">
							<MagnifyingGlass size={20} aria-hidden="true" />
							<span className="tz-sr">{t(isAdmin ? 'list.searchAdmin' : 'list.searchOrganizer')}</span>
							<input
								type="search"
								className="tz-input"
								value={search}
								maxLength={100}
								placeholder={t(isAdmin ? 'list.searchAdmin' : 'list.searchOrganizer')}
								onChange={(event) => setSearch(event.target.value)}
							/>
						</label>
						<div className="msgs-filter" role="group" aria-label={t('list.filterLabel')}>
							<button type="button" aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>
								{t('list.filterAll')}
							</button>
							<button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>
								{t('list.filterUnread')}
							</button>
						</div>
						{!isAdmin && !hasSupport && (
							<Button variant="outlined" size="small" onClick={contactSupport} disabled={starting}>
								{starting ? t('empty.organizer.starting') : t('empty.organizer.action')}
							</Button>
						)}
						{startError && (
							<p className="tz-alert tz-alert--error" role="alert">
								<WarningCircle size={20} aria-hidden="true" />
								<span>{errorText(startError)}</span>
							</p>
						)}
					</div>
					{filtered.length === 0 ? (
						<div className="msgs-none">
							<p>{t('list.none.title')}</p>
							<span>{t('list.none.text')}</span>
							<Button
								variant="outlined"
								size="small"
								onClick={() => {
									setSearch('');
									setUnreadOnly(false);
								}}
							>
								{t('list.none.clear')}
							</Button>
						</div>
					) : (
						<ConversationList entries={filtered} role={role} meId={user?._id ?? ''} selectedId={selectedId} onSelect={(id) => select(id)} />
					)}
				</section>
				<div className="msgs-panel msgs-pane">
					{selected && user ? (
						<Thread key={selected.conversation._id} entry={selected} role={role} meId={user._id} onBack={() => select('')} />
					) : selectedId && missing === selectedId ? (
						<StateBlock
							icon={<ChatCircleDots size={28} />}
							title={t('thread.notFound.title')}
							text={t('thread.notFound.text')}
							actions={
								<Button variant="outlined" onClick={() => select('')}>
									{t('thread.back')}
								</Button>
							}
						/>
					) : selectedId ? (
						<div className="msgs-skeleton" aria-hidden="true">
							<span className="tz-skel msgs-skeleton__in" />
							<span className="tz-skel msgs-skeleton__out" />
						</div>
					) : (
						<p className="msgs-pick">{t('thread.pick')}</p>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className={`org-page msgs-page${selectedId ? ' has-thread' : ''}`}>
			<Head>
				<title>{`${t('page.title')} · Ticketzy`}</title>
			</Head>
			<div className="tz-pagehead">
				<h1>{t('page.title')}</h1>
				<p>{t(isAdmin ? 'page.subtitleAdmin' : 'page.subtitleOrganizer')}</p>
			</div>
			{body}
		</div>
	);
};

export default Inbox;
