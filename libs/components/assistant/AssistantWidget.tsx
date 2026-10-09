import { KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useReactiveVar } from '@apollo/client';
import { useTranslation } from 'next-i18next';
import { ArrowsClockwise, CaretDown, ChatCircleDots, NotePencil, PaperPlaneTilt, X } from 'phosphor-react';
import {
	assistantVar,
	discardFailedQuestion,
	MAX_LENGTH,
	resetAssistant,
	retryAssistant,
	sendAssistantMessage,
	setAssistantOpen,
} from '../../assistant/store';
import { ASSISTANT_SLOW_AFTER_MS, isRetryable } from '../../assistant/errors';
import { renderAnswer } from '../../assistant/richText';
import AssistantCard from './AssistantCard';

const SUGGESTIONS = ['comedy', 'refunds', 'cheapest', 'seats'] as const;
/** The counter shows once the text is this close to the limit. */
const COUNTER_FROM = 800;
const PHONE_QUERY = '(max-width: 767px)';
/** Pages with their own bottom sheet on small screens: the button steps aside there. */
const TIGHT_ROUTES = ['/events/[id]/seats', '/checkout/[orderId]'];

/** Unsent text, so closing the panel or changing page does not lose it. */
let draftText = '';

const isPhone = () => typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches;

