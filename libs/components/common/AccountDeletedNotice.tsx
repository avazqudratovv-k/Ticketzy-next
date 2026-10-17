import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useReactiveVar } from '@apollo/client';
import { Button, Dialog } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { accountDeletedVar } from '../../../apollo/store';
import { logOut } from '../../auth';
import { pauseSessionExpiry } from '../../auth/sessionExpired';
import { ROUTES } from '../../routes';
import Logo from './Logo';

/** How long the window stays: the organizer's goodbye is calm and a little longer, the buyer's message is short. */
const SHOW_MS = { ORGANIZER: 3200, USER: 2400 } as const;

/**
 * Mounted once in `_app` (F364). After `deleteMyAccount` succeeds the settings page sets `accountDeletedVar`; this window then
 * shows for a few seconds (organizer: "Thank you for organizing with Ticketzy." with the logo gently waving goodbye; buyer: "Your
 * account has been deleted."), and only then signs out and goes to the home page. The server already refuses the old token, so
 * `pauseSessionExpiry` keeps a stray 401 from ending the session (and redirecting to login) while the window is up.
 * Enter on the button, Escape and a click outside end it at once. Motion is transform and opacity only; reduced motion: plain fade.
 */
const AccountDeletedNotice = () => {
	const { t } = useTranslation('common');
	const router = useRouter();
	const state = useReactiveVar(accountDeletedVar);
	const [role, setRole] = useState<'USER' | 'ORGANIZER'>('USER');
	const leaving = useRef(false);

	const finish = useCallback(async () => {
		if (leaving.current) return;
		leaving.current = true;
		// Leave the page first so a guard does not bounce to the login screen with a returnTo
		await router.replace(ROUTES.home);
		logOut();
		accountDeletedVar(null);
		// the sign-out refetch and the home page's first queries still answer with the old token's errors
		window.setTimeout(() => pauseSessionExpiry(false), 2000);
		leaving.current = false;
	}, [router]);

	useEffect(() => {
		if (!state) return undefined;
		setRole(state.role);
		const timer = window.setTimeout(() => void finish(), SHOW_MS[state.role]);
		return () => window.clearTimeout(timer);
	}, [state, finish]);

	const organizer = role === 'ORGANIZER';
	return (
		<Dialog
			open={Boolean(state)}
			onClose={() => void finish()}
			maxWidth="xs"
			fullWidth
			aria-labelledby="bye-title"
			aria-describedby="bye-text"
			className="tz-bye"
			PaperProps={{ className: `tz-bye__paper${organizer ? ' tz-bye__paper--wave' : ''}` }}
		>
			<div className="tz-bye__body">
				<span className="tz-bye__logo" aria-hidden="true">
					<Logo size={72} />
				</span>
				<h2 id="bye-title" className="tz-bye__title">
					{t(organizer ? 'accountDeleted.organizer.title' : 'accountDeleted.buyer.title')}
				</h2>
				<p id="bye-text" className="tz-bye__text">
					{t(organizer ? 'accountDeleted.organizer.text' : 'accountDeleted.buyer.text')}
				</p>
				{organizer && <p className="tz-bye__sub">{t('accountDeleted.organizer.sub')}</p>}
				<Button variant="outlined" onClick={() => void finish()} autoFocus>
					{t('accountDeleted.continue')}
				</Button>
			</div>
		</Dialog>
	);
};

export default AccountDeletedNotice;
