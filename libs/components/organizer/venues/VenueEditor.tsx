import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useApolloClient } from '@apollo/client';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { ArrowBendUpLeft, ArrowBendUpRight, ArrowLeft, CheckCircle, Eye, Lock, PencilSimple, Plus, Rows, TrashSimple, Warning, WarningCircle } from 'phosphor-react';
import { ticketTiersOfEventsQuery } from '../../../../apollo/organizer/venue';
import { formatNumber, formatZoneName, intlLocale } from '../../../format';
import useUnsavedGuard from '../../../hooks/useUnsavedGuard';
import { tierColor, tierIndexes } from '../../../seats/layout';
import { asLayoutSections, CANVAS, GRID, LIMITS, VENUE_TYPES } from '../../../venues/model';
import { VenueEvent, hasSeats } from '../../../venues/useVenueData';
import useVenueEditor from '../../../venues/useVenueEditor';
import { VenueRecord } from '../../../venues/types';
import SeatMap from '../../seats/SeatMap';
import { FormField } from '../editor/fields';
import { organizerEventEditUrl } from '../../../routes';
import FocalPanel from './FocalPanel';
import LayoutCanvas from './LayoutCanvas';
import SectionPanel from './SectionPanel';
import TemplateDialog from './TemplateDialog';
import TimezonePicker from './TimezonePicker';
import VenueImages from './VenueImages';

const NO_TAKEN = new Map();
const NO_SET = new Set<string>();
const noop = () => undefined;

interface Props {
	venue?: VenueRecord | null;
	/** The organizer's own events at this venue (for the lock and the warnings) */
	events: VenueEvent[];
	/** The venue belongs to someone else: look, don't touch */
	foreign?: boolean;
	/** Where to go after the first save (the event form that sent the organizer here) and what the back link says */
	returnTo?: string | null;
	onSaved: (venue: VenueRecord, created: boolean) => void;
}

