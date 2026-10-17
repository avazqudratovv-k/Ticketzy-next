import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { DownloadSimple, Info, Trash, WarningCircle } from 'phosphor-react';
import { accountDeletedVar } from '../../../apollo/store';
import { DELETE_MY_ACCOUNT } from '../../../apollo/user/mutation';
import { GET_MY_ACCOUNT_DELETION_CHECK } from '../../../apollo/user/query';
import { pauseSessionExpiry } from '../../auth/sessionExpired';
import { MemberType } from '../../enums/member.enum';
import { ACCOUNT_DELETE_BLOCKED, NETWORK_ERROR, parseApiError } from '../../errors';
import useAuth from '../../hooks/useAuth';
import useTicketDownload from '../../hooks/useTicketDownload';
import { AccountDeletionCheck, DeletionBlocker } from '../../types/account';

/** The word the backend wants in `confirmation` (backend #123). */
const CONFIRM_WORD = 'DELETE';
const KNOWN_REASONS = ['EVENTS_IN_REVIEW', 'EVENTS_NOT_ENDED', 'PAYOUTS_NOT_PAID'];

/** Why an organizer cannot delete yet: each reason with its count, the event names and what ends it. */
const Blockers = ({ blockers }: { blockers: DeletionBlocker[] }) => {
	const { t } = useTranslation('account');
	return (
		<ul className="del-blockers">
			{blockers.map((blocker) => {
				const key = KNOWN_REASONS.includes(blocker.reason) ? blocker.reason : 'OTHER';
				const extra = blocker.count - blocker.eventNames.length;
				return (
					<li key={blocker.reason} className="del-blockers__item">
						<p className="del-blockers__title">
							<strong>{t(`delete.reason.${key}.title`)}</strong> <span className="tz-badge tz-badge--warning">{blocker.count}</span>
						</p>
						<p className="breakdown__note">{t(`delete.reason.${key}.hint`)}</p>
						{blocker.eventNames.length > 0 && (
							<ul className="del-blockers__names">
								{blocker.eventNames.map((name, index) => (
									<li key={`${index}-${name}`}>{name}</li>
								))}
								{extra > 0 && <li className="del-blockers__more">{t('delete.more', { count: extra })}</li>}
							</ul>
						)}
					</li>
				);
			})}
		</ul>
	);
};

/**
 * Account settings, "Delete account" (F364). Asks the backend first (`getMyAccountDeletionCheck`): an organizer with open events
 * or payouts sees the reasons and no button; everyone else gets a confirm window (30-day email warning, type DELETE, Delete,
 * Cancel). A buyer with unused tickets gets that window full screen with a "Download all tickets" button in it. On success the
 * global closing window takes over (`accountDeletedVar`, AccountDeletedNotice), which ends the session and goes home.
 */
