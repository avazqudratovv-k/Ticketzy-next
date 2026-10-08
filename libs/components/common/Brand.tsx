import Link from 'next/link';
import { ROUTES } from '../../routes';

/** There is no logo yet: the brand is the word Ticketzy with a Volt dot (design: FOUNDATIONS, Iconography). */
const Brand = ({ href = ROUTES.home }: { href?: string }) => (
	<Link href={href} className="tz-brand" aria-label="Ticketzy">
		<span className="tz-brand__dot" aria-hidden="true" />
		Ticketzy
	</Link>
);

export default Brand;
