import React, { useRef, useState } from 'react';
import { NextPage, GetStaticPropsContext } from 'next';
import Link from 'next/link';
import { Button, CircularProgress } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { CheckCircle, EnvelopeSimple } from 'phosphor-react';
import Seo from '../libs/components/common/Seo';
import NoReferrer from '../libs/components/common/NoReferrer';
import withLayoutBasic from '../libs/components/layout/LayoutBasic';
import Field from '../libs/components/common/Field';
import AuthError from '../libs/components/auth/AuthError';
import StatusScreen from '../libs/components/auth/StatusScreen';
import useAdoptTypedValues from '../libs/hooks/useAdoptTypedValues';
import useFocusInvalid from '../libs/hooks/useFocusInvalid';
import useLinkToken from '../libs/hooks/useLinkToken';
import { resetPasswordWithToken } from '../libs/auth/emailAuth';
import { ApiError, INVALID_OR_EXPIRED_TOKEN, parseApiError, VALIDATION_FAILED } from '../libs/errors';
import { FieldIssues, fieldMessage, lengthRule } from '../libs/fieldErrors';
import { ROUTES } from '../libs/routes';

export const getStaticProps = async ({ locale }: GetStaticPropsContext) => ({
	props: {
		...(await serverSideTranslations(locale ?? 'en', ['common', 'auth'])),
	},
});

const MISMATCH = 'passwordMismatch';

interface FormProps {
	token: string;
	onDone: () => void;
	onSpent: () => void;
}

/**
 * The form is its own component so that it mounts when the token is known: `useAdoptTypedValues` looks at the form once,
 * on mount, and a form that appears later (after the token was read) would leave the submit button disabled for good.
 */
const ResetForm = ({ token, onDone, onSpent }: FormProps) => {
	const { t } = useTranslation('auth');
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [issues, setIssues] = useState<FieldIssues>({});
	const [formError, setFormError] = useState<ApiError | null>(null);
	const [busy, setBusy] = useState(false);
	const form = useRef<HTMLFormElement>(null);
	const hydrated = useAdoptTypedValues(form, { password: setPassword, confirm: setConfirm });
	const focusInvalid = useFocusInvalid(form);

	const message = (field: string) =>
		issues[field] === MISMATCH ? t('reset.mismatch') : issues[field] ? fieldMessage(t, 'memberPassword', issues[field] as string) : undefined;

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (busy) return;
		setFormError(null);
		const found: FieldIssues = {};
		const passwordRule = !password ? 'isNotEmpty' : lengthRule('memberPassword', password);
		if (passwordRule) found.password = passwordRule;
		if (!confirm) found.confirm = 'isNotEmpty';
		else if (!found.password && confirm !== password) found.confirm = MISMATCH;
		setIssues(found);
		if (Object.keys(found).length > 0) {
			focusInvalid();
			return;
		}
		setBusy(true);
		try {
			await resetPasswordWithToken(token, password);
			setPassword('');
			setConfirm('');
			onDone();
		} catch (err) {
			const error = parseApiError(err);
			if (error.code === INVALID_OR_EXPIRED_TOKEN) onSpent();
			else if (error.code === VALIDATION_FAILED) {
				setIssues({ password: 'minLength' });
				focusInvalid();
			} else setFormError(error);
			setBusy(false);
		}
	};

	return (
		<>
			<div className="pg-auth__head">
				<h1>{t('reset.title')}</h1>
				<p>{t('reset.subtitle')}</p>
			</div>
			<form ref={form} className="pg-auth__form" method="post" onSubmit={submit} noValidate aria-busy={busy || undefined}>
				<AuthError error={formError} />
				<Field
					label={t('reset.newPassword')}
					type="password"
					name="password"
					value={password}
					onChange={(value) => {
						setPassword(value);
						setIssues((prev) => ({ ...prev, password: undefined }));
					}}
					autoComplete="new-password"
					hint={t('signup.passwordHint')}
					error={message('password')}
					disabled={busy}
					autoFocus
				/>
				<Field
					label={t('reset.confirmPassword')}
					type="password"
					name="confirm"
					value={confirm}
					onChange={(value) => {
						setConfirm(value);
						setIssues((prev) => ({ ...prev, confirm: undefined }));
					}}
					autoComplete="new-password"
					error={message('confirm')}
					disabled={busy}
				/>
				<Button
					type="submit"
					variant="contained"
					size="large"
					fullWidth
					disabled={busy || !hydrated}
					startIcon={busy ? <CircularProgress className="tz-btn-spinner" size={18} color="inherit" aria-hidden="true" /> : undefined}
				>
					{busy ? t('reset.submitting') : t('reset.submit')}
				</Button>
			</form>
		</>
	);
};

/** Opened from the reset link: a new password (the sign-up rules), then the way to log in. */
const ResetPassword: NextPage = () => {
	const { t } = useTranslation('auth');
	const { ready, token } = useLinkToken();
	const [done, setDone] = useState(false);
	const [spent, setSpent] = useState(false);

	const requestNew = (
		<div className="pg-pending__actions">
			<Button component={Link} href={ROUTES.forgotPassword} variant="contained">
				{t('reset.requestNew')}
			</Button>
			<Button component={Link} href={ROUTES.login} variant="outlined">
				{t('forgot.backToLogin')}
			</Button>
		</div>
	);

	let content;
	if (!ready) {
		content = null;
	} else if (done) {
		content = (
			<StatusScreen tone="success" icon={<CheckCircle size={32} weight="fill" aria-hidden="true" />} title={t('reset.doneTitle')} text={t('reset.doneText')}>
				<div className="pg-pending__actions">
					<Button component={Link} href={ROUTES.login} variant="contained">
						{t('reset.toLogin')}
					</Button>
				</div>
			</StatusScreen>
		);
	} else if (!token || spent) {
		content = (
			<StatusScreen tone="danger" icon={<EnvelopeSimple size={32} aria-hidden="true" />} title={!token ? t('reset.missingTitle') : t('reset.invalidTitle')} text={!token ? t('reset.missingText') : t('reset.invalidText')}>
				{requestNew}
			</StatusScreen>
		);
	} else {
		content = <ResetForm token={token} onDone={() => setDone(true)} onSpent={() => setSpent(true)} />;
	}

	return (
		<>
			<Seo title={t('reset.pageTitle')} noindex />
			<NoReferrer />
			<div className="pg-auth">{content}</div>
		</>
	);
};

export default withLayoutBasic(ResetPassword);
