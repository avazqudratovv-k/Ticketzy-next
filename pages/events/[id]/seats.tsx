import { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { Armchair } from 'phosphor-react';
import withLayoutBasic from '../../../libs/components/layout/LayoutBasic';
import Seo from '../../../libs/components/common/Seo';
import StateBlock from '../../../libs/components/states/StateBlock';
import { eventUrl } from '../../../libs/routes';

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
	props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'events'])) },
});

/** Placeholder: the seat map and ticket selection come with the next prompt. */
const Seats: NextPage = () => {
	const { t } = useTranslation('events');
	const { query } = useRouter();
	const id = typeof query.id === 'string' ? query.id : '';
	return (
		<div className="tz-container event">
			<Seo title={t('seats.title')} noindex />
			<StateBlock
				icon={<Armchair size={28} />}
				title={t('seats.title')}
				text={t('seats.text')}
				actions={
					<Button component={Link} href={eventUrl(id)} variant="outlined">
						{t('seats.back')}
					</Button>
				}
			/>
		</div>
	);
};

export default withLayoutBasic(Seats);
