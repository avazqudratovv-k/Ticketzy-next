/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
};

const { i18n } = require('./next-i18next.config');
nextConfig.i18n = i18n;

module.exports = nextConfig;
