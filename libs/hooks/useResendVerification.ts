import { useCallback, useEffect, useState } from 'react';
import { useReactiveVar } from '@apollo/client';
import { ApiError, RATE_LIMITED } from '../errors';
import { refreshProfile, RESEND_COOLDOWN_MS, resendUntilVar, resendVerificationEmail } from '../auth/emailAuth';

export type ResendStatus = 'idle' | 'sent' | 'already' | 'rateLimited' | 'failed';

/**
 * "Send the confirmation link again" with a cooldown. The cooldown is shared (one reactive var), so the banner, the
 * sign-up panel and the verify page agree, and it also counts down after the link that was sent at sign-up.
 * A RATE_LIMITED answer sets the cooldown to the server's `retryAfterSeconds`.
 */
export default function useResendVerification() {
	const until = useReactiveVar(resendUntilVar);
	const [now, setNow] = useState(() => Date.now());
	const [busy, setBusy] = useState(false);
	const [status, setStatus] = useState<ResendStatus>('idle');
	const secondsLeft = Math.max(0, Math.ceil((until - now) / 1000));

	useEffect(() => {
		if (until <= Date.now()) return undefined;
		setNow(Date.now());
		const timer = setInterval(() => {
			setNow(Date.now());
			if (Date.now() >= until) clearInterval(timer);
		}, 500);
		return () => clearInterval(timer);
	}, [until]);

	const send = useCallback(async () => {
		if (busy || Date.now() < resendUntilVar()) return;
		setBusy(true);
		setStatus('idle');
		try {
			const result = await resendVerificationEmail();
			resendUntilVar(Date.now() + RESEND_COOLDOWN_MS);
			setStatus(result === 'already' ? 'already' : 'sent');
			if (result === 'already') await refreshProfile();
		} catch (err) {
			const error = err as ApiError;
			if (error.code === RATE_LIMITED) {
				resendUntilVar(Date.now() + (error.retryAfterSeconds ?? RESEND_COOLDOWN_MS / 1000) * 1000);
				setStatus('rateLimited');
			} else setStatus('failed');
		} finally {
			setBusy(false);
		}
	}, [busy]);

	return { send, busy, status, secondsLeft };
}
