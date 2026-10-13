const { PHASE_PRODUCTION_BUILD } = require('next/constants');

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
};

const { i18n } = require('./next-i18next.config');
nextConfig.i18n = i18n;

/**
 * Canonical links, hreflang, sitemap.xml and robots.txt are built from NEXT_PUBLIC_SITE_URL (libs/site.ts). Without it
 * they would silently point at localhost, so a production build stops here (F340). Development keeps the fallback.
 */
const requireSiteUrl = () => {
	const value = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
	if (!value) {
		throw new Error(
			'NEXT_PUBLIC_SITE_URL is required for a production build. Set it to the public address of the site (for example https://tickets.example.com) in the environment or in .env.production; .env.example lists the name.',
		);
	}
	if (/localhost|127\.0\.0\.1/.test(value)) {
		console.warn(`Warning: NEXT_PUBLIC_SITE_URL is "${value}". Canonical, hreflang and sitemap URLs will point there.`);
	}
};

module.exports = (phase) => {
	// `next lint` loads this file in the same phase, so the command is checked as well.
	if (phase === PHASE_PRODUCTION_BUILD && process.argv.includes('build')) requireSiteUrl();
	return nextConfig;
};
