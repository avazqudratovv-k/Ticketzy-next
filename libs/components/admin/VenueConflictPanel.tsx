import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { CalendarBlank, MapPin, User, Warning } from 'phosphor-react';
import EventStatusBadge from '../organizer/EventStatusBadge';
import { formatEventWhen } from '../../format';
import { VenueConflict } from '../../venueConflict';

interface Props {
	conflicts?: VenueConflict[] | null;
	/** the reviewed event's venue zone; the conflict items carry none */
	timeZone?: string | null;
	/** inside the approve dialog: a list without the region wrapper and the link targets */
	compact?: boolean;
	id?: string;
}

/**
 * Admin-only "Possible venue conflict" warning (backend `Event.possibleVenueConflicts`, never blocks anything).
 * Renders nothing for null (not checked) and [] (checked, none).
 */
const VenueConflictPanel = ({ conflicts, timeZone, compact = false, id = 'venue-conflicts' }: Props) => {
	const { t } = useTranslation('admin');
	const { locale } = useRouter();
	if (!conflicts || conflicts.length === 0) return null;
	const titleId = `${id}-title`;

	const list = (
		<ul className="adm-conflicts__list">
			{conflicts.map((item) => (
				<li key={item.eventId} className="adm-conflict">
					<div className="adm-conflict__head">
						{compact ? (
							<strong className="adm-conflict__title">{item.eventTitle}</strong>
						) : (
							<Link href={`/admin/events/${item.eventId}`} className="tz-link adm-conflict__title">
								{item.eventTitle}
							</Link>
						)}
						<EventStatusBadge status={item.eventStatus} />
					</div>
					<span className="adm-conflict__meta">
						<User size={16} aria-hidden="true" /> {t('conflicts.by', { name: item.organizerNick || '–' })}
					</span>
					<span className="adm-conflict__meta">
						<MapPin size={16} aria-hidden="true" /> {item.venueName}
					</span>
					<span className="adm-conflict__meta">
						<CalendarBlank size={16} aria-hidden="true" /> {formatEventWhen(item.startAt, item.endAt, locale, timeZone, true)}
					</span>
				</li>
			))}
		</ul>
	);

	if (compact) {
		return (
			<div className="adm-conflicts adm-conflicts--compact" role="group" aria-labelledby={titleId}>
				<p id={titleId} className="adm-conflicts__title">
					<Warning size={20} weight="fill" aria-hidden="true" /> {t('conflicts.title')}
				</p>
				{list}
			</div>
		);
	}

	return (
		<section className="adm-card adm-conflicts" aria-labelledby={titleId} id={id}>
			<h2 id={titleId} className="adm-card__title adm-conflicts__title">
				<Warning size={20} weight="fill" aria-hidden="true" /> {t('conflicts.title')}
			</h2>
			<p className="adm-conflicts__intro">{t('conflicts.intro', { count: conflicts.length })}</p>
			{list}
		</section>
	);
};

export default VenueConflictPanel;
