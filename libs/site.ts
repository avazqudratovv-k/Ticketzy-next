export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

/** Mailbox shown on the contact page. A sample address on a reserved demo domain unless the owner sets one. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@ticketzy.demo';

export const SITE_LOCALES = ['en', 'ko', 'ru', 'uz'] as const;
export const DEFAULT_SITE_LOCALE = 'en';

/** Rules quoted in the help pages; they match the backend defaults (docs/ai/DECISIONS.md #46, #47, #55). */
export const SEAT_HOLD_SECONDS = 30;
export const MAX_SEATS_PER_ORDER = 8;

/** Public pages with no data behind them: listed in the sitemap, one entry per language. */
export const STATIC_PATHS = ['/', '/events', '/faq', '/about', '/terms', '/privacy', '/contact'] as const;

/** Path without query, hash or trailing slash (the site serves pages without one). */
export const cleanPath = (asPath: string) => {
	const path = asPath.split(/[?#]/)[0] || '/';
	return path.length > 1 ? path.replace(/\/+$/, '') : '/';
};

/** Absolute address of a path in one language. English has no prefix (default locale). */
export const localizedUrl = (path: string, locale: string) => {
	const clean = cleanPath(path);
	if (locale === DEFAULT_SITE_LOCALE) return `${SITE_URL}${clean}`;
	return `${SITE_URL}/${locale}${clean === '/' ? '' : clean}`;
};

/** Path prefixes that must not be indexed. Used by robots.txt; each page also sets its own noindex tag. */
export const PRIVATE_PREFIXES = ['/organizer', '/admin', '/checkout', '/orders', '/tickets', '/account', '/settings', '/notifications', '/api'];
