import { NextPage } from 'next';
import { Stack } from '@mui/material';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import withLayoutMain from '../libs/components/layout/LayoutHome';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common'])),
	},
});

const Home: NextPage = () => {
	return (
		<Stack className={'home-page'} sx={{ minHeight: '60vh', pt: '160px', alignItems: 'center' }}>
			<h1>Ticketzy</h1>
			<p>Coming soon.</p>
		</Stack>
	);
};

export default withLayoutMain(Home);
