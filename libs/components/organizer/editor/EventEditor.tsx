import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { ArrowLeft, ArrowRight, CheckCircle, Info, Lock, WarningCircle } from 'phosphor-react';
import useUnsavedGuard from '../../../hooks/useUnsavedGuard';
import useEventEditor, { isUntouched } from '../../../organizer/useEventEditor';
import {
	canCreateDraft,
	FieldErrors,
	StepId,
	STEPS,
	stepOfError,
	submitChecks,
	validateDetails,
	validateImages,
	validateSaleWindow,
	validateTickets,
	validateTranslations,
	validateVenue,
} from '../../../organizer/form';
import { OrgEvent, OrgTicketType } from '../../../organizer/types';
import { intlLocale } from '../../../format';
import { useSalesClock } from '../../../salesWindow';
import SalesNotice from '../../events/SalesNotice';
import { eventUrl, organizerEventEditUrl, organizerEventsUrl, organizerVenueNewUrl } from '../../../routes';
import EventStatusBadge from '../EventStatusBadge';
import SubmitDialog from '../SubmitDialog';
import CancelDialog from '../CancelDialog';
import StepDetails from './StepDetails';
import StepImages from './StepImages';
import StepVenue from './StepVenue';
import StepTickets from './StepTickets';
import StepTranslations from './StepTranslations';
import StepReview from './StepReview';

const isStep = (value: unknown): value is StepId => (STEPS as readonly unknown[]).includes(value);

interface Props {
	event?: OrgEvent | null;
	ticketTypes?: OrgTicketType[];
}

