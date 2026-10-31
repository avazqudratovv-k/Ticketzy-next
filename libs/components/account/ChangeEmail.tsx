import React, { useRef, useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { CheckCircle } from 'phosphor-react';
import Field from '../common/Field';
import AuthError from '../auth/AuthError';
import { EMAIL_PATTERN } from '../auth/validation';
import useAuth from '../../hooks/useAuth';
import useFocusInvalid from '../../hooks/useFocusInvalid';
import { requestEmailChange } from '../../auth/emailAuth';
import { ApiError, EMAIL_CHANGE_SAME_MESSAGE, EMAIL_RECENTLY_DELETED, parseApiError, WRONG_PASSWORD_MESSAGE } from '../../errors';
import { FieldIssues, fieldMessage, RECENTLY_DELETED_RULE, serverIssues } from '../../fieldErrors';

const FORM_FIELDS = ['newEmail', 'currentPassword'] as const;
const SAME = 'sameEmail';
const WRONG = 'wrongPassword';
const USED = 'usedEmail';

/**
 * Settings card "Change email": the new address and the current password. The link goes to the NEW address; the old one stays
 * in use until the link is opened (backend #135), and the card says so before and after.
 */
const ChangeEmail = () => {
	const { t } = useTranslation('account');
	const { user } = useAuth();
	const [newEmail, setNewEmail] = useState('');
	const [password, setPassword] = useState('');
	const [issues, setIssues] = useState<FieldIssues>({});
	const [formError, setFormError] = useState<ApiError | null>(null);
	const [sentTo, setSentTo] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const form = useRef<HTMLFormElement>(null);
	const focusInvalid = useFocusInvalid(form);

	const message = (field: string) => {
		const rule = issues[field];
		if (!rule) return undefined;
		if (rule === SAME) return t('changeEmail.same');
		if (rule === WRONG) return t('changeEmail.wrongPassword');
		if (rule === USED) return t('changeEmail.used');
		return fieldMessage(t, field, rule);
	};
	const edit = (field: string, set: (value: string) => void) => (value: string) => {
		set(value);
		setIssues((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
		setSentTo(null);
	};

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (busy) return;
		setFormError(null);
		setSentTo(null);
		const found: FieldIssues = {};
		if (!newEmail.trim()) found.newEmail = 'isNotEmpty';
		else if (!EMAIL_PATTERN.test(newEmail.trim())) found.newEmail = 'isEmail';
		else if (newEmail.trim().toLowerCase() === (user?.memberEmail ?? '').toLowerCase()) found.newEmail = SAME;
		if (!password) found.currentPassword = 'isNotEmpty';
		setIssues(found);
		if (Object.keys(found).length > 0) {
			focusInvalid();
			return;
		}
		setBusy(true);
		try {
			await requestEmailChange(newEmail, password);
			setSentTo(newEmail.trim().toLowerCase());
			setNewEmail('');
			setPassword('');
		} catch (err) {
			const apiError = parseApiError(err);
			let next: FieldIssues = {};
			let banner = true;
			if (apiError.message === WRONG_PASSWORD_MESSAGE) {
				next = { currentPassword: WRONG };
				banner = false;
			} else if (apiError.message === EMAIL_CHANGE_SAME_MESSAGE) {
				next = { newEmail: SAME };
				banner = false;
			} else if (apiError.code === EMAIL_RECENTLY_DELETED) {
				next = { newEmail: RECENTLY_DELETED_RULE };
				banner = false;
			} else if (/^Already used|already in use/i.test(apiError.message)) {
				next = { newEmail: USED };
				banner = false;
			} else {
				const found = serverIssues(apiError, FORM_FIELDS);
				next = found.issues;
				banner = found.banner;
			}
			setIssues(next);
			setFormError(banner ? apiError : null);
			if (Object.keys(next).length > 0) focusInvalid();
		} finally {
			setBusy(false);
		}
	};

	if (!user) return null;

	return (
		<form ref={form} className="card settings__card" onSubmit={submit} noValidate aria-labelledby="email-heading" aria-busy={busy || undefined}>
			<h2 id="email-heading" className="card__title">
				{t('changeEmail.title')}
			</h2>
			<p className="breakdown__note">{t('changeEmail.explain', { email: user.memberEmail ?? '' })}</p>
			<AuthError error={formError} />
			<Field label={t('changeEmail.newEmail')} type="email" name="newEmail" value={newEmail} onChange={edit('newEmail', setNewEmail)} autoComplete="email" error={message('newEmail')} disabled={busy} />
			<Field
				label={t('changeEmail.currentPassword')}
				type="password"
				name="currentPassword"
				value={password}
				onChange={edit('currentPassword', setPassword)}
				autoComplete="current-password"
				hint={t('changeEmail.passwordHint')}
				error={message('currentPassword')}
				disabled={busy}
			/>
			<div role="status" className="settings__status">
				{sentTo && (
					<p className="tz-alert tz-alert--success">
						<CheckCircle size={20} aria-hidden="true" /> {t('changeEmail.sent', { email: sentTo, current: user.memberEmail ?? '' })}
					</p>
				)}
			</div>
			<div>
				<Button type="submit" variant="contained" disabled={busy} startIcon={busy ? <CircularProgress className="tz-btn-spinner" size={18} color="inherit" aria-hidden="true" /> : undefined}>
					{busy ? t('changeEmail.sending') : t('changeEmail.submit')}
				</Button>
			</div>
		</form>
	);
};

export default ChangeEmail;
