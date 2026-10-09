import Image from 'next/image';

interface LogoProps {
	/** Pixel size of the square mark. */
	size?: number;
	/** Accessible name when the mark stands alone; leave out next to the visible word "Ticketzy" (then it is decorative). */
	label?: string;
	className?: string;
}

/** The Ticketzy ticket: the same artwork as the favicon (public/favicon.svg). */
const Logo = ({ size = 28, label, className }: LogoProps) => (
	<Image
		src="/favicon.svg"
		width={size}
		height={size}
		alt={label ?? ''}
		aria-hidden={label ? undefined : true}
		className={`tz-logo ${className ?? ''}`.trim()}
		unoptimized
		priority
	/>
);

export default Logo;
