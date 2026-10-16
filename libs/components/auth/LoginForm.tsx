import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Info } from 'phosphor-react';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import Field from '../common/Field';
import AuthError from './AuthError';
import { logIn } from '../../auth';
import { ApiError, isApiError, parseApiError } from '../../errors';
import { ROUTES } from '../../routes';
import { EMAIL_PATTERN } from './validation';
import { FieldIssues, fieldMessage, serverIssues } from '../../fieldErrors';
import useAdoptTypedValues from '../../hooks/useAdoptTypedValues';
import useFocusInvalid from '../../hooks/useFocusInvalid';

const FORM_FIELDS = ['memberEmail', 'memberPassword'] as const;

const LoginForm = () => {
	const { t } = useTranslation('auth');
	const expired = useRouter().query.reason === 'expired';
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [issues, setIssues] = useState<FieldIssues>({});
	const [formError, setFormError] = useState<ApiError | null>(null);
	const [busy, setBusy] = useState(false);
	const [forgotOpen, setForgotOpen] = useState(false);
	const form = useRef<HTMLFormElement>(null);
	const hydrated = useAdoptTypedValues(form, { email: setEmail, password: setPassword });
	const focusInvalid = useFocusInvalid(form);
	const message = (field: string) => (issues[field] ? fieldMessage(t, field, issues[field]) : undefined);
	const edit = (field: string, set: (value: string) => void) => (value: string) => {
		set(value);
		setIssues((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
	};

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (busy) return;
		const found: FieldIssues = {};
		if (!email.trim()) found.memberEmail = 'isNotEmpty';
		else if (!EMAIL_PATTERN.test(email.trim())) found.memberEmail = 'isEmail';
		if (!password) found.memberPassword = 'isNotEmpty';
		setIssues(found);
		setFormError(null);
		if (found.memberEmail || found.memberPassword) {
			focusInvalid();
			return;
		}

		setBusy(true);
		try {
			// On success userVar changes and useRedirectIfSignedIn on the page does the navigation.
			await logIn(email, password);
		} catch (err) {
			const apiError = isApiError(err) ? err : parseApiError(err);
			const { issues: fromServer, banner } = serverIssues(apiError, FORM_FIELDS);
			setIssues(fromServer);
			setFormError(banner ? apiError : null);
			if (Object.keys(fromServer).length > 0) focusInvalid();
			setBusy(false);
		}
	};

	return (
		<form ref={form} className="pg-auth__form" method="post" onSubmit={submit} noValidate>
			{expired && !formError && (
				<div className="tz-alert tz-alert--info" role="status">
					<span className="tz-alert__icon">
						<Info size={18} weight="fill" aria-hidden="true" />
					</span>
					<span className="tz-alert__title">{t('errors.sessionExpired')}</span>
				</div>
			)}
			<AuthError error={formError} />
			<Field
				label={t('fields.email')}
				type="email"
				name="email"
				value={email}
				onChange={edit('memberEmail', setEmail)}
				placeholder={t('fields.emailPlaceholder')}
				autoComplete="email"
				error={message('memberEmail')}
				disabled={busy}
				autoFocus
			/>
			<Field
				label={t('fields.password')}
				type="password"
				name="password"
				value={password}
				onChange={edit('memberPassword', setPassword)}
				autoComplete="current-password"
				error={message('memberPassword')}
				disabled={busy}
			/>
			<div className="pg-auth__forgot">
				<button type="button" className="pg-auth__forgot-btn" aria-expanded={forgotOpen} aria-controls="login-forgot" onClick={() => setForgotOpen((open) => !open)}>
					{t('login.forgot')}
				</button>
				{forgotOpen && (
					<div id="login-forgot" className="tz-alert tz-alert--info">
						<span className="tz-alert__icon">
							<Info size={18} weight="fill" aria-hidden="true" />
						</span>
						<span className="tz-alert__title">
							{t('login.forgotText')}{' '}
							<Link href={ROUTES.contact}>{t('login.forgotCta')}</Link>
						</span>
					</div>
				)}
			</div>
			<Button type="submit" variant="contained" size="large" fullWidth disabled={busy || !hydrated}>
				{busy ? t('login.submitting') : t('login.submit')}
			</Button>
			<p className="pg-auth__divider">{t('login.newHere')}</p>
			<Button component={Link} href={ROUTES.signup} variant="outlined" size="large" fullWidth>
				{t('login.createAccount')}
			</Button>
		</form>
	);
};

export default LoginForm;
