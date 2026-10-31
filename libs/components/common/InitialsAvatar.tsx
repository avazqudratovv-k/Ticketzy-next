import { Avatar as MuiAvatar } from '@mui/material';
import { CSSProperties } from 'react';
import { imageSrc } from '../events/EventImage';

/** First letter of up to two words, upper case ("Neon Alley" is "NA"). `Array.from` keeps a letter outside the basic plane whole. */
export const initialsOf = (name: string): string =>
	name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => Array.from(part)[0]?.toUpperCase())
		.join('');

interface Props {
	/** Picture path from the API, a full address, or a blob address while previewing. A logo may be an SVG. */
	src?: string | null;
	/** The letters shown when there is no picture, or it does not load */
	name: string;
	size?: number;
	className?: string;
}

/**
 * The one avatar: a picture, or the letters of the name centered in the circle at any size.
 * The picture is MUI's plain `<img>` (an SVG logo works, which `next/image` would refuse); a missing or broken file falls back to the letters.
 * The letters sit in `.tz-avatar__letter`, whose box is trimmed to the capital letters (CSS in scss/app.scss), so the circle's center is
 * the letters' center, horizontally and vertically; the font size follows `--avatar-size`.
 */
const InitialsAvatar = ({ src, name, size = 40, className }: Props) => (
	<MuiAvatar
		src={src && /^(blob|data):/.test(src) ? src : imageSrc(src)}
		alt=""
		className={`tz-avatar${className ? ` ${className}` : ''}`}
		style={{ ['--avatar-size' as string]: `${size}px` } as CSSProperties}
		sx={{ width: size, height: size }}
		imgProps={{ width: size, height: size, decoding: 'async' }}
	>
		<span className="tz-avatar__letter">{initialsOf(name) || '?'}</span>
	</MuiAvatar>
);

export default InitialsAvatar;
