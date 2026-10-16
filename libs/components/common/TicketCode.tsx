import { useEffect, useRef, useState } from 'react';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { Check, Copy } from 'phosphor-react';
import { formatTicketCode, normalizeTicketCode, spokenTicketCode } from '../../ticketCode';

interface Props {
	code: string;
	/** adds a button that copies the plain code (no spaces) */
	copy?: boolean;
	className?: string;
}

/**
 * The ticket code in groups of 4 ("A3F9 12BC ..."). Screen readers get the characters one by one in the same groups
 * (a 20-character word would be read as nonsense); the copy button always copies the plain code.
 * Uses the `common` namespace for the button texts, which every page loads.
 */
const TicketCode = ({ code, copy = false, className }: Props) => {
	const { t } = useTranslation('common');
	const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
	const timer = useRef<ReturnType<typeof setTimeout>>();
	useEffect(() => () => clearTimeout(timer.current), []);

	const onCopy = async () => {
		try {
			await navigator.clipboard.writeText(normalizeTicketCode(code));
			setState('copied');
		} catch {
			setState('failed');
		}
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setState('idle'), 2400);
	};

	return (
		<span className={`tz-tcode ${className ?? ''}`}>
			<code>
				<span aria-hidden="true">{formatTicketCode(code)}</span>
				<span className="tz-sr">{spokenTicketCode(code)}</span>
			</code>
			{copy && (
				<>
					<Button
						type="button"
						size="small"
						variant="text"
						className="tz-tcode__copy"
						startIcon={state === 'copied' ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
						onClick={() => void onCopy()}
					>
						{t('ticketCode.copy')}
					</Button>
					<span className="tz-sr" role="status">
						{state === 'copied' ? t('ticketCode.copied') : state === 'failed' ? t('ticketCode.failed') : ''}
					</span>
					{state !== 'idle' && (
						<span className="tz-tcode__note" aria-hidden="true">
							{state === 'copied' ? t('ticketCode.copied') : t('ticketCode.failed')}
						</span>
					)}
				</>
			)}
		</span>
	);
};

export default TicketCode;
