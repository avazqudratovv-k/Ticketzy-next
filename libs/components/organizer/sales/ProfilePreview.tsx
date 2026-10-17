import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { MapPin } from 'phosphor-react';
import Avatar from '../../common/OrganizerAvatar';
import { formatNumber } from '../../../format';

interface Props {
	name: string;
	nick: string;
	desc: string;
	address: string;
	image: string | null | undefined;
	events: number;
	completed: number;
}

/**
 * What /organizers/[id] shows for these values, drawn with the page's own header classes so it stays in step with it. The
 * whole box is a preview, not a link.
 */
const ProfilePreview = ({ name, nick, desc, address, image, events, completed }: Props) => {
	const { t } = useTranslation('organizer');
	const { t: te } = useTranslation('events');
	const { locale } = useRouter();
	const shownName = name.trim() || nick.trim();
	return (
		<div className="org-preview" role="group" aria-label={t('profile.preview.label')}>
			<header className="organizer__head">
				<Avatar member={{ memberFullName: shownName, memberImage: image }} size={88} />
				<div>
					<h3 className="org-preview__name">{shownName || t('profile.preview.noName')}</h3>
					{nick.trim() && nick.trim() !== shownName && <p className="event__muted">@{nick.trim()}</p>}
					{desc.trim() ? <p className="organizer__desc">{desc.trim()}</p> : <p className="org-hint">{t('profile.preview.noDesc')}</p>}
					{address.trim() && (
						<p className="org-preview__address">
							<MapPin size={16} aria-hidden="true" /> {address.trim()}
						</p>
					)}
					<ul className="event__counts">
						<li>{te('organizer.eventsCount', { count: events, n: formatNumber(events, locale) })}</li>
						<li>{te('organizer.completed', { count: completed, n: formatNumber(completed, locale) })}</li>
					</ul>
				</div>
			</header>
		</div>
	);
};

export default ProfilePreview;
