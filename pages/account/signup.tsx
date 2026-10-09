import { useEffect, useState } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Seo from '../../libs/components/common/Seo';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import SignupForm from '../../libs/components/auth/SignupForm';
import PendingPanel from '../../libs/components/auth/PendingPanel';
import useRedirectIfSignedIn from '../../libs/hooks/useRedirectIfSignedIn';
import { MemberType } from '../../libs/enums/member.enum';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common', 'auth'])),
	},
});

const Signup: NextPage = () => {
	const { t } = useTranslation('auth');
	const router = useRouter();
	const [organizerCreated, setOrganizerCreated] = useState(false);
	// ?role=organizer comes from the footer's "Sell tickets" link. The query is only known after hydration, so the
	// first render is always the buyer form and the form is remounted if the link asked for an organizer.
	const [initialRole, setInitialRole] = useState<MemberType.USER | MemberType.ORGANIZER>(MemberType.USER);
	useEffect(() => {
		if (router.isReady && router.query.role === 'organizer') setInitialRole(MemberType.ORGANIZER);
	}, [router.isReady, router.query.role]);
	// A new buyer is signed in by signUp() and the hook sends them on; a new organizer sees the approval notice first.
	useRedirectIfSignedIn(organizerCreated);

	if (organizerCreated) {
		return (
			<div className="pg-auth">
				<PendingPanel />
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
					onDone={(role) => setOrganizerCreated(role === MemberType.ORGANIZER)}
				/>
			</div>
		</>
	);
};

export default withLayoutBasic(Signup);