const FOCUSABLE = 'button:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/** The floating "Ask Ticketzy" button and its chat panel (design: ChatStart, ChatThinking, ChatResults). */
const AssistantWidget = () => {
	const { t } = useTranslation('common');
	const { locale, pathname } = useRouter();
	const { messages, pending, pendingSince, error, open } = useReactiveVar(assistantVar);
	const [text, setText] = useState(draftText);
	const [slow, setSlow] = useState(false);
	const panel = useRef<HTMLElement>(null);
	const log = useRef<HTMLDivElement>(null);
	const field = useRef<HTMLTextAreaElement>(null);
	const fab = useRef<HTMLButtonElement>(null);
	// the previous value, so a panel that is already open after a page change does not grab the focus again
	const wasOpen = useRef(open);

	const trimmed = text.trim();
	const tooLong = text.length > MAX_LENGTH;
	const canSend = trimmed.length > 0 && !tooLong && !pending;
	const empty = messages.length === 0;

	useEffect(() => {
		draftText = text;
	}, [text]);

	// The field grows with its text, up to about five lines.
	useLayoutEffect(() => {
		const el = field.current;
		if (!el) return;
		el.style.height = 'auto';
		el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
	}, [text, open]);

	// Focus goes into the panel on open and back to the button on close.
	useEffect(() => {
		if (open && !wasOpen.current) field.current?.focus();
		if (!open && wasOpen.current) fab.current?.focus();
		wasOpen.current = open;
	}, [open]);

	// Newest message in view.
	useEffect(() => {
		const el = log.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [messages.length, pending, slow, error, open]);

	// "Taking a while" note while an answer is on its way.
	useEffect(() => {
		setSlow(false);
		if (!pending || !pendingSince) return;
		const timer = setTimeout(() => setSlow(true), Math.max(0, ASSISTANT_SLOW_AFTER_MS - (Date.now() - pendingSince)));
		return () => clearTimeout(timer);
	}, [pending, pendingSince]);

	// The phone sheet covers the page: it does not scroll behind it.
	useEffect(() => {
		if (!open || !isPhone()) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	}, [open]);

	const close = () => setAssistantOpen(false);

	// Escape closes the panel wherever the focus is (it is not a modal on desktop, so the focus can be on the page).
	useEffect(() => {
		if (!open) return;
		const onKey = (event: globalThis.KeyboardEvent) => {
			if (event.key === 'Escape' && !event.defaultPrevented) setAssistantOpen(false);
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [open]);

	const send = (value: string) => {
		if (!sendAssistantMessage(value, locale)) return;
		setText('');
		field.current?.focus();
	};

	const onPanelKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		// On a phone the sheet is the whole screen, so Tab stays inside it.
		if (event.key === 'Tab' && isPhone() && panel.current) {
			const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
			if (!items.length) return;
			const first = items[0];
			const last = items[items.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		}
	};

	const onFieldKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		// Enter that confirms an IME composition (Korean, Japanese) must not send; 229 is the legacy composition key code
		if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing || event.keyCode === 229) return;
		event.preventDefault();
		if (canSend) send(text);
	};

	// A card opens an event page: on a phone the sheet would hide it, so it closes; on desktop it stays.
	const onNavigate = () => {
		if (isPhone()) close();
	};

	const tight = TIGHT_ROUTES.includes(pathname);
	const errorText = error ? t(`assistant.errors.${error}`) : '';

	return (
		<div className={`pg-chat${open ? ' is-open' : ''}${tight ? ' pg-chat--tight' : ''}`}>
			{open && (
				<section
					ref={panel}
					className="pg-chatpanel"
					role="dialog"
					aria-label={t('assistant.title')}
					aria-modal={isPhone() ? true : undefined}
					onKeyDown={onPanelKeyDown}
				>
					<header className="pg-chatpanel__head">
						<span className="tz-avatar pg-chatpanel__avatar" aria-hidden="true">
							<ChatCircleDots size={22} weight="fill" />
						</span>
						<div className="pg-chatpanel__heading">
							<h2 className="pg-chatpanel__title">{t('assistant.title')}</h2>
							<p className="pg-chatpanel__note">{t('assistant.note')}</p>
						</div>
						<button
							type="button"
							className="pg-iconbtn"
							onClick={() => resetAssistant()}
							disabled={empty && !error}
							aria-label={t('assistant.newChat')}
							title={t('assistant.newChat')}
						>
							<NotePencil size={20} aria-hidden="true" />
						</button>
						<button type="button" className="pg-iconbtn" onClick={close} aria-label={t('assistant.close')} title={t('assistant.close')}>
							<X size={20} aria-hidden="true" />
						</button>
					</header>

					<div ref={log} className="pg-chatpanel__log" role="log" aria-label={t('assistant.log')} aria-live="polite" aria-relevant="additions text">
						<div className="pg-msg pg-msg--bot">
							<span className="pg-msg__who">{t('assistant.assistant')}</span>
							<p>{t('assistant.greeting')}</p>
						</div>

						{empty && (
							<div className="pg-suggest" role="group" aria-label={t('assistant.suggestions')}>
								{SUGGESTIONS.map((key) => (
									<button key={key} type="button" className="pg-suggest__chip" disabled={pending} onClick={() => send(t(`assistant.suggest.${key}`))}>
										{t(`assistant.suggest.${key}`)}
									</button>
								))}
							</div>
						)}

						{messages.map((message) =>
							message.role === 'user' ? (
								<div key={message.id} className="pg-msg pg-msg--me">
									<span className="pg-msg__who">{t('assistant.you')}</span>
									<p className="pg-msg__text">{message.content}</p>
								</div>
							) : (
								<div key={message.id} className="pg-turn">
									<div className="pg-msg pg-msg--bot">
										<span className="pg-msg__who">{t('assistant.assistant')}</span>
										<div className="pg-msg__rich">{renderAnswer(message.content, onNavigate)}</div>
									</div>
									{message.events && (
										<div className="pg-chatcards">
											{message.events.map((event) => (
												<AssistantCard key={event._id} event={event} onNavigate={onNavigate} />
											))}
										</div>
									)}
								</div>
							),
						)}

						{pending && (
							<div className="pg-msg pg-msg--bot pg-msg--thinking">
								<span className="pg-msg__who">{t('assistant.assistant')}</span>
								<span className="pg-thinking" aria-hidden="true">
									<i />
									<i />
									<i />
								</span>
								<span className="tz-sr">{t('assistant.thinking')}</span>
								{slow && <p className="pg-msg__slow">{t('assistant.slow')}</p>}
							</div>
						)}

						{error && (
							<div className="pg-msg pg-msg--error" role="alert">
								<p>{errorText}</p>
								<div className="pg-msg__actions">
									{isRetryable(error) ? (
										<button type="button" className="pg-textbtn" onClick={() => retryAssistant(locale)}>
											<ArrowsClockwise size={16} aria-hidden="true" />
											{t('assistant.retry')}
										</button>
									) : (
										<button type="button" className="pg-textbtn" onClick={discardFailedQuestion}>
											{t('assistant.dismiss')}
										</button>
									)}
								</div>
							</div>
						)}
					</div>

					<form
						className="pg-chatpanel__form"
						onSubmit={(event) => {
							event.preventDefault();
							if (canSend) send(text);
						}}
					>
						<div className="pg-chatpanel__field">
							<label className="tz-sr" htmlFor="assistant-input">
								{t('assistant.inputLabel')}
							</label>
							<textarea
								id="assistant-input"
								ref={field}
								className="tz-input pg-chatpanel__input"
								rows={1}
								value={text}
								placeholder={t('assistant.placeholder')}
								aria-describedby="assistant-hint"
								aria-invalid={tooLong || undefined}
								onChange={(event) => setText(event.target.value)}
								onKeyDown={onFieldKeyDown}
							/>
							<p id="assistant-hint" className={`pg-chatpanel__hint${tooLong || text.length >= COUNTER_FROM ? '' : ' is-plain'}`}>
								<span>{tooLong ? t('assistant.tooLong', { max: MAX_LENGTH }) : t('assistant.hint')}</span>
								{text.length >= COUNTER_FROM && (
									<span className={tooLong ? 'is-over' : undefined}>{t('assistant.counter', { count: text.length, max: MAX_LENGTH })}</span>
								)}
							</p>
						</div>
						<button type="submit" className="pg-sendbtn" disabled={!canSend} aria-label={t('assistant.send')} title={t('assistant.send')}>
							<PaperPlaneTilt size={20} weight="fill" aria-hidden="true" />
						</button>
					</form>
				</section>
			)}

			<button
				ref={fab}
				type="button"
				className="pg-fab"
				aria-expanded={open}
				aria-haspopup="dialog"
				onClick={() => setAssistantOpen(!open)}
			>
				{open ? <CaretDown size={22} aria-hidden="true" /> : <ChatCircleDots size={24} weight="fill" aria-hidden="true" />}
				{open ? t('assistant.hide') : t('assistant.fab')}
			</button>
		</div>
	);
};

export default AssistantWidget;
