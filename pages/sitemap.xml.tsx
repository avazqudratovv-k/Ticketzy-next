import type { GetServerSideProps } from 'next';
import { sitemapXml } from '../libs/seo';

/** /sitemap.xml: static pages and public events in all four languages. */
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
	res.setHeader('Content-Type', 'application/xml; charset=utf-8');
	res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
	res.write(await sitemapXml());
	res.end();
	return { props: {} };
};

export default function SitemapXml() {
	return null;
}
