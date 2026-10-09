import { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Storefront } from 'phosphor-react';
import withLayoutBasic from '../libs/components/layout/LayoutBasic';
import Seo from '../libs/components/common/Seo';
import StateBlock from '../libs/components/states/StateBlock';
import useAuth from '../libs/hooks/useAuth';
import { logOut } from '../libs/auth';
import { MemberType } from '../libs/enums/member.enum';
import { ROUTES } from '../libs/routes';

export const getStaticProps = async ({ locale }: any) => ({
	props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'auth'])) },
});

/** Footer "Sell tickets": says what applies to the current session. Organizer accounts are separate from buyer accounts. */
const Sell: NextPage = () => {
	const { t } = useTranslation('auth');
	const router = useRouter();
	const { user, ready } = useAuth();
	const signupHref = `${ROUTES.signup}?role=organizer`;

	const registerAsOrganizer = async () => {
		// Leave first, then clear the session, so no guarded page bounces to the login screen.
		await router.push(signupHref);
		logOut();
	};

	let lead = t('sell.outLead');
	let actions: React.ReactNode = (
		<Button component={Link} href={signupHref} variant="contained">
			{t('sell.outAction')}
		</Button>
	);
	if (user?.memberType === MemberType.USER) {
		lead = `${t('sell.buyerLead')} ${t('sell.buyerSteps')}`;
		actions = (
			<>
				<Button variant="contained" onClick={registerAsOrganizer}>
					{t('sell.buyerAction')}
				</Button>
				<Button component={Link} href={ROUTES.home} variant="outlined">
					{t('sell.buyerStay')}
				</Button>
			</>
		);
	} else if (user?.memberType === MemberType.ORGANIZER) {
		lead = t('sell.organizerLead');
		actions = (
			<Button component={Link} href={ROUTES.organizerDashboard} variant="contained">
				{t('sell.toDashboard')}
			</Button>
		);
	} else if (user?.memberType === MemberType.ADMIN) {
		lead = t('sell.adminLead');
		actions = (
			<Button component={Link} href={ROUTES.adminDashboard} variant="contained">
				{t('sell.toAdmin')}
			</Button>
		);
	}

	return (
		<div className="tz-container" style={{ paddingBlock: 'var(--space-12)' }}>
			<Seo title={t('sell.pageTitle')} />
			{ready && <StateBlock as="h1" icon={<Storefront size={28} />} title={t('sell.title')} text={lead} actions={actions} />}
		</div>
	);
};

export default withLayoutBasic(Sell);
