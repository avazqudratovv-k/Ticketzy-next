import { NextPage } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import withLayoutBasic from '../libs/components/layout/LayoutBasic';
import LegalDocument from '../libs/components/static/LegalDocument';

export const getStaticProps = async ({ locale }: any) => ({
	props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'legal'])) },
});

const Page: NextPage = () => <LegalDocument doc="terms" />;

export default withLayoutBasic(Page);
