import { useId } from 'react';
import { useTranslation } from 'next-i18next';
import { ArrowClockwise, ArrowCounterClockwise, Copy, Minus, Plus, TrashSimple, WarningCircle, Warning } from 'phosphor-react';
import { Button } from '@mui/material';
import { formatNumber } from '../../../format';
import { CANVAS, DraftSection, IssueCode, LEVELS, LIMITS, SPACINGS, sectionSeats } from '../../../venues/model';
import { ServerIssue } from '../../../venues/serverIssues';
import { VenueEditorState } from '../../../venues/useVenueEditor';
import { useRouter } from 'next/router';

const FIELD_OF: Partial<Record<IssueCode, string>> = {
	keyRequired: 'key',
	keyTooLong: 'key',
	keyDuplicate: 'key',
	nameRequired: 'name',
	nameTooLong: 'name',
	rowsRange: 'rows',
	seatsRange: 'seats',
	capacityRange: 'capacity',
	tierRequired: 'tier',
	tierTooLong: 'tier',
	centerOutside: 'position',
	notANumber: 'position',
};

const asNumber = (raw: string) => (raw.trim() === '' ? NaN : Number(raw));

const Stepper = ({
	label,
	value,
	min,
	max,
	disabled,
	error,
	onChange,
}: {
	label: string;
	value: number;
	min: number;
	max?: number;
	disabled: boolean;
	error?: string;
	onChange: (value: number) => void;
}) => {
	const id = useId();
	const { t } = useTranslation('organizer');
	const safe = Number.isFinite(value) ? value : min;
	return (
		<div className="sp-field">
			<div className="sp-stepper">
				<label htmlFor={id} className="sp-label">
					{label}
				</label>
				<div className="sp-stepper__ctl">
					<button type="button" className="sp-round" aria-label={t('venues.panel.decrease', { field: label })} disabled={disabled || safe <= min} onClick={() => onChange(safe - 1)}>
						<Minus size={16} />
					</button>
					<input
						id={id}
						type="number"
						inputMode="numeric"
						className="tz-input sp-num"
						min={min}
						max={max}
						step={1}
						disabled={disabled}
						value={Number.isFinite(value) ? value : ''}
						aria-invalid={error ? true : undefined}
						onChange={(event) => onChange(asNumber(event.target.value))}
					/>
					<button type="button" className="sp-round" aria-label={t('venues.panel.increase', { field: label })} disabled={disabled || (max !== undefined && safe >= max)} onClick={() => onChange(safe + 1)}>
						<Plus size={16} />
					</button>
				</div>
			</div>
			{error && <FieldError text={error} />}
		</div>
	);
};

const FieldError = ({ text }: { text: string }) => (
	<span className="tz-field__error" role="alert">
		<WarningCircle size={16} weight="fill" aria-hidden="true" /> {text}
	</span>
);

interface Props {
	editor: VenueEditorState;
	section: DraftSection;
	onDelete: (id: string) => void;
	tierKeys: string[];
}

