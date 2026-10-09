import Link from 'next/link';
import { ROUTES } from '../../routes';
import Logo from './Logo';

/** The ticket logo and the word Ticketzy as one home link. `wordmark={false}` shows the logo alone, labelled. */
const Brand = ({ href = ROUTES.home, size = 28, wordmark = true }: { href?: string; size?: number; wordmark?: boolean }) => (
	<Link href={href} className="tz-brand" aria-label="Ticketzy">
		<Logo size={size} label={wordmark ? undefined : 'Ticketzy'} />
		{wordmark && 'Ticketzy'}
	</Link>
);

export default Brand;