/** The multi-step event form (create and edit). One instance per event; the page remounts it when the event id changes. */
const EventEditor = ({ event: initialEvent = null, ticketTypes = [] }: Props) => {
	const { t } = useTranslation('organizer');
	const router = useRouter();
	const { locale } = router;
	const queryStep = typeof router.query.step === 'string' ? router.query.step : '';
	const [step, setStepState] = useState<StepId>(isStep(queryStep) ? queryStep : 'details');
	const [submitOpen, setSubmitOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [confirmReview, setConfirmReview] = useState<null | (() => void)>(null);
	const [cancelOpen, setCancelOpen] = useState(false);
	const [justSubmitted, setJustSubmitted] = useState(false);
	const [savedLabel, setSavedLabel] = useState('');

	const nextStepRef = useRef<string>(step);
	const allowRoute = useRef<() => void>(() => undefined);
	const editor = useEventEditor({
		event: initialEvent,
		ticketTypes,
		onCreated: (created) => {
			allowRoute.current();
			router.replace(`${organizerEventEditUrl(created._id)}?step=${nextStepRef.current}`);
		},
	});
	const { event, status, mode, values, rows, venue, errors, setErrors, serverError, saving, dirty, savedAt, save, submit } = editor;
	const readOnly = mode === 'locked';
	// what buyers see about the sales window (the ticket types as loaded with the page)
	const now = useSalesClock(event ?? undefined, ticketTypes);
	const showSales = Boolean(event) && (status === 'DRAFT' || status === 'PENDING' || status === 'APPROVED');
	allowRoute.current = useUnsavedGuard(dirty && !readOnly, t('form.leave')).allowNextRoute;

	useEffect(() => {
		if (!savedAt) return;
		setSavedLabel(new Intl.DateTimeFormat(intlLocale(locale), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(savedAt));
	}, [savedAt, locale]);

	const index = STEPS.indexOf(step);
	const setStep = (next: StepId) => {
		setStepState(next);
		if (event) router.replace({ pathname: router.pathname, query: { ...router.query, step: next } }, undefined, { shallow: true, scroll: false });
		if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
	};

	const filled = rows.filter((row) => !isUntouched(row, values.seatingType));
	const stepErrors = (id: StepId): FieldErrors => {
		switch (id) {
			case 'details':
				return validateDetails(values);
			case 'images':
				return validateImages(values);
			case 'venue':
				return validateVenue(values, venue, event?.startAt);
			case 'tickets':
				return { ...validateTickets(filled, values.seatingType), ...validateSaleWindow(values, venue) };
			case 'translations':
				return validateTranslations(values);
			default:
				return {};
		}
	};

	/** Saves (when the form may be saved), and says whether the organizer can go on. */
	const runSave = async (target?: StepId): Promise<boolean> => {
		if (readOnly) return true;
		if (target) nextStepRef.current = target;
		const result = await save();
		if (!result.ok && result.firstErrorStep) setStep(result.firstErrorStep);
		return result.ok;
	};

	const saveDraft = () => {
		if (mode === 'review' && editor.valuesDirty) {
			setConfirmReview(() => () => void runSave());
			return;
		}
		void runSave();
	};

	const next = async () => {
		const found = stepErrors(step);
		if (Object.keys(found).length) {
			setErrors((current) => ({ ...current, ...found }));
			return;
		}
		const target = STEPS[index + 1];
		// DRAFT and REJECTED events are saved on the way; an APPROVED event is only saved on purpose (any save sends it to review)
		if (mode === 'full' && editor.dirty && (event || canCreateDraft(values, venue))) {
			if (!(await runSave(target))) return;
		}
		if (target) setStep(target);
	};

	/** To the venue form and back: what is typed so far is kept for the way back (see useEventEditor, `venueId` in the address). */
	const goCreateVenue = () => {
		const path = `${router.asPath.split('?')[0]}?step=venue`;
		editor.stashDraft();
		allowRoute.current();
		void router.push(`${organizerVenueNewUrl}?returnTo=${encodeURIComponent(path)}`);
	};

	const checks = submitChecks(values, filled, venue);

	const openSubmit = async () => {
		const all = Object.keys(errors);
		if (all.length) {
			setStep(stepOfError(all[0]));
			return;
		}
		if (dirty && !(await runSave())) return;
		setSubmitOpen(true);
	};
	const confirmSubmit = async () => {
		setSubmitting(true);
		const result = await submit();
		setSubmitting(false);
		if (result) {
			setSubmitOpen(false);
			setJustSubmitted(true);
			setStep('review');
		}
	};

	const title = event ? event.eventTitle : t('form.titleNew');
	const errorCount = Object.keys(errors).length;

	return (
		<div className="org-page org-editor">
			<Head>
				<title>{`${title} · Ticketzy`}</title>
			</Head>
			<div className="org-editor__head">
				<Link href={organizerEventsUrl} className="org-back">
					<ArrowLeft size={18} aria-hidden="true" /> {t('form.backToList')}
				</Link>
				<div className="org-editor__title">
					<h1>{event ? title : t('form.titleNew')}</h1>
					<EventStatusBadge status={status} />
				</div>
				<p className="org-editor__sub">
					{t('form.stepOf', { step: index + 1, count: STEPS.length, name: t(`form.steps.${step}`) })}
					{' · '}
					<span role="status">{dirty && !readOnly ? t('form.unsaved') : savedLabel ? t('form.savedAt', { time: savedLabel }) : event ? t('form.allSaved') : t('form.notSavedYet')}</span>
				</p>
			</div>

			{event && showSales && <SalesNotice event={event} ticketTypes={ticketTypes} now={now} />}

			{justSubmitted && (
				<p className="tz-alert tz-alert--success" role="status">
					<CheckCircle size={20} aria-hidden="true" />
					<span>
						<strong>{t('form.submitted.title')}</strong> {t('form.submitted.text')}
					</span>
				</p>
			)}
			{status === 'REJECTED' && (
				<div className="tz-alert tz-alert--error" role="note">
					<WarningCircle size={20} aria-hidden="true" />
					<span>
						<strong>{t('notice.rejected.title')}</strong> {event?.rejectReason ? t('notice.rejected.reason', { reason: event.rejectReason }) : t('notice.rejected.noReason')} {t('notice.rejected.next')}
					</span>
				</div>
			)}
			{status === 'PENDING' && !justSubmitted && (
				<p className="tz-alert tz-alert--info" role="note">
					<Lock size={20} aria-hidden="true" />
					<span>
						<strong>{t('notice.pending.title')}</strong> {t('notice.pending.text')}
					</span>
				</p>
			)}
			{status === 'APPROVED' && (
				<div className="tz-alert tz-alert--warning" role="note">
					<Info size={20} aria-hidden="true" />
					<span>
						<strong>{t('notice.approved.title')}</strong> {t('notice.approved.text')}
						<ul className="org-points">
							{(['content', 'tickets', 'locked', 'seats'] as const).map((key) => (
								<li key={key}>{t(`notice.approved.points.${key}`)}</li>
							))}
						</ul>
					</span>
				</div>
			)}
			{(status === 'CANCELLED' || status === 'ENDED') && (
				<p className="tz-alert tz-alert--info" role="note">
					<Lock size={20} aria-hidden="true" />
					<span>
						<strong>{t(`notice.${status === 'CANCELLED' ? 'cancelled' : 'ended'}.title`)}</strong>{' '}
						{status === 'CANCELLED' && event?.cancelReason ? t('notice.cancelled.reason', { reason: event.cancelReason }) : t(`notice.${status === 'CANCELLED' ? 'cancelled' : 'ended'}.text`)}
					</span>
				</p>
			)}

			<nav aria-label={t('form.stepsLabel')}>
				<ol className="org-steps">
					{STEPS.map((id, i) => (
						<li key={id}>
							<button type="button" className={`org-step ${id === step ? 'is-current' : ''} ${i < index ? 'is-done' : ''}`} aria-current={id === step ? 'step' : undefined} onClick={() => setStep(id)}>
								<span className="org-step__num" aria-hidden="true">
									{i < index ? <CheckCircle size={16} weight="fill" /> : i + 1}
								</span>
								<span>{t(`form.steps.${id}`)}</span>
							</button>
						</li>
					))}
				</ol>
			</nav>

			<section className="org-panel" aria-labelledby="step-title">
				<h2 id="step-title">{t(`form.steps.${step}`)}</h2>
				{serverError && (
					<p className="tz-alert tz-alert--error" role="alert">
						<WarningCircle size={20} aria-hidden="true" />
						<span>{serverError.network ? t('errors.network') : serverError.key ? t(`serverErrors.${serverError.key}`) : serverError.raw || t('errors.generic')}</span>
					</p>
				)}
				{errorCount > 0 && !readOnly && (
					<p className="tz-alert tz-alert--error" role="alert">
						<WarningCircle size={20} aria-hidden="true" />
						<span>
							{t('form.errorsSummary', { count: errorCount })}{' '}
							{STEPS.indexOf(stepOfError(Object.keys(errors)[0])) !== index && (
								<button type="button" className="tz-link org-linkbtn" onClick={() => setStep(stepOfError(Object.keys(errors)[0]))}>
									{t('form.goToFirst')}
								</button>
							)}
						</span>
					</p>
				)}
				{!event && step !== 'details' && !readOnly && <p className="org-hint">{t('form.firstDraftHint')}</p>}

				{step === 'details' && <StepDetails editor={editor} readOnly={readOnly} />}
				{step === 'images' && <StepImages editor={editor} readOnly={readOnly} />}
				{step === 'venue' && <StepVenue editor={editor} readOnly={readOnly} onCreateVenue={readOnly ? undefined : goCreateVenue} />}
				{step === 'tickets' && <StepTickets editor={editor} readOnly={readOnly} />}
				{step === 'translations' && <StepTranslations editor={editor} readOnly={readOnly} />}
				{step === 'review' && <StepReview editor={editor} readOnly={readOnly} onGo={setStep} />}

				<div className="org-actions">
					<Button variant="text" startIcon={<ArrowLeft size={20} aria-hidden="true" />} disabled={index === 0} onClick={() => setStep(STEPS[index - 1])}>
						{t('form.back')}
					</Button>
					<div className="org-actions__main">
						{!readOnly && (
							<Button variant="outlined" onClick={saveDraft} disabled={saving || !dirty}>
								{saving ? t('form.saving') : mode === 'review' ? t('form.saveChanges') : status === 'REJECTED' ? t('form.saveChanges') : t('form.saveDraft')}
							</Button>
						)}
						{step !== 'review' ? (
							<Button variant="contained" endIcon={<ArrowRight size={20} aria-hidden="true" />} onClick={next} disabled={saving}>
								{t('form.continue')}
							</Button>
						) : (
							<>
								{(status === 'DRAFT' || status === 'REJECTED') && (
									<Button variant="contained" onClick={openSubmit} disabled={saving || (!event && !dirty)}>
										{status === 'REJECTED' ? t('form.resubmit') : t('form.submit')}
									</Button>
								)}
								{status === 'APPROVED' && event && (
									<Button component={Link} href={eventUrl(event._id)} variant="outlined">
										{t('list.actions.publicPage')}
									</Button>
								)}
								{status === 'APPROVED' && (
									<Button variant="outlined" className="org-btn-danger" onClick={() => setCancelOpen(true)}>
										{t('list.actions.cancel')}
									</Button>
								)}
							</>
						)}
					</div>
				</div>
			</section>

			<SubmitDialog
				open={submitOpen}
				eventTitle={values.title}
				checks={checks}
				loading={submitting || saving}
				error={serverError}
				onClose={() => setSubmitOpen(false)}
				onConfirm={confirmSubmit}
			/>
			{event && (
				<CancelDialog
					open={cancelOpen}
					eventId={event._id}
					eventTitle={values.title}
					onClose={() => setCancelOpen(false)}
					// the page reloads so the form shows the event as cancelled, with its reason
					onCancelled={() => router.reload()}
				/>
			)}
			<Dialog open={Boolean(confirmReview)} onClose={() => setConfirmReview(null)} aria-labelledby="rereview-title" fullWidth maxWidth="xs">
				<DialogTitle id="rereview-title">{t('rereview.title')}</DialogTitle>
				<DialogContent>
					<p>{t('rereview.text')}</p>
					<ul className="org-points">
						{(['offSale', 'tickets', 'again'] as const).map((key) => (
							<li key={key}>{t(`rereview.points.${key}`)}</li>
						))}
					</ul>
				</DialogContent>
				<DialogActions className="org-dialog__actions">
					<Button variant="text" onClick={() => setConfirmReview(null)}>
						{t('rereview.cancel')}
					</Button>
					<Button
						variant="contained"
						onClick={() => {
							const run = confirmReview;
							setConfirmReview(null);
							run?.();
						}}
					>
						{t('rereview.confirm')}
					</Button>
				</DialogActions>
			</Dialog>
		</div>
	);
};

export default EventEditor;
