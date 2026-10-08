import { NextPage } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import withAdminLayout from '../../libs/components/layout/LayoutAdmin';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common'])),
	},
});

/** Shell only: the dashboard content comes in a later phase. */
const Overview: NextPage = () => {
	const { t } = useTranslation('common');
	return (
		<div className="tz-pagehead">
			<h1>{t('dashboard.adminOverviewTitle')}</h1>
			<p>{t('dashboard.comingSoon')}</p>
		</div>
	);
};

export default withAdminLayout(Overview);
