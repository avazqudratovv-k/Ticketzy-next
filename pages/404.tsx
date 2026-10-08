import { NextPage } from 'next';
import Link from 'next/link';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import withLayoutBasic from '../libs/components/layout/LayoutBasic';
import { ROUTES } from '../libs/routes';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common'])),
	},
});

const NotFound: NextPage = () => {
	const { t } = useTranslation('common');
	return (
		<div className="pg-auth">
			<div className="pg-auth__head">
				<h1>{t('notFound.title')}</h1>
				<p>{t('notFound.text')}</p>
			</div>
			<div>
				<Button component={Link} href={ROUTES.home} variant="outlined">
					{t('notFound.back')}
				</Button>
			</div>
		</div>
	);
};

export default withLayoutBasic(NotFound);
