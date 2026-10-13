import { SERVER_QUERY_TIMEOUT_MS, serverQuery } from './serverFetch';
import { DEFAULT_SITE_LOCALE, localizedUrl, PRIVATE_PREFIXES, SITE_LOCALES, SITE_URL, STATIC_PATHS } from './site';

/** robots.txt: everything is open except the private areas, in every language prefix. */
export const robotsTxt = () => {
	// `/organizer/` and `/organizer$` (not `/organizer`) so the public /organizers/<id> pages stay crawlable.
	const disallow = SITE_LOCALES.flatMap((locale) =>
		PRIVATE_PREFIXES.flatMap((prefix) => {
			const base = `${locale === DEFAULT_SITE_LOCALE ? '' : `/${locale}`}${prefix}`;
			return [`Disallow: ${base}/`, `Disallow: ${base}$`];
		}),
	);
	return ['User-agent: *', 'Allow: /', ...disallow, '', `Sitemap: ${SITE_URL}/sitemap.xml`, ''].join('\n');
};

const EVENTS_PAGE = `query SitemapEvents($input: EventsInquiry!) {
	getEvents(input: $input) { list { _id startAt } metaCounter { total } }
}`;
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

interface EventsResult {
	getEvents: { list: { _id: string; startAt?: string }[]; metaCounter: { total: number }[] };
}

const escapeXml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Every language version of one page, each entry listing all the others (xhtml:link). */
const entry = (path: string) =>
	SITE_LOCALES.map((locale) => {
		const links = [
			...SITE_LOCALES.map((code) => `<xhtml:link rel="alternate" hreflang="${code}" href="${escapeXml(localizedUrl(path, code))}"/>`),
			`<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(localizedUrl(path, 'en'))}"/>`,
		].join('');
		return `<url><loc>${escapeXml(localizedUrl(path, locale))}</loc>${links}</url>`;
	}).join('');

/** sitemap.xml: static pages plus every public event, read through the same getEvents query the site uses. If the API is down the static pages are still listed. */
export const sitemapXml = async () => {
	const events: { _id: string }[] = [];
	// Each fetch has its own 8 s deadline (serverQuery); the whole sitemap gets the same budget, so a sleeping backend costs one wait, not twenty.
	const deadline = Date.now() + SERVER_QUERY_TIMEOUT_MS;
	for (let page = 1; page <= MAX_PAGES && Date.now() < deadline; page += 1) {
		const data = await serverQuery<EventsResult>(EVENTS_PAGE, {
			input: { page, limit: PAGE_SIZE, sort: 'startAt', direction: 'ASC', search: {} },
		});
		if (!data) break; // timeout or API down: list the static pages and the events read so far
		const list = data.getEvents?.list ?? [];
		events.push(...list);
		if (list.length < PAGE_SIZE) break;
	}
	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${STATIC_PATHS.map((path) => entry(path)).join('\n')}
${events.map((event) => entry(`/events/${event._id}`)).join('\n')}
</urlset>
`;
};