/** Properties of the selected section. Every change is one undoable step (typing in one field is merged). */
const SectionPanel = ({ editor, section, onDelete, tierKeys }: Props) => {
	const { t } = useTranslation('organizer');
	const { locale } = useRouter();
	const { updateSection, duplicate, locked, checked, serverSections, showErrors } = editor;
	const nameId = useId();
	const keyId = useId();
	const tierId = useId();
	const xId = useId();
	const yId = useId();
	const rotId = useId();
	const capId = useId();
	const issues = checked.bySection.get(section.id);
	// Errors are shown at once for a section the organizer touched; "save" reveals the rest
	const errors = issues?.errors ?? [];
	const byField = new Map<string, string>();
	errors.forEach((code) => {
		const field = FIELD_OF[code] ?? 'other';
		if (!byField.has(field)) byField.set(field, t(`venues.issues.${code}`, { max: LIMITS.grid.max, keyMax: LIMITS.key.max, nameMax: LIMITS.sectionName.max, tierMax: LIMITS.tierKey.max, width: CANVAS.w, height: CANVAS.h }));
	});
	const server = serverSections.get(section.id) ?? [];
	const serverText = (issue: ServerIssue) => (issue.code ? t(`venues.issues.${issue.code}`, { max: LIMITS.grid.max }) : issue.raw);
	void showErrors;

	const set = (patch: Partial<DraftSection>, key: string) => updateSection(section.id, patch, key);
	const seats = sectionSeats(section);
	const rotation = Number.isFinite(section.rotation) ? section.rotation : 0;

	const changeKind = (kind: DraftSection['kind']) => {
		if (kind === section.kind) return;
		if (kind === 'STANDING') set({ kind, capacity: section.capacity ?? Math.max(1, (Number.isFinite(sectionSeats(section)) ? sectionSeats(section) : 0) || 200), tierKey: section.tierKey }, 'kind');
		else set({ kind, rows: section.rows > 1 ? section.rows : 5, seatsPerRow: section.seatsPerRow > 1 ? section.seatsPerRow : 10, tierKey: section.tierKey || tierKeys[tierKeys.length - 1] || 'GENERAL' }, 'kind');
	};

	return (
		<div className="sp">
			<div className="sp__head">
				<h3 className="sp__title">{t('venues.panel.title', { name: section.name || section.key || t('venues.panel.unnamed') })}</h3>
				<p className="sp__sum" aria-live="polite">
					{section.kind === 'SEATED'
						? t('venues.panel.sumSeated', { rows: formatNumber(Number.isFinite(section.rows) ? section.rows : 0, locale), seats: formatNumber(Number.isFinite(section.seatsPerRow) ? section.seatsPerRow : 0, locale), total: formatNumber(seats, locale), n: seats })
						: t('venues.panel.sumStanding', { total: formatNumber(Number.isFinite(section.capacity) ? (section.capacity as number) : 0, locale), n: Number.isFinite(section.capacity) ? (section.capacity as number) : 0 })}
				</p>
			</div>

			{locked && (
				<p className="tz-alert tz-alert--info" role="note">
					<span>{t('venues.panel.readOnly')}</span>
				</p>
			)}

			{server.length > 0 && (
				<ul className="org-notes" role="alert">
					{server.map((issue, index) => (
						<li key={index} className="is-bad">
							<WarningCircle size={18} weight="fill" aria-hidden="true" />
							<span>{t('venues.panel.serverSays', { text: serverText(issue) })}</span>
						</li>
					))}
				</ul>
			)}

			<div className="sp-field">
				<label className="sp-label" htmlFor={nameId}>
					{t('venues.panel.name')}
				</label>
				<input id={nameId} className="tz-input" value={section.name} disabled={locked} maxLength={LIMITS.sectionName.max + 20} aria-invalid={byField.has('name') ? true : undefined} onChange={(event) => set({ name: event.target.value }, 'name')} />
				{byField.has('name') && <FieldError text={byField.get('name') as string} />}
			</div>

			<div className="sp-field">
				<label className="sp-label" htmlFor={keyId}>
					{t('venues.panel.key')}
				</label>
				<input id={keyId} className="tz-input" value={section.key} disabled={locked} spellCheck={false} autoCapitalize="characters" aria-invalid={byField.has('key') ? true : undefined} onChange={(event) => set({ key: event.target.value.toUpperCase().replace(/\s+/g, '_') }, 'key')} />
				{byField.has('key') ? <FieldError text={byField.get('key') as string} /> : <span className="tz-field__hint">{t('venues.panel.keyHint')}</span>}
			</div>

			<div className="sp-field">
				<span className="sp-label" id={`${nameId}-kind`}>
					{t('venues.panel.kind')}
				</span>
				<div className="sp-seg" role="radiogroup" aria-labelledby={`${nameId}-kind`}>
					{(['SEATED', 'STANDING'] as const).map((kind) => (
						<button key={kind} type="button" role="radio" aria-checked={section.kind === kind} className={section.kind === kind ? 'is-on' : ''} disabled={locked} onClick={() => changeKind(kind)}>
							{t(`venues.kind.${kind}`)}
						</button>
					))}
				</div>
			</div>

			{section.kind === 'SEATED' ? (
				<>
					<Stepper label={t('venues.panel.rows')} value={section.rows} min={LIMITS.grid.min} max={LIMITS.grid.max} disabled={locked} error={byField.get('rows')} onChange={(rows) => set({ rows }, 'rows')} />
					<Stepper label={t('venues.panel.seatsPerRow')} value={section.seatsPerRow} min={LIMITS.grid.min} max={LIMITS.grid.max} disabled={locked} error={byField.get('seats')} onChange={(seatsPerRow) => set({ seatsPerRow }, 'seats')} />
					<div className="sp-field">
						<span className="sp-label" id={`${nameId}-spacing`}>
							{t('venues.panel.spacing')}
						</span>
						<div className="sp-seg" role="radiogroup" aria-labelledby={`${nameId}-spacing`}>
							{SPACINGS.map((spacing) => (
								<button key={spacing} type="button" role="radio" aria-checked={section.spacing === spacing} className={section.spacing === spacing ? 'is-on' : ''} disabled={locked} onClick={() => set({ spacing }, 'spacing')}>
									{t(`venues.spacing.${spacing}`)}
								</button>
							))}
						</div>
						<span className="tz-field__hint">{t('venues.panel.spacingHint')}</span>
					</div>
					<div className="sp-field">
						<label className="sp-label" htmlFor={tierId}>
							{t('venues.panel.tier')}
						</label>
						<input id={tierId} className="tz-input" list={`${tierId}-list`} value={section.tierKey} disabled={locked} spellCheck={false} autoCapitalize="characters" aria-invalid={byField.has('tier') ? true : undefined} onChange={(event) => set({ tierKey: event.target.value.toUpperCase().replace(/\s+/g, '_') }, 'tier')} />
						<datalist id={`${tierId}-list`}>
							{tierKeys.map((tier) => (
								<option key={tier} value={tier} />
							))}
						</datalist>
						{byField.has('tier') ? <FieldError text={byField.get('tier') as string} /> : <span className="tz-field__hint">{t('venues.panel.tierHint')}</span>}
					</div>
				</>
			) : (
				<div className="sp-field">
					<label className="sp-label" htmlFor={capId}>
						{t('venues.panel.capacity')}
					</label>
					<input id={capId} type="number" inputMode="numeric" min={1} step={1} className="tz-input" disabled={locked} value={Number.isFinite(section.capacity as number) ? (section.capacity as number) : ''} aria-invalid={byField.has('capacity') ? true : undefined} onChange={(event) => set({ capacity: asNumber(event.target.value) }, 'capacity')} />
					{byField.has('capacity') ? <FieldError text={byField.get('capacity') as string} /> : <span className="tz-field__hint">{t('venues.panel.capacityHint')}</span>}
				</div>
			)}

			<div className="sp-field">
				<span className="sp-label" id={`${nameId}-level`}>
					{t('venues.panel.level')}
				</span>
				<div className="sp-seg" role="radiogroup" aria-labelledby={`${nameId}-level`}>
					{LEVELS.map((level) => (
						<button key={level} type="button" role="radio" aria-checked={section.level === level} className={section.level === level ? 'is-on' : ''} disabled={locked} onClick={() => set({ level }, 'level')}>
							{t(`venues.level.${level}`)}
						</button>
					))}
				</div>
				<span className="tz-field__hint">{t('venues.panel.levelHint')}</span>
			</div>

			<div className="sp-field">
				<label className="sp-label" htmlFor={rotId}>
					{t('venues.panel.rotation')}
				</label>
				<div className="sp-rot">
					<button type="button" className="sp-round" aria-label={t('venues.panel.rotateLeft')} disabled={locked} onClick={() => set({ rotation: (((rotation - 15) % 360) + 360) % 360 }, 'rotation')}>
						<ArrowCounterClockwise size={18} />
					</button>
					<input id={rotId} type="number" step={1} className="tz-input sp-num" disabled={locked} value={Number.isFinite(section.rotation) ? section.rotation : ''} onChange={(event) => set({ rotation: asNumber(event.target.value) }, 'rotation')} />
					<span aria-hidden="true">°</span>
					<button type="button" className="sp-round" aria-label={t('venues.panel.rotateRight')} disabled={locked} onClick={() => set({ rotation: (rotation + 15) % 360 }, 'rotation')}>
						<ArrowClockwise size={18} />
					</button>
					<button type="button" className="tz-link org-linkbtn" disabled={locked} onClick={() => set({ rotation: 0 }, 'rotation')}>
						{t('venues.panel.reset')}
					</button>
				</div>
			</div>

			<div className="sp-field">
				<span className="sp-label">{t('venues.panel.position')}</span>
				<div className="sp-xy">
					<label htmlFor={xId}>X</label>
					<input id={xId} type="number" step={1} className="tz-input sp-num" disabled={locked} value={Number.isFinite(section.x) ? section.x : ''} aria-invalid={byField.has('position') ? true : undefined} onChange={(event) => set({ x: asNumber(event.target.value) }, 'x')} />
					<label htmlFor={yId}>Y</label>
					<input id={yId} type="number" step={1} className="tz-input sp-num" disabled={locked} value={Number.isFinite(section.y) ? section.y : ''} aria-invalid={byField.has('position') ? true : undefined} onChange={(event) => set({ y: asNumber(event.target.value) }, 'y')} />
				</div>
				{byField.has('position') ? <FieldError text={byField.get('position') as string} /> : <span className="tz-field__hint">{t('venues.panel.positionHint', { width: CANVAS.w, height: CANVAS.h })}</span>}
			</div>

			{(issues?.warnings ?? []).map((warning, index) => (
				<p key={index} className="tz-alert tz-alert--warning" role="note">
					<Warning size={18} aria-hidden="true" />
					<span>{warning.code === 'overlap' ? t('venues.warnings.overlapWith', { name: warning.with }) : t('venues.warnings.extends')}</span>
				</p>
			))}

			<div className="sp__actions">
				<Button variant="outlined" size="small" startIcon={<Copy size={18} />} disabled={locked} onClick={() => duplicate(section.id)}>
					{t('venues.panel.duplicate')}
				</Button>
				<Button variant="outlined" size="small" className="org-btn-danger" startIcon={<TrashSimple size={18} />} disabled={locked} onClick={() => onDelete(section.id)}>
					{t('venues.panel.delete')}
				</Button>
			</div>
		</div>
	);
};

export default SectionPanel;
