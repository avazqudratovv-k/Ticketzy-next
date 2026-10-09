import { NextPage } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import withLayoutBasic from '../libs/components/layout/LayoutBasic';
import Seo from '../libs/components/common/Seo';
import ErrorScreen from '../libs/components/states/ErrorScreen';

export const getStaticProps = async ({ locale }: any) => ({
	props: { ...(await serverSideTranslations(locale ?? 'en', ['common'])) },
});

const ServerError: NextPage = () => {
	const { t } = useTranslation('common');
	return (
		<>
			<Seo title={t('errors.serverTitle')} noindex />
			<ErrorScreen kind="server" />
		</>
	);
};

export default withLayoutBasic(ServerError);
