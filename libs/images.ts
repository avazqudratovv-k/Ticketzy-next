import type { ImageLoaderProps } from 'next/image';

/**
 * Event images are 1200 x 800 pictures on picsum.photos (demo data) or files on the API host (uploads). next/image's
 * own optimizer would need `sharp` on the server and a host allow-list for every organizer-supplied URL, so the loader
 * is ours: picsum URLs end in /width/height and can be asked for any size, other sources are used as they are.
 */
const PICSUM = /^(https:\/\/picsum\.photos\/.+)\/(\d+)\/(\d+)(\?.*)?$/;

export const isResizable = (url: string) => PICSUM.test(url);

export const resizingLoader = ({ src, width }: ImageLoaderProps): string => {
	const match = PICSUM.exec(src);
	if (!match) return src;
	const ratio = Number(match[3]) / Number(match[2]);
	// ".jpg" is accepted by picsum and keeps the URL different from `src` even at the source width, which is what
	// next/image checks to see that a loader uses `width`
	return `${match[1]}/${width}/${Math.max(1, Math.round(width * ratio))}.jpg${match[4] ?? ''}`;
};

/** Card grids: 1 column on phones, 2 from 480px, 3 from 1024px, 4 from 1280px (container 1280px wide) */
export const CARD_SIZES = '(min-width: 1280px) 300px, (min-width: 1024px) 33vw, (min-width: 480px) 50vw, 100vw';
