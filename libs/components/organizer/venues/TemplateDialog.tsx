import { useMemo } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { formatNumber } from '../../../format';
import { sectionBounds, tierColor, tierIndexes } from '../../../seats/layout';
import { asLayoutSections, CANVAS, Layout, layoutSectionOf, totals } from '../../../venues/model';
import { buildTemplate, TEMPLATE_IDS, TemplateId } from '../../../venues/templates';

interface Props {
	open: boolean;
	/** Sections the layout has now: they are replaced, so the dialog says so */
	existing: number;
	onClose: () => void;
	onPick: (layout: Layout) => void;
}

const Thumb = ({ layout }: { layout: Layout }) => {
	const tiers = tierIndexes(asLayoutSections(layout));
	return (
		<svg viewBox={`0 0 ${CANVAS.w} ${CANVAS.h}`} className="tpl__thumb" aria-hidden="true" focusable="false">
			<rect width={CANVAS.w} height={CANVAS.h} className="tpl__sheet" />
			{layout.map((section) => {
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

/** Three ready-made layouts. Loading one replaces the sections on the canvas; it is one undo step. */
const TemplateDialog = ({ open, existing, onClose, onPick }: Props) => {
	const { t } = useTranslation('organizer');
	const { locale } = useRouter();
	const templates = useMemo(
		() =>
			TEMPLATE_IDS.map((id) => {
				const layout = buildTemplate(id, (key) => t(`venues.templates.${id}.sections.${key}`));
				return { id, layout, sums: totals(layout) };
			}),
		[t],
	);
	return (
		<Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="tpl-title">
			<DialogTitle id="tpl-title">{t('venues.templates.title')}</DialogTitle>
			<DialogContent>
				<p className="org-hint">{existing > 0 ? t('venues.templates.replace', { n: existing }) : t('venues.templates.intro')}</p>
				<ul className="tpl">
					{templates.map(({ id, layout, sums }) => (
						<li key={id} className="tpl__card">
							<Thumb layout={layout} />
							<h3>{t(`venues.templates.${id}.name`)}</h3>
							<p>{t(`venues.templates.${id}.text`)}</p>
							<p className="tpl__meta">
								{t('venues.templates.meta', { sections: layout.length, capacity: formatNumber(sums.capacity, locale), n: sums.capacity })}
							</p>
							<Button variant="outlined" onClick={() => onPick(buildTemplate(id as TemplateId, (key) => t(`venues.templates.${id}.sections.${key}`)))}>
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
