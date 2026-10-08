import { NEXT_PUBLIC_API_URL } from '../../config';

/** Event and member images are absolute URLs (demo data) or paths on the API host (uploads). */
export const imageSrc = (path?: string | null): string | undefined => {
	if (!path) return undefined;
	return /^https?:\/\//.test(path) ? path : `${NEXT_PUBLIC_API_URL}/${path.replace(/^\//, '')}`;
};

/** Decorative by default (alt=""): the title next to it says what the event is. */
const EventImage = ({
	src,
	alt = '',
	className,
	eager,
}: {
	src?: string | null;
	alt?: string;
	className?: string;
	eager?: boolean;
}) => {
	const url = imageSrc(src);
	if (!url) return <span className={`tz-media__empty ${className ?? ''}`} aria-hidden="true" />;
	// Plain <img>: sources are remote and unlisted, so next/image would need a domain allow-list
	// eslint-disable-next-line @next/next/no-img-element
	return <img className={className} src={url} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />;
};

export default EventImage;
