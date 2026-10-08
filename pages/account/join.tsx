import { useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import { ROUTES } from '../../libs/routes';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common'])),
	},
});

/** The old combined page: sign in and sign up now have their own routes. */
const Join: NextPage = () => {
	const router = useRouter();
	useEffect(() => {
		router.replace(ROUTES.login);
	}, [router]);
	return null;
};

export default withLayoutBasic(Join);
