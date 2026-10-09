import type { GetServerSideProps } from 'next';
import { robotsTxt } from '../libs/seo';

/** /robots.txt, built from NEXT_PUBLIC_SITE_URL. A page file (not a public file) so the sitemap address is not hard-coded. */
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
	res.setHeader('Content-Type', 'text/plain; charset=utf-8');
	res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
	res.write(robotsTxt());
	res.end();
	return { props: {} };
};

export default function RobotsTxt() {
	return null;
}
