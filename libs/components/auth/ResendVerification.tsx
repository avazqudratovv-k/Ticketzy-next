import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import useResendVerification from '../../hooks/useResendVerification';

interface Props {
	variant?: 'contained' | 'outlined';
}

/** "Resend link" with a cooldown and one line saying what happened (namespace `common`, keys `resend.*`). */
const ResendVerification = ({ variant = 'outlined' }: Props) => {
	const { t } = useTranslation('common');
	const { send, busy, status, secondsLeft } = useResendVerification();
	const waiting = secondsLeft > 0;

	return (
		<span className="tz-resend">
			<Button variant={variant} size="small" onClick={send} aria-disabled={busy || waiting ? true : undefined} className="tz-resend__btn">
				{busy ? t('resend.sending') : waiting ? t('resend.wait', { seconds: secondsLeft }) : t('resend.button')}
			</Button>
			<span className="tz-resend__note" role="status">
				{status !== 'idle' ? t(`resend.${status}`) : ''}
			</span>
		</span>
	);
};

export default ResendVerification;
