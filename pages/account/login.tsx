import { NextPage } from 'next';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import LoginForm from '../../libs/components/auth/LoginForm';
import useRedirectIfSignedIn from '../../libs/hooks/useRedirectIfSignedIn';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common', 'auth'])),
	},
});

const Login: NextPage = () => {
	const { t } = useTranslation('auth');
	useRedirectIfSignedIn();

	return (
		<>
			<Head>
				<title>{`${t('login.pageTitle')} · Ticketzy`}</title>
			</Head>
			<div className="pg-auth">
				<div className="pg-auth__head">
					<h1>{t('login.title')}</h1>
					<p>{t('login.subtitle')}</p>
				</div>
				<LoginForm />
			</div>
		</>
	);
};

export default withLayoutBasic(Login);
