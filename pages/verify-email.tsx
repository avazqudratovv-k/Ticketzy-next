import { useCallback, useEffect, useRef, useState } from 'react';
import { NextPage, GetStaticPropsContext } from 'next';
import Link from 'next/link';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { CheckCircle, EnvelopeSimple, WarningCircle } from 'phosphor-react';
import Seo from '../libs/components/common/Seo';
import NoReferrer from '../libs/components/common/NoReferrer';
import withLayoutBasic from '../libs/components/layout/LayoutBasic';
import StatusScreen, { WorkingScreen } from '../libs/components/auth/StatusScreen';
import ResendVerification from '../libs/components/auth/ResendVerification';
import useAuth from '../libs/hooks/useAuth';
import useLinkToken from '../libs/hooks/useLinkToken';
import { refreshProfile, verifyEmailToken } from '../libs/auth/emailAuth';
import { INVALID_OR_EXPIRED_TOKEN, RATE_LIMITED } from '../libs/errors';
import { MemberType } from '../libs/enums/member.enum';
import { homeFor, loginUrl, ROUTES } from '../libs/routes';

export const getStaticProps = async ({ locale }: GetStaticPropsContext) => ({
	props: {
		...(await serverSideTranslations(locale ?? 'en', ['common', 'auth'])),
	},
});

type Outcome = 'working' | 'verified' | 'changed' | 'invalid' | 'missing' | 'limited' | 'failed';

/** Opened from the confirmation or email-change link: spends the token once, then says what happened. */
const VerifyEmail: NextPage = () => {
	const { t } = useTranslation('auth');
	const { user, ready } = useAuth();
	const { ready: tokenRead, token } = useLinkToken();
	const [outcome, setOutcome] = useState<Outcome>('working');
	// The token is spent by the first request: a second one (strict mode's second effect, a double click on Retry) would find it used
	const running = useRef(false);

	const run = useCallback(async () => {
		if (!token || running.current) return;
		running.current = true;
		setOutcome('working');
		try {
			setOutcome(await verifyEmailToken(token));
		} catch (err) {
			const { code } = err as { code?: string };
			setOutcome(code === INVALID_OR_EXPIRED_TOKEN ? 'invalid' : code === RATE_LIMITED ? 'limited' : 'failed');
		} finally {
			running.current = false;
		}
	}, [token]);

	useEffect(() => {
		if (!tokenRead) return;
		if (!token) setOutcome('missing');
		else run();
	}, [tokenRead, token, run]);

	// The profile in the header and the banner must know the address is confirmed (or changed) now
	const refreshed = useRef(false);
	useEffect(() => {
		if ((outcome === 'verified' || outcome === 'changed') && ready && user && !refreshed.current) {
			refreshed.current = true;
			refreshProfile();
		}
	}, [outcome, ready, user]);

	const onward = user ? (
		<Button component={Link} href={user.memberType === MemberType.USER ? ROUTES.events : homeFor(user)} variant="contained">
			{user.memberType === MemberType.USER ? t('verify.browse') : t('verify.toDashboard')}
		</Button>
	) : (
		<Button component={Link} href={loginUrl(ROUTES.events)} variant="contained">
			{t('verify.logIn')}
		</Button>
	);

	let screen;
	if (outcome === 'working') {
		screen = <WorkingScreen title={t('verify.working')} />;
	} else if (outcome === 'verified') {
		screen = (
			<StatusScreen tone="success" icon={<CheckCircle size={32} weight="fill" aria-hidden="true" />} title={t('verify.doneTitle')} text={t('verify.doneText')}>
				<div className="pg-pending__actions">{onward}</div>
			</StatusScreen>
		);
	} else if (outcome === 'changed') {
		screen = (
			<StatusScreen tone="success" icon={<CheckCircle size={32} weight="fill" aria-hidden="true" />} title={t('verify.changedTitle')} text={t('verify.changedText')}>
				<div className="pg-pending__actions">{user ? <Button component={Link} href={ROUTES.settings} variant="contained">{t('verify.toSettings')}</Button> : onward}</div>
			</StatusScreen>
		);
	} else if (outcome === 'limited' || outcome === 'failed') {
		screen = (
			<StatusScreen
				tone="danger"
				icon={<WarningCircle size={32} weight="fill" aria-hidden="true" />}
				title={outcome === 'limited' ? t('verify.limitedTitle') : t('verify.failedTitle')}
				text={outcome === 'limited' ? t('verify.limitedText') : t('verify.failedText')}
			>
				<div className="pg-pending__actions">
					<Button variant="contained" onClick={run}>
						{t('verify.retry')}
					</Button>
				</div>
			</StatusScreen>
		);
	} else {
		// Expired, used or incomplete link. A signed-in member whose address is still unconfirmed can ask for a new one right here.
		const needsLink = Boolean(user) && user?.emailVerified === false;
		screen = (
			<StatusScreen
				tone="danger"
				icon={<EnvelopeSimple size={32} aria-hidden="true" />}
				title={outcome === 'missing' ? t('verify.missingTitle') : t('verify.invalidTitle')}
				text={outcome === 'missing' ? t('verify.missingText') : t('verify.invalidText')}
			>
				{needsLink && <ResendVerification variant="contained" />}
				{user?.emailVerified === true && <p className="pg-pending__note">{t('verify.alreadyConfirmed')}</p>}
				{!user && <p className="pg-pending__note">{t('verify.invalidLogIn')}</p>}
				<div className="pg-pending__actions">{needsLink ? null : onward}</div>
			</StatusScreen>
		);
	}

	return (
		<>
			<Seo title={t('verify.pageTitle')} noindex />
			<NoReferrer />
			<div className="pg-auth">{screen}</div>
		</>
	);
};

export default withLayoutBasic(VerifyEmail);