/** Venue details and the layout editor. One instance per venue (the page remounts it by id). */
const VenueEditor = ({ venue = null, events, foreign = false, returnTo = null, onSaved }: Props) => {
	const { t } = useTranslation(['organizer', 'checkout']);
	const router = useRouter();
	const { locale } = router;
	const client = useApolloClient();
	const [mode, setMode] = useState<'edit' | 'preview'>('edit');
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [templatesOpen, setTemplatesOpen] = useState(false);
	const [savedLabel, setSavedLabel] = useState('');
	const [orphans, setOrphans] = useState<{ tier: string; events: string[] }[]>([]);
	const allowRoute = useRef<() => void>(() => undefined);

	const seated = useMemo(() => events.filter(hasSeats), [events]);
	const layoutLocked = foreign || seated.length > 0;
	const editor = useVenueEditor({
		venue,
		layoutLocked,
		onSaved: (saved, created) => {
			allowRoute.current();
			onSaved(saved, created);
		},
	});
	const { values, setField, fieldErrors, showErrors, layout, focal, focalSelected, selectFocal, history, selectedId, setSelectedId, checked, sums, tiers, saving, save, serverError, locked, savedAt, dirty } = editor;
	allowRoute.current = useUnsavedGuard(dirty && !foreign, t('organizer:venues.leave')).allowNextRoute;

	useEffect(() => {
		if (savedAt) setSavedLabel(new Intl.DateTimeFormat(intlLocale(locale), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(savedAt));
	}, [savedAt, locale]);

	const labels = { seated: t('organizer:venues.defaults.seated'), standing: t('organizer:venues.defaults.standing') };
	const selected = layout.find((s) => s.id === selectedId) ?? null;
	const tierKeys = useMemo(() => Array.from(tiers.keys()), [tiers]);
	const tierIndex = useMemo(() => tierIndexes(asLayoutSections(layout)), [layout]);
	const previewSections = useMemo(() => asLayoutSections(layout), [layout]);
	const deleting = layout.find((s) => s.id === deleteId) ?? null;

	// Events that are not locked yet but whose ticket types name a tier: removing the tier from the layout would orphan them
	const usingIds = useMemo(
		() => events.filter((e) => !hasSeats(e) && !['CANCELLED', 'ENDED'].includes(e.eventStatus) && e.seatingType === 'RESERVED').slice(0, 20),
		[events],
	);
	const [ticketTiers, setTicketTiers] = useState<{ event: VenueEvent; tierKey: string }[]>([]);
	useEffect(() => {
		if (!usingIds.length || locked) {
			setTicketTiers([]);
			return undefined;
		}
		let alive = true;
		client
			.query({
				query: ticketTiersOfEventsQuery(usingIds.map((e) => e._id)),
				variables: Object.fromEntries(usingIds.map((e, i) => [`id${i}`, e._id])),
				fetchPolicy: 'network-only',
				errorPolicy: 'all',
			})
			.then(({ data }) => {
				if (!alive) return;
				const found: { event: VenueEvent; tierKey: string }[] = [];
				usingIds.forEach((event, i) => ((data?.[`t${i}`] ?? []) as { tierKey?: string | null }[]).forEach((tt) => tt.tierKey && found.push({ event, tierKey: tt.tierKey })));
				setTicketTiers(found);
			})
			.catch(() => alive && setTicketTiers([]));
		return () => {
			alive = false;
		};
	}, [client, usingIds, locked]);
	useEffect(() => {
		const missing = new Map<string, string[]>();
		ticketTiers.forEach(({ event, tierKey }) => {
			if (!tiers.has(tierKey)) missing.set(tierKey, [...(missing.get(tierKey) ?? []), event.eventTitle]);
		});
		setOrphans(Array.from(missing, ([tier, titles]) => ({ tier, events: Array.from(new Set(titles)) })));
	}, [ticketTiers, tiers]);

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (deleteId || templatesOpen) return;
		const target = event.target as HTMLElement;
		if (target.closest('input, textarea, select, [contenteditable="true"], [role="combobox"], [role="listbox"]')) return;
		const key = event.key.toLowerCase();
		const mod = event.ctrlKey || event.metaKey;
		if (mod && key === 'z') {
			event.preventDefault();
			if (event.shiftKey) history.redo();
			else history.undo();
			return;
		}
		if (mod && key === 'y') {
			event.preventDefault();
			history.redo();
			return;
		}
		if (!selected && focalSelected && !locked && mode === 'edit') {
			// The stage: arrows move it, Alt + arrows resize it. A pitch is fixed, so nothing happens.
			if (key === 'escape') setSelectedId(null);
			if (focal.type !== 'STAGE' || !key.startsWith('arrow') || mod) return;
			event.preventDefault();
			const step = (event.shiftKey ? 10 : 1) * (editor.snapOn ? GRID : 1);
			const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0;
			const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0;
			if (event.altKey) editor.updateStage({ width: focal.width + dx, height: focal.height + dy }, 'keys');
			else editor.updateStage({ x: focal.x + dx, y: focal.y + dy }, 'keys');
			return;
		}
		if (!selected || locked || mode !== 'edit') return;
		if (mod && key === 'd') {
			event.preventDefault();
			editor.duplicate(selected.id);
		} else if (key === 'delete' || key === 'backspace') {
			event.preventDefault();
			setDeleteId(selected.id);
		} else if (key === 'escape') {
			setSelectedId(null);
		} else if (key.startsWith('arrow') && !mod) {
			event.preventDefault();
			const step = (event.shiftKey ? 10 : 1) * (editor.snapOn ? GRID : 1);
			editor.nudge(selected.id, key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0, key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0);
		}
	};

	const zone = values.timezone ? `${values.timezone} (${formatZoneName(new Date().toISOString(), locale, values.timezone)})` : '';
	const title = venue ? venue.venueName : t('organizer:venues.form.titleNew');
	const backHref = returnTo ?? '/organizer/venues';
	const errorList = [
		...Object.keys(fieldErrors).map((field) => `field:${field}`),
		...(checked.layoutError ? ['layout'] : []),
		...(checked.errorCount ? ['sections'] : []),
	];
	const text = (key?: string) => (key ? t(`organizer:venues.form.errors.${key}`, { min: 2 }) : undefined);
	const showFieldErrors = showErrors;

	/** Nothing to save yet (F326): a saved venue without changes. `disabled` is only for the request in flight. */
	const saveBlocked = !saving && !dirty && Boolean(venue);

	return (
		<div className="org-page ve" onKeyDown={onKeyDown}>
			<Head>
				<title>{`${title} · Ticketzy`}</title>
			</Head>
			<div className="org-editor__head">
				<Link href={backHref} className="org-back">
					<ArrowLeft size={18} aria-hidden="true" /> {returnTo ? t('organizer:venues.form.backToEvent') : t('organizer:venues.form.backToList')}
				</Link>
				<div className="ve__titlebar">
					<h1>{title}</h1>
					{!foreign && (
						<Button
							variant="contained"
							className={saveBlocked ? 'tz-blocked' : undefined}
							disabled={saving}
							aria-disabled={saveBlocked ? true : undefined}
							aria-describedby={saveBlocked ? 've-status' : undefined}
							onClick={() => {
								if (!saveBlocked) void save();
							}}
						>
							{saving ? t('organizer:venues.form.saving') : venue ? t('organizer:venues.form.save') : t('organizer:venues.form.create')}
						</Button>
					)}
				</div>
				<p className="org-editor__sub">
					<span id="ve-status" role="status">
						{foreign ? t('organizer:venues.form.foreign') : dirty ? t('organizer:venues.form.unsaved') : savedLabel ? t('organizer:venues.form.savedAt', { time: savedLabel }) : venue ? t('organizer:venues.form.allSaved') : t('organizer:venues.form.notSavedYet')}
					</span>
				</p>
			</div>

			{router.query.created === '1' && !savedAt && !dirty && (
				<p className="tz-alert tz-alert--success" role="status">
					<CheckCircle size={20} aria-hidden="true" />
					<span>
						<strong>{t('organizer:venues.form.createdTitle')}</strong> {t('organizer:venues.form.createdText')}
					</span>
				</p>
			)}

			{savedAt && !dirty && !serverError && (
				<p className="tz-alert tz-alert--success" role="status">
					<CheckCircle size={20} aria-hidden="true" />
					<span>
						<strong>{t('organizer:venues.form.savedTitle')}</strong> {t('organizer:venues.form.savedText')}
					</span>
				</p>
			)}

			{serverError && (
				<div className="tz-alert tz-alert--error" role="alert">
					<WarningCircle size={20} aria-hidden="true" />
					<span>
						<strong>{t('organizer:venues.form.saveFailed')}</strong>{' '}
						{serverError.network ? t('organizer:errors.network') : serverError.key ? t(`organizer:serverErrors.${serverError.key}`) : serverError.raw}
						{editor.lockedByServer && (
							<>
								{' '}
								<button type="button" className="tz-link org-linkbtn" onClick={editor.discardLayoutChanges}>
									{t('organizer:venues.lock.discard')}
								</button>
							</>
						)}
					</span>
				</div>
			)}

			{showErrors && errorList.length > 0 && !serverError && (
				<div className="tz-alert tz-alert--error" role="alert">
					<WarningCircle size={20} aria-hidden="true" />
					<span>
						<strong>{t('organizer:venues.form.fixFirst')}</strong>{' '}
						{checked.layoutError ? t('organizer:venues.issues.noSections') : checked.errorCount ? t('organizer:venues.form.sectionsHaveErrors', { n: checked.errorCount }) : ''}
					</span>
				</div>
			)}

			{foreign && (
				<p className="tz-alert tz-alert--info" role="note">
					<Lock size={20} aria-hidden="true" />
					<span>{t('organizer:venues.lock.foreign')}</span>
				</p>
			)}

			{!foreign && seated.length > 0 && (
				<div className="tz-alert tz-alert--info" role="note">
					<Lock size={20} aria-hidden="true" />
					<span>
						<strong>{t('organizer:venues.lock.title')}</strong> {t('organizer:venues.lock.text', { n: seated.length })}{' '}
						{seated.slice(0, 5).map((e, i) => (
							<span key={e._id}>
								{i > 0 && ', '}
								<Link href={organizerEventEditUrl(e._id)} className="tz-link">
									{e.eventTitle}
								</Link>
							</span>
						))}
						{seated.length > 5 && ` ${t('organizer:venues.lock.more', { n: seated.length - 5 })}`} {t('organizer:venues.lock.rest')}
					</span>
				</div>
			)}
			{!foreign && editor.lockedByServer && seated.length === 0 && (
				<p className="tz-alert tz-alert--info" role="note">
					<Lock size={20} aria-hidden="true" />
					<span>{t('organizer:venues.lock.serverOnly')}</span>
				</p>
			)}

			<section className="ve__card" aria-labelledby="ve-details">
				<h2 id="ve-details" className="org-subtitle">
					{t('organizer:venues.form.details')}
				</h2>
				<div className="org-grid2">
					<FormField label={t('organizer:venues.form.name')} required error={showFieldErrors || values.name ? text(fieldErrors.name) : undefined}>
						<input className="tz-input" value={values.name} maxLength={LIMITS.venueName.max + 20} disabled={foreign} onChange={(event) => setField('name', event.target.value)} />
					</FormField>
					<FormField label={t('organizer:venues.form.type')} required>
						<select className="tz-input" value={values.type} disabled={foreign} onChange={(event) => setField('type', event.target.value as typeof values.type)}>
							{VENUE_TYPES.map((type) => (
								<option key={type} value={type}>
									{t(`organizer:venues.types.${type}`)}
								</option>
							))}
						</select>
					</FormField>
					<FormField label={t('organizer:venues.form.city')} required error={showFieldErrors || values.city ? text(fieldErrors.city) : undefined}>
						<input className="tz-input" value={values.city} maxLength={LIMITS.city.max + 20} disabled={foreign} onChange={(event) => setField('city', event.target.value)} />
					</FormField>
					<FormField label={t('organizer:venues.form.address')} required error={showFieldErrors || values.address ? text(fieldErrors.address) : undefined}>
						<input className="tz-input" value={values.address} maxLength={LIMITS.address.max + 20} disabled={foreign} onChange={(event) => setField('address', event.target.value)} />
					</FormField>
					<FormField label={t('organizer:venues.form.timezone')} required error={text(fieldErrors.timezone)} hint={zone ? t('organizer:venues.form.timezoneHint', { zone }) : t('organizer:venues.form.timezoneDefault')}>
						<TimezonePicker value={values.timezone} onChange={(value) => setField('timezone', value)} disabled={foreign} invalid={Boolean(fieldErrors.timezone)} />
					</FormField>
				</div>
				<h3 className="ve__sub">{t('organizer:venues.images.title')}</h3>
				{foreign ? (
					values.images.length === 0 ? (
						<p className="org-hint">{t('organizer:venues.images.none')}</p>
					) : null
				) : (
					<VenueImages images={values.images} onChange={(images) => setField('images', images)} />
				)}
			</section>

			<section className="ve__card" aria-labelledby="ve-layout">
				<div className="ve__layouthead">
					<div>
						<h2 id="ve-layout" className="org-subtitle">
							{t('organizer:venues.layout.title')}
						</h2>
						<p className="org-hint">{t('organizer:venues.layout.intro', { width: CANVAS.w, height: CANVAS.h })}</p>
					</div>
					<div className="tz-tabs tz-tabs--segmented ve__mode" role="tablist" aria-label={t('organizer:venues.layout.view')}>
						<button type="button" role="tab" className="tz-tab" aria-selected={mode === 'edit'} onClick={() => setMode('edit')}>
							<PencilSimple size={18} aria-hidden="true" /> {t('organizer:venues.layout.edit')}
						</button>
						<button type="button" role="tab" className="tz-tab" aria-selected={mode === 'preview'} onClick={() => setMode('preview')}>
							<Eye size={18} aria-hidden="true" /> {t('organizer:venues.layout.preview')}
						</button>
					</div>
				</div>

				<div className="ve__tools" role="toolbar" aria-label={t('organizer:venues.layout.tools')}>
					<Button variant="outlined" size="small" startIcon={<Plus size={18} />} disabled={locked} onClick={() => editor.addSection('SEATED', labels)}>
						{t('organizer:venues.layout.addSeated')}
					</Button>
					<Button variant="outlined" size="small" startIcon={<Plus size={18} />} disabled={locked} onClick={() => editor.addSection('STANDING', labels)}>
						{t('organizer:venues.layout.addStanding')}
					</Button>
					<Button variant="outlined" size="small" startIcon={<Rows size={18} />} disabled={locked} onClick={() => setTemplatesOpen(true)}>
						{t('organizer:venues.layout.loadTemplate')}
					</Button>
					<span className="ve__sep" aria-hidden="true" />
					<Button variant="text" size="small" startIcon={<ArrowBendUpLeft size={18} />} className={!locked && !history.canUndo ? 'tz-blocked' : undefined} disabled={locked} aria-disabled={!locked && !history.canUndo ? true : undefined} onClick={() => { if (history.canUndo) history.undo(); }} title="Ctrl+Z">
						{t('organizer:venues.layout.undo')}
					</Button>
					<Button variant="text" size="small" startIcon={<ArrowBendUpRight size={18} />} className={!locked && !history.canRedo ? 'tz-blocked' : undefined} disabled={locked} aria-disabled={!locked && !history.canRedo ? true : undefined} onClick={() => { if (history.canRedo) history.redo(); }} title="Ctrl+Shift+Z">
						{t('organizer:venues.layout.redo')}
					</Button>
				</div>

				<div className="ve__totals" role="status" aria-live="polite">
					<span>
						<strong>{formatNumber(sums.capacity, locale)}</strong> {t('organizer:venues.layout.capacity', { n: sums.capacity })}
					</span>
					<span>{t('organizer:venues.layout.seatsCount', { n: sums.seats, formatted: formatNumber(sums.seats, locale) })}</span>
					<span>{t('organizer:venues.layout.standingCount', { n: sums.standing, formatted: formatNumber(sums.standing, locale) })}</span>
					<span>{t('organizer:venues.layout.sectionsCount', { n: layout.length })}</span>
				</div>

				{layout.length === 0 && mode === 'edit' && (
					<p className="tz-alert tz-alert--info" role="note">
						<span>{t('organizer:venues.layout.empty')}</span>
					</p>
				)}

				<div className="ve__work">
					<div className="ve__stage" tabIndex={-1}>
						{mode === 'edit' ? (
							<LayoutCanvas
								layout={layout}
								focal={focal}
								focalSelected={focalSelected}
								onSelectFocal={selectFocal}
								onStagePreview={editor.previewStage}
								selectedId={selectedId}
								issues={checked.bySection}
								readOnly={locked}
								grid={editor.grid}
								snapOn={editor.snapOn}
								onGrid={editor.setGrid}
								onSnap={editor.setSnapOn}
								onSelect={setSelectedId}
								onPreview={editor.previewMove}
								onDragEnd={history.commit}
							/>
						) : (
							<div className="ve__preview">
								<p className="org-hint">{t('organizer:venues.layout.previewNote')}</p>
								{layout.length === 0 ? (
									<p className="org-hint">{t('organizer:venues.layout.empty')}</p>
								) : (
									<SeatMap
										focalArea={focal}
										sections={previewSections}
										tiers={tierIndex}
										taken={NO_TAKEN}
										selected={NO_SET}
										lockedTiers={NO_SET}
										activeSection={null}
										tooltip={() => null}
										onSeat={noop}
										onSection={noop}
										focusSection={null}
									/>
								)}
							</div>
						)}
						<ul className="ve__legend" aria-label={t('organizer:venues.layout.tiers')}>
							{Array.from(tiers, ([key, info]) => (
								<li key={key}>
									<span className="ve__swatch" style={{ background: tierColor(tierIndex.get(key)) }} aria-hidden="true" />
									<strong>{key}</strong> {t('organizer:venues.layout.tierSeats', { formatted: formatNumber(info.seats, locale), sections: info.sections })}
								</li>
							))}
						</ul>
						{mode === 'edit' && (
							<details className="ve__keys">
								<summary>{t('organizer:venues.shortcuts.title')}</summary>
								<ul>
									<li>{t('organizer:venues.shortcuts.move')}</li>
									<li>{t('organizer:venues.shortcuts.nudge', { step: editor.snapOn ? GRID : 1, big: (editor.snapOn ? GRID : 1) * 10 })}</li>
									<li>{t('organizer:venues.shortcuts.delete')}</li>
									<li>{t('organizer:venues.shortcuts.undo')}</li>
									<li>{t('organizer:venues.shortcuts.duplicate')}</li>
									<li>{t('organizer:venues.shortcuts.zoom')}</li>
								</ul>
							</details>
						)}
					</div>

					<section className="ve__side" aria-label={t('organizer:venues.panel.label')}>
						{mode === 'edit' && focalSelected && !selected ? (
							<FocalPanel editor={editor} />
						) : mode === 'edit' && selected ? (
							<SectionPanel editor={editor} section={selected} onDelete={setDeleteId} tierKeys={tierKeys} />
						) : (
							<p className="org-hint">{mode === 'edit' ? t('organizer:venues.panel.none') : t('organizer:venues.panel.previewOnly')}</p>
						)}
						<h3 className="ve__sub">{t('organizer:venues.focal.listTitle')}</h3>
						<ul className="ve__list">
							<li>
								<button type="button" className={`ve__item ${focalSelected && !selected ? 'is-on' : ''}`} aria-current={focalSelected && !selected ? 'true' : undefined} onClick={() => { selectFocal(); setMode('edit'); }}>
									<span className="ve__item-name">{focal.type === 'PITCH' ? t('organizer:venues.focal.pitch') : t('organizer:venues.focal.stage')}</span>
									<span className="ve__item-n">{focal.type === 'PITCH' ? t('organizer:venues.focal.pitchFixed') : t('organizer:venues.focal.stageSize', { width: focal.width, height: focal.height })}</span>
								</button>
							</li>
						</ul>
						<h3 className="ve__sub">{t('organizer:venues.panel.sections', { n: layout.length })}</h3>
						<ul className="ve__list">
							{layout.map((section) => {
								const problems = checked.bySection.get(section.id);
								const bad = (problems?.errors.length ?? 0) > 0 || editor.serverSections.has(section.id);
								const warn = !bad && (problems?.warnings.length ?? 0) > 0;
								return (
									<li key={section.id}>
										<button type="button" className={`ve__item ${section.id === selectedId ? 'is-on' : ''}`} aria-current={section.id === selectedId ? 'true' : undefined} onClick={() => { setSelectedId(section.id); setMode('edit'); }}>
											<span className="ve__swatch" style={{ background: section.kind === 'SEATED' ? tierColor(tierIndex.get(section.tierKey)) : 'transparent' }} aria-hidden="true" />
											<span className="ve__item-name">{section.name || section.key || t('organizer:venues.panel.unnamed')}</span>
											<span className="ve__item-n">
												{section.kind === 'SEATED' ? formatNumber(Number.isFinite(section.rows * section.seatsPerRow) ? section.rows * section.seatsPerRow : 0, locale) : formatNumber(Number.isFinite(section.capacity as number) ? (section.capacity as number) : 0, locale)}
											</span>
											{bad && <WarningCircle size={18} weight="fill" className="ve__bad" aria-label={t('organizer:venues.panel.hasError')} />}
											{warn && <Warning size={18} weight="fill" className="ve__warn" aria-label={t('organizer:venues.panel.hasWarning')} />}
										</button>
									</li>
								);
							})}
						</ul>
					</section>
				</div>

				{(checked.warningCount > 0 || orphans.length > 0) && (
					<div className="ve__warnings" role="note">
						{checked.warningCount > 0 && (
							<p className="tz-alert tz-alert--warning">
								<Warning size={20} aria-hidden="true" />
								<span>{t('organizer:venues.warnings.summary', { n: checked.warningCount })}</span>
							</p>
						)}
						{orphans.map((orphan) => (
							<p key={orphan.tier} className="tz-alert tz-alert--warning">
								<Warning size={20} aria-hidden="true" />
								<span>{t('organizer:venues.warnings.orphan', { tier: orphan.tier, events: orphan.events.join(', ') })}</span>
							</p>
						))}
					</div>
				)}
				{!locked && events.length > 0 && seated.length === 0 && (
					<p className="org-hint">{t('organizer:venues.lock.usedNote', { n: events.length })}</p>
				)}
			</section>

			<TemplateDialog
				open={templatesOpen}
				existing={layout.length}
				onClose={() => setTemplatesOpen(false)}
				onPick={(next) => {
					editor.replaceDrawing(next);
					setTemplatesOpen(false);
				}}
			/>

			<Dialog open={Boolean(deleting)} onClose={() => setDeleteId(null)} aria-labelledby="ve-del-title">
				<DialogTitle id="ve-del-title">{t('organizer:venues.delete.title', { name: deleting?.name || deleting?.key })}</DialogTitle>
				<DialogContent>
					<DialogContentText>
						{deleting?.kind === 'SEATED'
							? t('organizer:venues.delete.textSeated', { n: deleting ? deleting.rows * deleting.seatsPerRow || 0 : 0 })
							: t('organizer:venues.delete.textStanding')}{' '}
						{t('organizer:venues.delete.undo')}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteId(null)}>{t('organizer:venues.delete.cancel')}</Button>
					<Button
						variant="contained"
						color="error"
						startIcon={<TrashSimple size={18} />}
						onClick={() => {
							if (deleting) editor.removeSection(deleting.id);
							setDeleteId(null);
						}}
					>
						{t('organizer:venues.delete.confirm')}
					</Button>
				</DialogActions>
			</Dialog>
		</div>
	);
};

export default VenueEditor;
