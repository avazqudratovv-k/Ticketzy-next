import Head from 'next/head';
import { useRouter } from 'next/router';
import { imageSrc } from '../events/EventImage';
import { cleanPath, localizedUrl, SITE_LOCALES, SITE_URL } from '../../site';

interface Props {
	title: string;
	description?: string | null;
	image?: string | null;
	/** `website` for lists, `article` style pages use `event` semantics via og:type "website" too (no better standard value). */
	type?: 'website' | 'profile';
	noindex?: boolean;
}

const OG_LOCALES: Record<string, string> = { en: 'en_US', ko: 'ko_KR', ru: 'ru_RU', uz: 'uz_UZ' };

const clip = (text: string, max = 200) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/**
 * Title, description, Open Graph / Twitter tags, canonical and hreflang links from translated content. The site name is appended to the title.
 * Pages that must stay out of search results pass `noindex`: they get no canonical or alternates.
 */
const Seo = ({ title, description, image, type = 'website', noindex }: Props) => {
	const { locale, asPath } = useRouter();
	const fullTitle = title === 'Ticketzy' ? title : `${title} · Ticketzy`;
	const text = description ? clip(description.replace(/\s+/g, ' ').trim()) : undefined;
	const picture = imageSrc(image) ?? `${SITE_URL}/og-default.png`;
	const path = cleanPath(asPath);
	const current = locale ?? 'en';

	return (
		<Head>
			<title key="title">{fullTitle}</title>
			{text && <meta key="description" name="description" content={text} />}
			<meta key="og:title" property="og:title" content={fullTitle} />
			{text && <meta key="og:description" property="og:description" content={text} />}
			<meta key="og:type" property="og:type" content={type} />
			<meta key="og:site_name" property="og:site_name" content="Ticketzy" />
			<meta key="og:locale" property="og:locale" content={OG_LOCALES[locale ?? 'en'] ?? 'en_US'} />
			<meta key="og:image" property="og:image" content={picture} />
			<meta key="twitter:card" name="twitter:card" content="summary_large_image" />
			<meta key="twitter:title" name="twitter:title" content={fullTitle} />
			{text && <meta key="twitter:description" name="twitter:description" content={text} />}
			<meta key="twitter:image" name="twitter:image" content={picture} />
			{noindex ? (
				<meta key="robots" name="robots" content="noindex,nofollow" />
			) : (
				<>
					<meta key="og:url" property="og:url" content={localizedUrl(path, current)} />
					<link key="canonical" rel="canonical" href={localizedUrl(path, current)} />
					{SITE_LOCALES.map((code) => (
						<link key={`alt-${code}`} rel="alternate" hrefLang={code} href={localizedUrl(path, code)} />
					))}
					<link key="alt-x-default" rel="alternate" hrefLang="x-default" href={localizedUrl(path, 'en')} />
				</>
			)}
		</Head>
	);
};

export default Seo;
