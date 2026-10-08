import { ReactElement } from 'react';
import { useTranslation } from 'next-i18next';
import {
	Basketball,
	Confetti,
	MaskHappy,
	Microphone,
	MusicNotes,
	Presentation,
	Sparkle,
	SoccerBall,
} from 'phosphor-react';
import { EventCategory } from '../../types/event';

const ICONS: Record<EventCategory, (size: number) => ReactElement> = {
	CONCERT: (size) => <MusicNotes size={size} aria-hidden="true" />,
	FOOTBALL: (size) => <SoccerBall size={size} aria-hidden="true" />,
	COMEDY: (size) => <Microphone size={size} aria-hidden="true" />,
	SPORT: (size) => <Basketball size={size} aria-hidden="true" />,
	THEATER: (size) => <MaskHappy size={size} aria-hidden="true" />,
	CONFERENCE: (size) => <Presentation size={size} aria-hidden="true" />,
	FESTIVAL: (size) => <Confetti size={size} aria-hidden="true" />,
	OTHER: (size) => <Sparkle size={size} aria-hidden="true" />,
};

export const categoryIcon = (category: EventCategory, size = 16) => ICONS[category](size);

const CategoryChip = ({ category, onImage }: { category: EventCategory; onImage?: boolean }) => {
	const { t } = useTranslation('events');
	return (
		<span className={`tz-chip${onImage ? ' tz-chip--on-image' : ''}`}>
			{categoryIcon(category, 14)}
			{t(`categories.${category}`)}
		</span>
	);
};

export default CategoryChip;
