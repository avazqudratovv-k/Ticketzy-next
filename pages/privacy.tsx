import { NextPage, GetStaticPropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import withLayoutBasic from '../libs/components/layout/LayoutBasic';
import LegalDocument from '../libs/components/static/LegalDocument';

export const getStaticProps = async ({ locale }: GetStaticPropsContext) => ({
	props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'legal'])) },
});

const Page: NextPage = () => <LegalDocument doc="privacy" />;

export default withLayoutBasic(Page);
