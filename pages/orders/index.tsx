import { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Receipt } from 'phosphor-react';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import Seo from '../../libs/components/common/Seo';
import StateBlock from '../../libs/components/states/StateBlock';
import { useRequireAuth } from '../../libs/auth/guards';
import { ROUTES } from '../../libs/routes';

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
	props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'events', 'checkout'])) },
});

/** Placeholder: order history comes with the next prompt. */
const Orders: NextPage = () => {
	const { t } = useTranslation('checkout');
	const { allowed } = useRequireAuth();
	if (!allowed) return null;
	return (
		<div className="tz-container checkout">
			<Seo title={t('orders.title')} noindex />
			<h1 className="checkout__title">{t('orders.title')}</h1>
			<StateBlock
				icon={<Receipt size={28} />}
				title={t('orders.placeholderTitle')}
				text={t('orders.placeholderText')}
				actions={
					<Button component={Link} href={ROUTES.events} variant="outlined">
						{t('page.browse')}
					</Button>
				}
			/>
		</div>
	);
};

export default withLayoutBasic(Orders);
