import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FOCAL_CANVAS, MIN_STAGE } from '../../../seats/focal';
import { VenueEditorState } from '../../../venues/useVenueEditor';

/** A whole-number field that lets the organizer clear it while typing; only a valid number reaches the layout. */
const NumberField = ({ label, value, min, max, disabled, onCommit }: { label: string; value: number; min: number; max: number; disabled: boolean; onCommit: (value: number) => void }) => {
	const id = useId();
	const [draft, setDraft] = useState(String(value));
	useEffect(() => setDraft(String(value)), [value]);
	return (
		<div className="sp-field">
			<label className="sp-label" htmlFor={id}>
				{label}
			</label>
			<input
				id={id}
				type="number"
				inputMode="numeric"
				step={1}
				min={min}
				max={max}
				className="tz-input sp-num"
				disabled={disabled}
				value={draft}
				onChange={(event) => {
					setDraft(event.target.value);
					const next = Number(event.target.value);
					if (event.target.value.trim() !== '' && Number.isFinite(next)) onCommit(next);
				}}
				onBlur={() => setDraft(String(value))}
			/>
		</div>
	);
};

/**
 * The stage or the pitch of the layout. A STAGE has four numbers (the same ones the handles on the canvas change); a PITCH has
 * a fixed size and place, so it has no fields at all, only the explanation.
 */
const FocalPanel = ({ editor }: { editor: VenueEditorState }) => {
	const { t } = useTranslation('organizer');
	const { focal, locked, updateStage } = editor;

	if (focal.type === 'PITCH') {
		return (
			<div className="sp">
				<h3 className="sp__title">{t('venues.focal.pitchTitle')}</h3>
				<p className="org-hint">{t('venues.focal.pitchNote')}</p>
				<p className="sp__sum">
					{focal.width} × {focal.height}
				</p>
			</div>
		);
	}
	const set = (patch: Parameters<typeof updateStage>[0], key: string) => updateStage(patch, key);
	return (
		<div className="sp">
			<h3 className="sp__title">{t('venues.focal.stageTitle')}</h3>
			{locked && (
				<p className="tz-alert tz-alert--info" role="note">
					<span>{t('venues.panel.readOnly')}</span>
				</p>
			)}
			<p className="org-hint">{t('venues.focal.stageHint', { width: FOCAL_CANVAS.width, height: FOCAL_CANVAS.height })}</p>
			<div className="sp-xy sp-xy--grid">
				<NumberField label={t('venues.focal.x')} value={focal.x} min={0} max={FOCAL_CANVAS.width - focal.width} disabled={locked} onCommit={(x) => set({ x }, 'x')} />
				<NumberField label={t('venues.focal.y')} value={focal.y} min={0} max={FOCAL_CANVAS.height - focal.height} disabled={locked} onCommit={(y) => set({ y }, 'y')} />
				<NumberField label={t('venues.focal.width')} value={focal.width} min={MIN_STAGE.width} max={FOCAL_CANVAS.width - focal.x} disabled={locked} onCommit={(width) => set({ width }, 'width')} />
				<NumberField label={t('venues.focal.height')} value={focal.height} min={MIN_STAGE.height} max={FOCAL_CANVAS.height - focal.y} disabled={locked} onCommit={(height) => set({ height }, 'height')} />
			</div>
		</div>
	);
};

export default FocalPanel;
