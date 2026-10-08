import { NextPage } from 'next';
import { Stack } from '@mui/material';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common'])),
	},
});

const Join: NextPage = () => {
	return (
		<Stack sx={{ minHeight: '60vh', pt: '160px', alignItems: 'center' }}>
			<h1>Login / Sign up</h1>
			<p>Coming soon.</p>
		</Stack>
	);
};

export default withLayoutBasic(Join);
