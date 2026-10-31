import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@mui/material';
import { EnvelopeSimple } from 'phosphor-react';
import { useTranslation } from 'next-i18next';
import useAuth from '../../hooks/useAuth';
import { homeFor, safeReturnTo } from '../../routes';
import ResendVerification from './ResendVerification';

/** After sign-up: "Check your inbox to confirm your email", with Resend (cooldown) and the way on. */
const CheckInboxPanel = () => {
	const { t } = useTranslation('auth');
	const { user } = useAuth();
	const router = useRouter();
	const next = safeReturnTo(router.query.returnTo) || (user ? homeFor(user) : '/');
	return (
		<div className="pg-pending" role="status">
			<span className="pg-pending__icon pg-pending__icon--info">
				<EnvelopeSimple size={32} aria-hidden="true" />
			</span>
			<h1>{t('checkInbox.title')}</h1>
			<p>{user?.memberEmail ? t('checkInbox.textTo', { email: user.memberEmail }) : t('checkInbox.text')}</p>
			<p className="pg-pending__note">{t('checkInbox.spam')}</p>
			<ResendVerification />
			<div className="pg-pending__actions">
				<Button component={Link} href={next} variant="contained">
					{t('checkInbox.continue')}
				</Button>
			</div>
			<p className="pg-pending__note">{t('checkInbox.browseNote')}</p>
		</div>
	);
};

export default CheckInboxPanel;
