import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useApolloClient } from '@apollo/client';
import { Button, Drawer, IconButton } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { CheckCircle, Prohibit, ArrowCounterClockwise, WarningCircle, X, XCircle } from 'phosphor-react';
import MemberStatusBadge from './MemberStatusBadge';
import ReasonDialog from './ReasonDialog';
import {
	REINSTATE_ORGANIZER_BY_ADMIN,
	REJECT_ORGANIZER_BY_ADMIN,
	SUSPEND_ORGANIZER_BY_ADMIN,
	VERIFY_ORGANIZER_BY_ADMIN,
} from '../../../apollo/admin/mutation';
import { organizerActions } from '../../admin/organizers';
import { effectiveRate, overrideActive } from '../../admin/commission';
import { AdminError, describeAdminError } from '../../admin/errors';
import { AdminOrganizer, organizerName } from '../../admin/types';
import { formatNumber, formatViewerDate } from '../../format';
import { imageSrc } from '../events/EventImage';

interface Props {
	organizer: AdminOrganizer | null;
	onClose: () => void;
	/** Called with the organizer as the server returned it after an action */
	onChanged: (organizer: AdminOrganizer, message: string) => void;
}

type Dialog = 'reject' | 'suspend' | null;

/** One organizer in full with the approval actions the backend allows from the current status. */
const OrganizerDrawer = ({ organizer, onClose, onChanged }: Props) => {
	const { t } = useTranslation('admin');
	const { locale } = useRouter();
	const client = useApolloClient();
	const [dialog, setDialog] = useState<Dialog>(null);
	const [busy, setBusy] = useState<'approve' | 'reinstate' | null>(null);
	const [error, setError] = useState<AdminError | null>(null);

	useEffect(() => {
		setDialog(null);
		setError(null);
		setBusy(null);
	}, [organizer?._id]);

	const name = organizerName(organizer);
	const actions = organizer ? organizerActions(organizer.memberStatus) : null;
	const rate = organizer ? effectiveRate(organizer) : null;

	const run = async (kind: 'approve' | 'reinstate') => {
		if (!organizer) return;
		setBusy(kind);
		setError(null);
		try {
			const result = await client.mutate({
				mutation: kind === 'approve' ? VERIFY_ORGANIZER_BY_ADMIN : REINSTATE_ORGANIZER_BY_ADMIN,
				variables: { memberId: organizer._id },
			});
			const updated = result.data?.[kind === 'approve' ? 'verifyOrganizerByAdmin' : 'reinstateOrganizerByAdmin'] as AdminOrganizer;
			onChanged(updated, t(`organizers.notice.${kind === 'approve' ? 'approved' : 'reinstated'}`, { name }));
		} catch (err) {
			setError(describeAdminError(err));
		} finally {
			setBusy(null);
		}
	};

	const withReason = (kind: 'reject' | 'suspend') => async (reason: string) => {
		if (!organizer) return;
		const result = await client.mutate({
			mutation: kind === 'reject' ? REJECT_ORGANIZER_BY_ADMIN : SUSPEND_ORGANIZER_BY_ADMIN,
			variables: { input: { memberId: organizer._id, reason } },
		});
		const updated = result.data?.[kind === 'reject' ? 'rejectOrganizerByAdmin' : 'suspendOrganizerByAdmin'] as AdminOrganizer;
		setDialog(null);
		onChanged(updated, t(`organizers.notice.${kind === 'reject' ? 'rejected' : 'suspended'}`, { name }));
	};

	return (
		<>
			<Drawer anchor="right" open={Boolean(organizer)} onClose={onClose} PaperProps={{ className: 'org-drawer', role: 'dialog', 'aria-labelledby': 'org-drawer-title' } as object}>
				{organizer && actions && rate && (
					<>
						<div className="org-drawer__head">
							<div>
								<h2 id="org-drawer-title">{name}</h2>
								<MemberStatusBadge status={organizer.memberStatus} />
							</div>
							<IconButton onClick={onClose} aria-label={t('organizers.drawer.close')}>
								<X size={22} aria-hidden="true" />
							</IconButton>
						</div>
						<div className="org-drawer__body">
							{organizer.memberImage && (
								// eslint-disable-next-line @next/next/no-img-element
								<img className="adm-avatar" src={imageSrc(organizer.memberImage)} alt="" />
							)}
							<dl className="org-dl">
								<div>
									<dt>{t('organizers.drawer.email')}</dt>
									<dd>{organizer.memberEmail || '–'}</dd>
								</div>
								<div>
									<dt>{t('organizers.drawer.phone')}</dt>
									<dd>{organizer.memberPhone || '–'}</dd>
								</div>
								<div>
									<dt>{t('organizers.drawer.nick')}</dt>
									<dd>{organizer.memberNick || '–'}</dd>
								</div>
								<div>
									<dt>{t('organizers.drawer.registered')}</dt>
									<dd>{formatViewerDate(organizer.createdAt, locale, true)}</dd>
								</div>
								<div>
									<dt>{t('organizers.drawer.events')}</dt>
									<dd>{formatNumber(organizer.memberEvents, locale)}</dd>
								</div>
								<div>
									<dt>{t('organizers.drawer.completed')}</dt>
									<dd>{formatNumber(organizer.completedEvents, locale)}</dd>
								</div>
								<div>
									<dt>{t('organizers.drawer.followers')}</dt>
									<dd>{formatNumber(organizer.memberFollowers, locale)}</dd>
								</div>
								<div>
									<dt>{t('organizers.drawer.rate')}</dt>
									<dd>
										{t('percent', { value: formatNumber(rate.rate, locale) })} · {t(`commission.source.${rate.source}`)}
									</dd>
								</div>
							</dl>
							{organizer.commissionOverride && (
								<p className="adm-muted">
									{overrideActive(organizer.commissionOverride)
										? t('commission.overrideLine', {
												rate: formatNumber(organizer.commissionOverride.rate, locale),
												until: organizer.commissionOverride.endsAt ? formatViewerDate(organizer.commissionOverride.endsAt, locale, true) : t('commission.noEnd'),
												reason: organizer.commissionOverride.reason,
										  })
										: t('commission.overrideExpired', { rate: formatNumber(organizer.commissionOverride.rate, locale) })}
								</p>
							)}
							{organizer.memberDesc && (
								<>
									<h3 className="org-drawer__sub">{t('organizers.drawer.about')}</h3>
									<p className="adm-lang__text">{organizer.memberDesc}</p>
								</>
							)}
							{organizer.memberStatus === 'REJECTED' && organizer.rejectReason && (
								<p className="tz-alert tz-alert--error" role="note">
									<XCircle size={20} aria-hidden="true" />
									<span>
										<strong>{t('organizers.drawer.rejectedWith')}</strong> {organizer.rejectReason}
									</span>
								</p>
							)}
							{error && (
								<p className="tz-alert tz-alert--error" role="alert">
									<WarningCircle size={20} aria-hidden="true" />
									<span>{error.network ? t('errors.network') : error.key ? t(`serverErrors.${error.key}`) : error.raw || t('errors.generic')}</span>
								</p>
							)}
							<div className="adm-actions">
								{actions.approve && (
									<Button variant="contained" startIcon={<CheckCircle size={20} aria-hidden="true" />} onClick={() => run('approve')} disabled={busy !== null}>
										{busy === 'approve' ? t('organizers.sending') : t('organizers.actions.approve')}
									</Button>
								)}
								{actions.reject && (
									<Button variant="outlined" className="org-btn-danger" startIcon={<XCircle size={20} aria-hidden="true" />} onClick={() => setDialog('reject')} disabled={busy !== null}>
										{t('organizers.actions.reject')}
									</Button>
								)}
								{actions.suspend && (
									<Button variant="outlined" className="org-btn-danger" startIcon={<Prohibit size={20} aria-hidden="true" />} onClick={() => setDialog('suspend')} disabled={busy !== null}>
										{t('organizers.actions.suspend')}
									</Button>
								)}
								{actions.reinstate && (
									<Button variant="contained" startIcon={<ArrowCounterClockwise size={20} aria-hidden="true" />} onClick={() => run('reinstate')} disabled={busy !== null}>
										{busy === 'reinstate' ? t('organizers.sending') : t('organizers.actions.reinstate')}
									</Button>
								)}
								{organizer.memberStatus === 'ACTIVE' && (
									<Button component={Link} href={`/admin/commission?q=${encodeURIComponent(organizer.memberNick || organizer.memberEmail || '')}`} variant="outlined">
										{t('organizers.actions.commission')}
									</Button>
								)}
							</div>
							<p className="adm-muted">{t(`organizers.hint.${organizer.memberStatus}`)}</p>
						</div>
					</>
				)}
			</Drawer>
			<ReasonDialog
				open={dialog === 'reject'}
				title={t('organizers.reject.title')}
				subject={name}
				reasonLabel={t('organizers.reject.reasonLabel')}
				reasonHint={t('organizers.reject.reasonHint')}
				reasonRequired={t('organizers.reject.reasonRequired')}
				confirmLabel={t('organizers.reject.confirm')}
				sendingLabel={t('organizers.sending')}
				cancelLabel={t('actions.back')}
				danger
				onClose={() => setDialog(null)}
				onSubmit={withReason('reject')}
			>
				<p>{t('organizers.reject.text')}</p>
			</ReasonDialog>
			<ReasonDialog
				open={dialog === 'suspend'}
				title={t('organizers.suspend.title')}
				subject={name}
				reasonLabel={t('organizers.suspend.reasonLabel')}
				reasonHint={t('organizers.suspend.reasonHint')}
				reasonRequired={t('organizers.suspend.reasonRequired')}
				confirmLabel={t('organizers.suspend.confirm')}
				sendingLabel={t('organizers.sending')}
				cancelLabel={t('actions.back')}
				danger
				onClose={() => setDialog(null)}
				onSubmit={withReason('suspend')}
			>
				<p>{t('organizers.suspend.text')}</p>
			</ReasonDialog>
		</>
	);
};

export default OrganizerDrawer;