const DeleteAccount = () => {
	const { t } = useTranslation('account');
	const { user } = useAuth();
	const eligible = user?.memberType === MemberType.USER || user?.memberType === MemberType.ORGANIZER;
	const role = user?.memberType === MemberType.ORGANIZER ? 'ORGANIZER' : 'USER';
	const { data, loading, error, refetch } = useQuery<{ getMyAccountDeletionCheck: AccountDeletionCheck }>(GET_MY_ACCOUNT_DELETION_CHECK, {
		skip: !eligible,
		fetchPolicy: 'network-only',
	});
	const [remove] = useMutation(DELETE_MY_ACCOUNT);
	const download = useTicketDownload();
	const [open, setOpen] = useState(false);
	const [typed, setTyped] = useState('');
	const [busy, setBusy] = useState(false);
	const [failure, setFailure] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);

	const check = data?.getMyAccountDeletionCheck;
	const tickets = role === 'USER' ? check?.unusedUpcomingTickets ?? 0 : 0;
	const fullScreen = tickets > 0;
	const ready = typed.trim() === CONFIRM_WORD;

	useEffect(() => {
		if (!open) {
			setTyped('');
			setFailure(null);
		}
	}, [open]);

	if (!eligible) return null;

	const close = () => {
		if (!busy) setOpen(false);
	};

	const confirm = async () => {
		if (!ready || busy) return;
		setBusy(true);
		setFailure(null);
		try {
			await remove({ variables: { input: { confirmation: CONFIRM_WORD } } });
			// The server refuses the old token from now on: keep the closing window in charge of ending the session
			pauseSessionExpiry(true);
			setOpen(false);
			accountDeletedVar({ role });
		} catch (err) {
			const apiError = parseApiError(err);
			if (apiError.code === ACCOUNT_DELETE_BLOCKED) {
				setOpen(false);
				setNotice(t('delete.blockedNow'));
				void refetch();
			} else if (apiError.code === NETWORK_ERROR) setFailure(t('state.network'));
			else if (apiError.code === 'RATE_LIMITED') setFailure(t('delete.errors.rate'));
			else if (apiError.code === 'VALIDATION_FAILED') setFailure(t('delete.errors.confirmation'));
			else if (apiError.code === 'NOT_ALLOWED_REQUEST') setFailure(t('delete.errors.notAllowed'));
			else setFailure(t('delete.errors.generic'));
			setBusy(false);
		}
	};

	return (
		<section className="card settings__card" aria-labelledby="delete-heading">
			<h2 id="delete-heading" className="card__title">
				{t('delete.title')}
			</h2>
			{notice && (
				<p className="tz-alert tz-alert--warning" role="status">
					<WarningCircle size={20} aria-hidden="true" /> {notice}
				</p>
			)}
			{loading && !check ? (
				<span className="tz-skel tz-skel--text" style={{ width: '60%' }} aria-busy="true" />
			) : error && !check ? (
				<>
					<p className="tz-alert" role="alert">
						<WarningCircle size={20} aria-hidden="true" /> {parseApiError(error).code === NETWORK_ERROR ? t('state.network') : t('delete.checkError')}
					</p>
					<div>
						<Button variant="outlined" onClick={() => void refetch()}>
							{t('state.retry')}
						</Button>
					</div>
				</>
			) : check && !check.canDelete ? (
				<>
					<p className="tz-alert tz-alert--warning" role="note">
						<Info size={20} aria-hidden="true" /> {t('delete.blockedIntro')}
					</p>
					<Blockers blockers={check.blockers} />
				</>
			) : (
				<>
					<p className="breakdown__note">{t(role === 'ORGANIZER' ? 'delete.textOrganizer' : 'delete.textBuyer')}</p>
					<p className="breakdown__note">{t('delete.emailWarning')}</p>
					<div>
						<Button variant="outlined" className="org-btn-danger" startIcon={<Trash size={20} aria-hidden="true" />} onClick={() => setOpen(true)}>
							{t('delete.open')}
						</Button>
					</div>
				</>
			)}

			<Dialog
				open={open}
				onClose={close}
				fullScreen={fullScreen}
				fullWidth
				maxWidth="sm"
				aria-labelledby="delete-dialog-title"
				aria-describedby="delete-dialog-text"
				className={`tz-deldlg${fullScreen ? ' tz-deldlg--full' : ''}`}
			>
				<DialogTitle id="delete-dialog-title">{t('delete.dialogTitle')}</DialogTitle>
				<DialogContent>
					<div className="tz-deldlg__body">
						<p id="delete-dialog-text" className="tz-sr">
							{t('delete.dialogSr')}
						</p>
						{fullScreen && (
							<div className="tz-alert tz-alert--warning tz-deldlg__tickets">
								<span className="tz-alert__icon">
									<WarningCircle size={22} aria-hidden="true" />
								</span>
								<div>
									<p className="tz-alert__title">{t('delete.unusedTickets', { count: tickets })}</p>
									<div className="tz-deldlg__download">
										<Button
											variant="contained"
											startIcon={<DownloadSimple size={20} aria-hidden="true" />}
											className={download.busy ? 'tz-blocked' : undefined}
											aria-disabled={download.busy ? true : undefined}
											onClick={() => {
												if (!download.busy) void download.downloadAll();
											}}
										>
											{download.busy ? t('tickets.downloadingAll') : t('delete.downloadAll')}
										</Button>
									</div>
									<div role="status">
										{download.status?.kind === 'ok' && <p className="tz-alert__text">{t('tickets.downloadedAll', { count: download.status.count })}</p>}
										{download.status?.kind === 'none' && <p className="tz-alert__text">{t('tickets.downloadNone')}</p>}
										{download.status?.kind === 'error' && <p className="tz-alert__text">{t('ticket.downloadError')}</p>}
									</div>
								</div>
							</div>
						)}
						<div className="tz-alert tz-alert--danger">
							<span className="tz-alert__icon">
								<Info size={22} aria-hidden="true" />
							</span>
							<p className="tz-alert__title">{t('delete.emailWarning')}</p>
						</div>
						<label className="tz-field">
							<span className="tz-field__label">{t('delete.typeLabel', { word: CONFIRM_WORD })}</span>
							<input
								className="tz-input"
								value={typed}
								onChange={(event) => setTyped(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault();
										void confirm();
									}
								}}
								autoComplete="off"
								autoCapitalize="off"
								autoCorrect="off"
								spellCheck={false}
								inputMode="text"
								name="delete-confirmation"
								aria-label={t('delete.typeAria', { word: CONFIRM_WORD })}
								disabled={busy}
							/>
						</label>
						{failure && (
							<p className="tz-alert tz-alert--danger" role="alert">
								<WarningCircle size={20} aria-hidden="true" /> {failure}
							</p>
						)}
					</div>
				</DialogContent>
				<DialogActions className="tz-deldlg__actions">
					<Button variant="outlined" onClick={close} disabled={busy}>
						{t('delete.cancel')}
					</Button>
					<Button
						variant="contained"
						className={ready ? 'org-btn-danger-solid' : 'tz-blocked'}
						aria-disabled={ready ? undefined : true}
						disabled={busy}
						onClick={() => void confirm()}
					>
						{busy ? t('delete.deleting') : t('delete.confirm')}
					</Button>
				</DialogActions>
			</Dialog>
		</section>
	);
};

export default DeleteAccount;
