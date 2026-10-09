import { useEffect, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import { formatCountdown, useRemainingMs } from '../../seats/clock';

interface Props {
	/** Server deadline (ISO) */
	deadline: string | null | undefined;
	title: string;
	text?: string;
	/** Length of the hold in seconds, when known (the ring is then exact after a reload); otherwise the longest remaining time seen */
	totalSeconds?: number;
	onExpire?: () => void;
}

const RING_RADIUS = 19;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** "0:23 left" box with a ring that empties as the hold runs out and turns urgent in the last 10 seconds (design: warning tone with a clock). Counts from the server deadline, corrected for clock skew. */
const Countdown = ({ deadline, title, text, totalSeconds, onExpire }: Props) => {
	const { t } = useTranslation('checkout');
	const remaining = useRemainingMs(deadline);
	const fired = useRef<string | null>(null);
	const seen = useRef<{ deadline: string | null; max: number }>({ deadline: null, max: 0 });
	if (seen.current.deadline !== (deadline ?? null)) seen.current = { deadline: deadline ?? null, max: 0 };
	if (remaining !== null) seen.current.max = Math.max(seen.current.max, remaining);

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
	const total = totalSeconds ? Math.max(totalSeconds * 1000, remaining) : seen.current.max || 1;
	const progress = Math.min(1, remaining / total);

	return (
		<div className={`countdown${urgent ? ' is-urgent' : ''}`}>
			<span className="countdown__ring" aria-hidden="true">
				<svg viewBox="0 0 44 44">
					<circle className="countdown__track" cx="22" cy="22" r={RING_RADIUS} />
					<circle
						className="countdown__bar"
						cx="22"
						cy="22"
						r={RING_RADIUS}
						strokeDasharray={RING_LENGTH}
						strokeDashoffset={RING_LENGTH * (1 - progress)}
					/>
				</svg>
				<span className="countdown__secs">{seconds > 99 ? Math.ceil(seconds / 60) + 'm' : seconds}</span>
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
