import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Checkbox } from '@mui/material';
import { Trans, useTranslation } from 'next-i18next';
import { CalendarPlus, Check, Clock, Ticket } from 'phosphor-react';
import Field from '../common/Field';
import AuthError from './AuthError';
import { signUp } from '../../auth';
import { ApiError, isApiError, parseApiError } from '../../errors';
import { MemberType } from '../../enums/member.enum';
import { ROUTES } from '../../routes';
import { EMAIL_PATTERN, MIN_PASSWORD_LENGTH } from './validation';
import useAdoptTypedValues from '../../hooks/useAdoptTypedValues';

type Role = MemberType.USER | MemberType.ORGANIZER;
type FieldName = 'fullName' | 'organization' | 'email' | 'password' | 'terms';

interface SignupFormProps {
	initialRole: Role;
	/** Called after the account exists; the page decides what comes next. */
	onDone: (role: Role) => void;
}

const SignupForm = ({ initialRole, onDone }: SignupFormProps) => {
	const { t } = useTranslation('auth');
	const [role, setRole] = useState<Role>(initialRole);
	const [fullName, setFullName] = useState('');
	const [organization, setOrganization] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [agree, setAgree] = useState(false);
	const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
	const [formError, setFormError] = useState<ApiError | null>(null);
	const [busy, setBusy] = useState(false);
	const form = useRef<HTMLFormElement>(null);
	const hydrated = useAdoptTypedValues(form, { fullName: setFullName, email: setEmail, password: setPassword });
	const isOrganizer = role === MemberType.ORGANIZER;

	const validate = () => {
		const next: Partial<Record<FieldName, string>> = {};
		if (!fullName.trim()) next.fullName = t('errors.required');
		if (isOrganizer && !organization.trim()) next.organization = t('errors.required');
		if (!email.trim()) next.email = t('errors.required');
		else if (!EMAIL_PATTERN.test(email.trim())) next.email = t('errors.emailInvalid');
		if (!password) next.password = t('errors.required');
		else if (password.length < MIN_PASSWORD_LENGTH) next.password = t('errors.passwordShort');
		if (!agree) next.terms = t('errors.termsRequired');
		setErrors(next);
		return Object.keys(next).length === 0;
	};

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (busy) return;
		setFormError(null);
		if (!validate()) return;

		setBusy(true);
		try {
			// The design has no separate nickname: the organization name becomes memberNick (see DECISIONS).
			await signUp(role, {
				memberEmail: email,
				memberPassword: password,
				memberFullName: fullName.trim(),
				...(isOrganizer ? { memberNick: organization.trim() } : {}),
			});
			onDone(role);
		} catch (err) {
			setFormError(isApiError(err) ? err : parseApiError(err));
			setBusy(false);
		}
	};

	const roleOption = (value: Role, icon: React.ReactNode, titleKey: string, textKey: string) => (
		<button
			type="button"
			role="tab"
			id={`role-${value}`}
			aria-selected={role === value}
			aria-controls="signup-panel"
			tabIndex={role === value ? 0 : -1}
			className="pg-role"
			disabled={busy}
			onClick={() => setRole(value)}
		>
			<span className="pg-role__top">
				{icon}
				<span className="pg-role__check" aria-hidden="true">
					<Check size={14} weight="bold" />
				</span>
			</span>
			<span className="pg-role__title">{t(titleKey)}</span>
			<span className="pg-role__desc">{t(textKey)}</span>
		</button>
	);

	return (
		<form ref={form} className="pg-auth__form" method="post" onSubmit={submit} noValidate>
			<div>
				<div className="pg-roles__label" id="signup-roles-label">
					{t('signup.whatBringsYou')}
				</div>
				<div className="pg-roles" role="tablist" aria-labelledby="signup-roles-label">
					{roleOption(MemberType.USER, <Ticket size={24} aria-hidden="true" />, 'signup.buyer.title', 'signup.buyer.text')}
					{roleOption(
						MemberType.ORGANIZER,
						<CalendarPlus size={24} aria-hidden="true" />,
						'signup.organizer.title',
						'signup.organizer.text',
					)}
				</div>
			</div>

			<div id="signup-panel" role="tabpanel" aria-labelledby={`role-${role}`} style={{ display: 'contents' }}>
				{isOrganizer && (
					<div className="tz-alert tz-alert--warning">
						<span className="tz-alert__icon">
							<Clock size={18} aria-hidden="true" />
						</span>
						<div>
							<div className="tz-alert__title">{t('signup.approvalTitle')}</div>
							<div className="tz-alert__text">{t('signup.approvalText')}</div>
						</div>
					</div>
				)}
				<AuthError error={formError} />
				<Field
					label={t('signup.fullName')}
					name="fullName"
					value={fullName}
					onChange={setFullName}
					autoComplete="name"
					error={errors.fullName}
					disabled={busy}
				/>
				{isOrganizer && (
					<Field
						label={t('signup.organizationName')}
						name="organization"
						value={organization}
						onChange={setOrganization}
						autoComplete="organization"
						hint={t('signup.organizationHint')}
						error={errors.organization}
						disabled={busy}
					/>
				)}
				<Field
					label={t('fields.email')}
					type="email"
					name="email"
					value={email}
					onChange={setEmail}
					placeholder={t('fields.emailPlaceholder')}
					autoComplete="email"
					error={errors.email}
					disabled={busy}
				/>
				<Field
					label={t('fields.password')}
					type="password"
					name="password"
					value={password}
					onChange={setPassword}
					autoComplete="new-password"
					hint={t('signup.passwordHint')}
					error={errors.password}
					disabled={busy}
				/>
				<div className="tz-field">
					<div className="pg-auth__terms">
						<Checkbox
							id="signup-terms"
							checked={agree}
							onChange={(event) => setAgree(event.target.checked)}
							disabled={busy}
							inputProps={{ 'aria-invalid': errors.terms ? true : undefined, 'aria-describedby': errors.terms ? 'signup-terms-error' : undefined }}
						/>
						<label htmlFor="signup-terms">
							<Trans
								t={t}
								i18nKey="signup.agree"
								components={{
									terms: <Link href="/terms" className="tz-link" />,
									privacy: <Link href="/privacy" className="tz-link" />,
								}}
							/>
						</label>
					</div>
					{errors.terms && (
						<span className="tz-field__error" id="signup-terms-error">
							{errors.terms}
						</span>
					)}
				</div>
				<Button type="submit" variant="contained" size="large" fullWidth disabled={busy || !hydrated}>
					{busy ? t('signup.submitting') : isOrganizer ? t('signup.submitOrganizer') : t('signup.submitBuyer')}
				</Button>
				<p className="pg-auth__switch">
					{t('signup.haveAccount')}{' '}
					<Link href={ROUTES.login} className="tz-link">
						{t('signup.signIn')}
					</Link>
				</p>
			</div>
		</form>
	);
};

export default SignupForm;
