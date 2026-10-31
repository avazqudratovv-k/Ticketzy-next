import { useEffect, useState } from 'react';
import { NextPage, GetStaticPropsContext } from 'next';
import { useRouter } from 'next/router';
import { useReactiveVar } from '@apollo/client';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Seo from '../../libs/components/common/Seo';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import SignupForm from '../../libs/components/auth/SignupForm';
import PendingPanel from '../../libs/components/auth/PendingPanel';
import CheckInboxPanel from '../../libs/components/auth/CheckInboxPanel';
import ResendVerification from '../../libs/components/auth/ResendVerification';
import useRedirectIfSignedIn from '../../libs/hooks/useRedirectIfSignedIn';
import { MemberType } from '../../libs/enums/member.enum';
import { signingUpVar } from '../../apollo/store';

export const getStaticProps = async ({ locale }: GetStaticPropsContext) => ({
	props: {
		...(await serverSideTranslations(locale ?? 'en', ['common', 'auth'])),
	},
});

const Signup: NextPage = () => {
	const { t } = useTranslation('auth');
	const router = useRouter();
	const [created, setCreated] = useState<MemberType.USER | MemberType.ORGANIZER | null>(null);
	// ?role=organizer comes from the footer's "Sell tickets" link. The query is only known after hydration, so the
	// first render is always the buyer form and the form is remounted if the link asked for an organizer.
	const [initialRole, setInitialRole] = useState<MemberType.USER | MemberType.ORGANIZER>(MemberType.USER);
	useEffect(() => {
		if (router.isReady && router.query.role === 'organizer') setInitialRole(MemberType.ORGANIZER);
	}, [router.isReady, router.query.role]);
	// A new member is signed in by signUp(); the hook must not send them on before they have seen "check your inbox"
	// (a buyer) or the approval notice (an organizer, who also needs to confirm the email).
	// The session exists a moment before the form reports "done", so the redirect also waits while the form is submitting.
	const signingUp = useReactiveVar(signingUpVar);
	useRedirectIfSignedIn(created !== null || signingUp);

	if (created === MemberType.ORGANIZER) {
		return (
			<div className="pg-auth">
				<PendingPanel>
					<p className="pg-pending__note">{t('checkInbox.organizerNote')}</p>
					<ResendVerification />
				</PendingPanel>
			</div>
		);
	}
	if (created === MemberType.USER) {
		return (
			<div className="pg-auth">
				<Seo title={t('checkInbox.pageTitle')} noindex />
				<CheckInboxPanel />
			</div>
		);
	}

	return (
		<>
			<Seo title={t('signup.pageTitle')} noindex />
			<div className="pg-auth pg-auth--wide">
				<div className="pg-auth__head">
					<h1>{t('signup.title')}</h1>
					<p>{t('signup.subtitle')}</p>
				</div>
				<SignupForm
					key={initialRole}
					initialRole={initialRole}
					onDone={(role) => setCreated(role)}
				/>
			</div>
		</>
	);
};

export default withLayoutBasic(Signup);
