import { useEffect, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import { Timer } from 'phosphor-react';
import { formatCountdown, useRemainingMs } from '../../seats/clock';

interface Props {
	/** Server deadline (ISO) */
	deadline: string | null | undefined;
	title: string;
	text?: string;
	onExpire?: () => void;
}

/** "0:23 left" box (design: warning tone with a clock). Counts from the server deadline, corrected for clock skew. */
const Countdown = ({ deadline, title, text, onExpire }: Props) => {
	const { t } = useTranslation('checkout');
	const remaining = useRemainingMs(deadline);
	const fired = useRef<string | null>(null);

	useEffect(() => {
		if (!deadline || remaining === null || remaining > 0) return;
		if (fired.current === deadline) return;
		fired.current = deadline;
		onExpire?.();
	}, [deadline, remaining, onExpire]);

	if (!deadline || remaining === null) return null;
	const seconds = Math.ceil(remaining / 1000);
	// Screen readers hear a few milestones, not every tick
	const announce = [30, 10, 5, 0].includes(seconds) ? t('countdown.announce', { count: seconds }) : '';
	const urgent = seconds <= 10;

	return (
		<div className={`countdown${urgent ? ' is-urgent' : ''}`}>
			<span className="countdown__icon" aria-hidden="true">
				<Timer size={20} />
			</span>
			<div>
				<p className="countdown__title">
					<time role="timer" aria-live="off" dateTime={`PT${seconds}S`}>
						{formatCountdown(remaining)}
					</time>{' '}
					{title}
				</p>
				{text && <p className="countdown__text">{text}</p>}
			</div>
			<span className="tz-sr" role="status" aria-live="polite">
				{announce}
			</span>
		</div>
	);
};

export default Countdown;
