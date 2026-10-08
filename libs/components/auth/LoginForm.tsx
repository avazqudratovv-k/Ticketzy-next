import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import Field from '../common/Field';
import AuthError from './AuthError';
import { logIn } from '../../auth';
import { ApiError, isApiError, parseApiError } from '../../errors';
import { ROUTES } from '../../routes';
import { EMAIL_PATTERN } from './validation';

const LoginForm = () => {
	const { t } = useTranslation('auth');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
	const [formError, setFormError] = useState<ApiError | null>(null);
	const [busy, setBusy] = useState(false);

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (busy) return;
		const errors: { email?: string; password?: string } = {};
		if (!email.trim()) errors.email = t('errors.required');
		else if (!EMAIL_PATTERN.test(email.trim())) errors.email = t('errors.emailInvalid');
		if (!password) errors.password = t('errors.required');
		setFieldErrors(errors);
		setFormError(null);
		if (errors.email || errors.password) return;

		setBusy(true);
		try {
			// On success userVar changes and useRedirectIfSignedIn on the page does the navigation.
			await logIn(email, password);
		} catch (err) {
			setFormError(isApiError(err) ? err : parseApiError(err));
			setBusy(false);
		}
	};

	return (
		<form className="pg-auth__form" onSubmit={submit} noValidate>
			<AuthError error={formError} />
			<Field
				label={t('fields.email')}
				type="email"
				name="email"
				value={email}
				onChange={setEmail}
				placeholder={t('fields.emailPlaceholder')}
				autoComplete="email"
				error={fieldErrors.email}
				disabled={busy}
				autoFocus
			/>
			<Field
				label={t('fields.password')}
				type="password"
				name="password"
				value={password}
				onChange={setPassword}
				autoComplete="current-password"
				error={fieldErrors.password}
				disabled={busy}
			/>
			<Button type="submit" variant="contained" size="large" fullWidth disabled={busy}>
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
