import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { GET_VENUE_TEMPLATES } from '../../../../apollo/organizer/venue';
import { formatNumber } from '../../../format';
import { readFocalArea } from '../../../seats/focal';
import { sectionBounds, tierColor, tierIndexes } from '../../../seats/layout';
import { FocalArea, LayoutSection } from '../../../seats/types';
import { asLayoutSections, CANVAS, fromServer, layoutSectionOf, totals } from '../../../venues/model';
import { Drawing } from '../../../venues/useVenueEditor';
import { FocalShape } from '../../seats/SeatMap';

interface ServerTemplate {
	key: string;
	name: string;
	description: string;
	capacity: number;
	layout: { sections: LayoutSection[]; focalArea?: FocalArea | null };
}

interface Props {
	open: boolean;
	/** Sections the layout has now: they are replaced, so the dialog says so */
	existing: number;
	onClose: () => void;
	onPick: (drawing: Drawing) => void;
}

const Thumb = ({ drawing, stageLabel, pitchLabel }: { drawing: Drawing; stageLabel: string; pitchLabel: string }) => {
	const tiers = tierIndexes(asLayoutSections(drawing.sections));
	return (
		<svg viewBox={`0 0 ${CANVAS.w} ${CANVAS.h}`} className="tpl__thumb" aria-hidden="true" focusable="false">
			<rect width={CANVAS.w} height={CANVAS.h} className="tpl__sheet" />
			<FocalShape focal={drawing.focal} stageLabel={stageLabel} pitchLabel={pitchLabel} />
			{drawing.sections.map((section) => {
				const box = sectionBounds(layoutSectionOf(section));
				return (
					<rect
						key={section.id}
						x={box.x}
						y={box.y}
						width={box.w}
						height={box.h}
						rx={14}
						fill={section.kind === 'STANDING' ? 'none' : tierColor(tiers.get(section.tierKey))}
						className={section.kind === 'STANDING' ? 'tpl__standing' : 'tpl__seats'}
					/>
				);
			})}
		</svg>
	);
};

/**
 * The server's venue templates (`getVenueTemplates`). Section names, the title and the description are looked up by key in the
 * organizer's language; a key with no translation keeps the server's English text. Loading one replaces the sections and the stage
 * or pitch on the canvas as one undo step; the names are only starting values and can be edited.
 */
const TemplateDialog = ({ open, existing, onClose, onPick }: Props) => {
	const { t } = useTranslation('organizer');
	const { t: tc } = useTranslation('checkout');
	const { locale } = useRouter();
	const { data, loading, error, refetch } = useQuery(GET_VENUE_TEMPLATES, { skip: !open });

	const templates = useMemo(
		() =>
			((data?.getVenueTemplates ?? []) as ServerTemplate[]).map((template) => {
				const sections = fromServer(template.layout.sections).map((section) => ({
					...section,
					name: t(`venues.templates.${template.key}.sections.${section.key}`, { defaultValue: section.name }),
				}));
				const drawing: Drawing = { sections, focal: readFocalArea(template.layout.focalArea) };
				return {
					key: template.key,
					drawing,
					name: t(`venues.templates.${template.key}.name`, { defaultValue: template.name }),
					text: t(`venues.templates.${template.key}.text`, { defaultValue: template.description }),
					sums: totals(sections),
				};
			}),
		[data, t],
	);

	return (
		<Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="tpl-title">
			<DialogTitle id="tpl-title">{t('venues.templates.title')}</DialogTitle>
			<DialogContent>
				<p className="org-hint">{existing > 0 ? t('venues.templates.replace', { n: existing }) : t('venues.templates.intro')}</p>
				{loading && !data && (
					<p className="org-hint" role="status">
						{t('venues.templates.loading')}
					</p>
				)}
				{error && !data && (
					<p className="tz-alert tz-alert--error" role="alert">
						<span>{t('venues.templates.error')}</span>{' '}
						<button type="button" className="tz-link" onClick={() => refetch()}>
							{t('venues.templates.retry')}
						</button>
					</p>
				)}
				<ul className="tpl">
					{templates.map(({ key, drawing, name, text, sums }) => (
						<li key={key} className="tpl__card" data-template={key}>
							<Thumb drawing={drawing} stageLabel={tc('map.stage')} pitchLabel={tc('map.pitch')} />
							<h3>{name}</h3>
							<p>{text}</p>
							<p className="tpl__meta">
								{t('venues.templates.meta', { sections: drawing.sections.length, capacity: formatNumber(sums.capacity, locale), n: sums.capacity })}
								{' · '}
								{drawing.focal.type === 'PITCH' ? t('venues.templates.pitchNote') : t('venues.templates.stageNote')}
							</p>
							<Button variant="outlined" onClick={() => onPick(drawing)}>
								{t('venues.templates.use')}
							</Button>
						</li>
					))}
				</ul>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>{t('venues.templates.cancel')}</Button>
			</DialogActions>
		</Dialog>
	);
};

export default TemplateDialog;
