const { PHASE_PRODUCTION_BUILD } = require('next/constants');

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
};

const { i18n } = require('./next-i18next.config');
nextConfig.i18n = i18n;

/**
 * Variables a production build cannot do without (F340, F349). Each is inlined into the browser bundle at build time,
 * and none has a localhost fallback in production, so a build without one stops here with its name. Development keeps
 * its fallbacks. NEXT_PUBLIC_CONTACT_EMAIL is optional (a sample address is shown without it).
 */
const REQUIRED_ENV = {
	NEXT_PUBLIC_API_GRAPHQL_URL: 'the GraphQL endpoint of the backend (for example https://api.example.com/graphql)',
	NEXT_PUBLIC_API_WS_URL: 'the WebSocket address of the backend (for example wss://api.example.com)',
	NEXT_PUBLIC_API_URL: 'the base address of the backend, used for uploaded images (for example https://api.example.com)',
	NEXT_PUBLIC_SITE_URL: 'the public address of this site, used for canonical links and the sitemap (for example https://tickets.example.com)',
};

const requireEnv = () => {
	const missing = Object.keys(REQUIRED_ENV).filter((name) => !(process.env[name] || '').trim());
	if (missing.length) {
		throw new Error(
			`Production build stopped: set ${missing.length > 1 ? 'these variables' : 'this variable'} in the build environment (or .env.production):\n` +
				missing.map((name) => `  ${name}: ${REQUIRED_ENV[name]}`).join('\n') +
				'\n.env.example lists every name.',
		);
	}
	for (const name of Object.keys(REQUIRED_ENV)) {
		const value = process.env[name].trim();
		if (/localhost|127\.0\.0\.1/.test(value)) console.warn(`Warning: ${name} is "${value}". A deployed site would point at the local machine.`);
	}
};

module.exports = (phase) => {
	// `next lint` loads this file in the same phase, so the command is checked as well.
	if (phase === PHASE_PRODUCTION_BUILD && process.argv.includes('build')) requireEnv();
	return nextConfig;
};
