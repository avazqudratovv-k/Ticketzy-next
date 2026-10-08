module.exports = {
	i18n: {
		defaultLocale: 'en',
		locales: ['en', 'ko', 'ru', 'uz'],
		localeDetection: false,
	},
	trailingSlash: true,
	reloadOnPrerender: process.env.NODE_ENV === 'development',
};
