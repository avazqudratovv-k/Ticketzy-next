import Head from 'next/head';
import { useRouter } from 'next/router';
import { imageSrc } from '../events/EventImage';

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

/** Title, description and Open Graph tags from translated content. The site name is appended to the title. */
const Seo = ({ title, description, image, type = 'website', noindex }: Props) => {
	const { locale } = useRouter();
	const fullTitle = title === 'Ticketzy' ? title : `${title} · Ticketzy`;
	const text = description ? clip(description.replace(/\s+/g, ' ').trim()) : undefined;
	const picture = imageSrc(image);

	return (
		<Head>
			<title key="title">{fullTitle}</title>
			{text && <meta key="description" name="description" content={text} />}
			<meta key="og:title" property="og:title" content={fullTitle} />
			{text && <meta key="og:description" property="og:description" content={text} />}
			<meta key="og:type" property="og:type" content={type} />
			<meta key="og:site_name" property="og:site_name" content="Ticketzy" />
			<meta key="og:locale" property="og:locale" content={OG_LOCALES[locale ?? 'en'] ?? 'en_US'} />
			{picture && <meta key="og:image" property="og:image" content={picture} />}
			<meta key="twitter:card" name="twitter:card" content={picture ? 'summary_large_image' : 'summary'} />
			{noindex && <meta key="robots" name="robots" content="noindex" />}
		</Head>
	);
};

export default Seo;
