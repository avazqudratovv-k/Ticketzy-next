import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Checkbox } from '@mui/material';
import { Trans, useTranslation } from 'next-i18next';
import { CalendarPlus, Check, Clock, Ticket } from 'phosphor-react';
import Field from '../common/Field';
import AuthError from './AuthError';
import { signUp } from '../../auth';
import { ApiError, EMAIL_RECENTLY_DELETED, isApiError, parseApiError } from '../../errors';
import { MemberType } from '../../enums/member.enum';
import { ROUTES } from '../../routes';
import { EMAIL_PATTERN } from './validation';
import { FieldIssues, fieldMessage, lengthRule, RECENTLY_DELETED_RULE, serverIssues } from '../../fieldErrors';
import useAdoptTypedValues from '../../hooks/useAdoptTypedValues';
import useFocusInvalid from '../../hooks/useFocusInvalid';

type Role = MemberType.USER | MemberType.ORGANIZER;
/** The inputs of this form, by backend property name (the organization name is sent as `memberNick`, F21). */
const FORM_FIELDS = ['memberFullName', 'memberNick', 'memberEmail', 'memberPassword'] as const;

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
	const [issues, setIssues] = useState<FieldIssues>({});
	const [termsError, setTermsError] = useState(false);
	const [formError, setFormError] = useState<ApiError | null>(null);
	const [busy, setBusy] = useState(false);
	const form = useRef<HTMLFormElement>(null);
	const hydrated = useAdoptTypedValues(form, { fullName: setFullName, email: setEmail, password: setPassword });
	const focusInvalid = useFocusInvalid(form);
	const isOrganizer = role === MemberType.ORGANIZER;

	const message = (field: string) => (issues[field] ? fieldMessage(t, field, issues[field]) : undefined);
	/** Typing into a field clears its own issue only. */
	const edit = (field: string, set: (value: string) => void) => (value: string) => {
		set(value);
		setIssues((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
	};

	const validate = () => {
		const next: FieldIssues = {};
		const rule = (field: string, found: string | null) => {
			if (found) next[field] = found;
		};
		rule('memberFullName', lengthRule('memberFullName', fullName));
		if (isOrganizer) rule('memberNick', lengthRule('memberNick', organization));
		rule('memberEmail', !email.trim() ? 'isNotEmpty' : EMAIL_PATTERN.test(email.trim()) ? null : 'isEmail');
		rule('memberPassword', !password ? 'isNotEmpty' : lengthRule('memberPassword', password));
		setIssues(next);
		setTermsError(!agree);
		if (Object.keys(next).length > 0 || !agree) {
			focusInvalid();
			return false;
		}
		return true;
	};

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (busy) return;
		setFormError(null);
		setIssues({});
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
			const apiError = isApiError(err) ? err : parseApiError(err);
			// A recently deleted email is shown under the email field, with our own text (no dates, backend #124)
			const recentlyDeleted = apiError.code === EMAIL_RECENTLY_DELETED;
			const { issues: found, banner: serverBanner } = serverIssues(apiError, FORM_FIELDS);
			const fromServer = recentlyDeleted ? { memberEmail: RECENTLY_DELETED_RULE } : found;
			const banner = recentlyDeleted ? false : serverBanner;
			setIssues(fromServer);
			setFormError(banner ? apiError : null);
			if (Object.keys(fromServer).length > 0) focusInvalid();
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
					onChange={edit('memberFullName', setFullName)}
					autoComplete="name"
					error={message('memberFullName')}
					disabled={busy}
				/>
				{isOrganizer && (
					<Field
						label={t('signup.organizationName')}
						name="organization"
						value={organization}
						onChange={edit('memberNick', setOrganization)}
						autoComplete="organization"
						hint={t('signup.organizationHint')}
						error={message('memberNick')}
						disabled={busy}
					/>
				)}
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
				/>
				<Field
					label={t('fields.password')}
					type="password"
					name="password"
					value={password}
					onChange={edit('memberPassword', setPassword)}
					autoComplete="new-password"
					hint={t('signup.passwordHint')}
					error={message('memberPassword')}
					disabled={busy}
				/>
				<div className="tz-field">
					<div className="pg-auth__terms">
						<Checkbox
							id="signup-terms"
							checked={agree}
							onChange={(event) => {
								setAgree(event.target.checked);
								setTermsError(false);
							}}
							disabled={busy}
							inputProps={{ 'aria-invalid': termsError ? true : undefined, 'aria-describedby': termsError ? 'signup-terms-error' : undefined }}
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
					{termsError && (
						<span className="tz-field__error" id="signup-terms-error">
							{t('errors.termsRequired')}
						</span>
					)}
				</div>
				<p className="tz-field__hint">{t('signup.noEmail')}</p>
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
