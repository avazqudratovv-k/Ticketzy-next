import Image from 'next/image';
import { NEXT_PUBLIC_API_URL } from '../../config';
import { CARD_SIZES, isResizable, resizingLoader } from '../../images';

/** Event and member images are absolute URLs (demo data) or paths on the API host (uploads). */
export const imageSrc = (path?: string | null): string | undefined => {
	if (!path) return undefined;
	return /^https?:\/\//.test(path) ? path : `${NEXT_PUBLIC_API_URL}/${path.replace(/^\//, '')}`;
};

/**
 * Decorative by default (alt=""): the title next to it says what the event is.
 * `sizes` tells the browser how wide the picture is shown, so it downloads a matching file (see libs/images.ts);
 * the default is the card grid.
 */
const EventImage = ({
	src,
	alt = '',
	className,
	eager,
	sizes = CARD_SIZES,
}: {
	src?: string | null;
	alt?: string;
	className?: string;
	eager?: boolean;
	sizes?: string;
}) => {
	const url = imageSrc(src);
	if (!url) return <span className={`tz-media__empty ${className ?? ''}`} aria-hidden="true" />;
	// width and height only give the aspect ratio (no layout shift); the CSS of the parent decides the size
	return (
		<Image
			className={className}
			src={url}
			alt={alt}
			width={1200}
			height={800}
			sizes={sizes}
			loader={isResizable(url) ? resizingLoader : undefined}
			unoptimized={!isResizable(url)}
			priority={eager}
			loading={eager ? undefined : 'lazy'}
			decoding="async"
		/>
	);
};

export default EventImage;
