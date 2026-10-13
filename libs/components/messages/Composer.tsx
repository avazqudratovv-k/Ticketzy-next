import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import useIsomorphicLayoutEffect from '../../hooks/useIsomorphicLayoutEffect';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { PaperPlaneTilt } from 'phosphor-react';
import { MESSAGE_MAX_LENGTH } from '../../messaging/format';

/** Unsent text per conversation, so switching threads does not lose what was typed. */
const drafts = new Map<string, string>();
/** The counter shows once the text is this close to the limit. */
const COUNTER_FROM = 1800;

interface Props {
	conversationId: string;
	/** A message is on its way: Send is disabled until the server answers. */
	sending: boolean;
	onSend: (body: string) => void;
	onTyping: (active: boolean) => void;
}

/** Multi-line input: Enter sends, Shift+Enter adds a line (design: the form under the thread). */
const Composer = ({ conversationId, sending, onSend, onTyping }: Props) => {
	const { t } = useTranslation('messages');
	const [value, setValue] = useState(() => drafts.get(conversationId) ?? '');
	const field = useRef<HTMLTextAreaElement>(null);
	const empty = value.trim().length === 0;

	// The field grows with its text, up to about six lines.
	useIsomorphicLayoutEffect(() => {
		const el = field.current;
		if (!el) return;
		el.style.height = 'auto';
		el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
	}, [value]);

	useEffect(() => {
		if (value) drafts.set(conversationId, value);
		else drafts.delete(conversationId);
	}, [conversationId, value]);

	const submit = () => {
		if (empty || sending) return;
		onSend(value);
		setValue('');
		onTyping(false);
		field.current?.focus();
	};

	const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		// Enter that confirms an IME composition (Korean, Japanese) must not send
		if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
		event.preventDefault();
		submit();
	};

	return (
		<form
			className="msgs-composer"
			onSubmit={(event) => {
				event.preventDefault();
				submit();
			}}
		>
			<div className="msgs-composer__field">
				<label className="tz-sr" htmlFor={`msg-${conversationId}`}>
					{t('composer.label')}
				</label>
				<textarea
					id={`msg-${conversationId}`}
					ref={field}
					className="tz-input"
					rows={2}
					value={value}
					maxLength={MESSAGE_MAX_LENGTH}
					placeholder={t('composer.placeholder')}
					aria-describedby={`msg-hint-${conversationId}`}
					onChange={(event) => {
						setValue(event.target.value);
						onTyping(event.target.value.trim().length > 0);
					}}
					onKeyDown={onKeyDown}
					onBlur={() => onTyping(false)}
				/>
				<p id={`msg-hint-${conversationId}`} className="msgs-composer__hint">
					<span>{t('composer.hint')}</span>
					{value.length >= COUNTER_FROM && (
						<span className={value.length >= MESSAGE_MAX_LENGTH ? 'is-full' : undefined} aria-live="polite">
							{t('composer.counter', { count: value.length, max: MESSAGE_MAX_LENGTH })}
						</span>
					)}
				</p>
			</div>
			<Button
				type="submit"
				variant="contained"
				className={`msgs-composer__send${!sending && empty ? ' tz-blocked' : ''}`}
				disabled={sending}
				aria-disabled={!sending && empty ? true : undefined}
				startIcon={<PaperPlaneTilt size={20} aria-hidden="true" />}
			>
				{sending ? t('composer.sending') : t('composer.send')}
			</Button>
		</form>
	);
};

export default Composer;
