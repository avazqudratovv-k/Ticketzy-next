import React, { useRef, useState } from 'react';
import { NextPage, GetStaticPropsContext } from 'next';
import Link from 'next/link';
import { Button, CircularProgress } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { EnvelopeSimple } from 'phosphor-react';
import Seo from '../libs/components/common/Seo';
import withLayoutBasic from '../libs/components/layout/LayoutBasic';
import Field from '../libs/components/common/Field';
import AuthError from '../libs/components/auth/AuthError';
import StatusScreen from '../libs/components/auth/StatusScreen';
import { EMAIL_PATTERN } from '../libs/components/auth/validation';
import useAdoptTypedValues from '../libs/hooks/useAdoptTypedValues';
import useFocusInvalid from '../libs/hooks/useFocusInvalid';
import { requestPasswordReset } from '../libs/auth/emailAuth';
import { ApiError, parseApiError } from '../libs/errors';
import { FieldIssues, fieldMessage } from '../libs/fieldErrors';
import { ROUTES } from '../libs/routes';

export const getStaticProps = async ({ locale }: GetStaticPropsContext) => ({
	props: {
		...(await serverSideTranslations(locale ?? 'en', ['common', 'auth'])),
	},
});

/**
 * Asks for a reset link. The answer is the same whether or not an account uses the address (the server does the same),
 * so the page says only "if an account exists". Only a rate limit and a lost connection are told apart.
 */
const ForgotPassword: NextPage = () => {
	const { t } = useTranslation('auth');
	const [email, setEmail] = useState('');
	const [issues, setIssues] = useState<FieldIssues>({});
	const [formError, setFormError] = useState<ApiError | null>(null);
	const [busy, setBusy] = useState(false);
	const [sent, setSent] = useState(false);
	const form = useRef<HTMLFormElement>(null);
	const hydrated = useAdoptTypedValues(form, { email: setEmail });
	const focusInvalid = useFocusInvalid(form);

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (busy) return;
		setFormError(null);
		const found: FieldIssues = {};
		if (!email.trim()) found.memberEmail = 'isNotEmpty';
		else if (!EMAIL_PATTERN.test(email.trim())) found.memberEmail = 'isEmail';
		setIssues(found);
		if (found.memberEmail) {
			focusInvalid();
			return;
		}
		setBusy(true);
		try {
			await requestPasswordReset(email);
			setSent(true);
		} catch (err) {
			setFormError(parseApiError(err));
		} finally {
			setBusy(false);
		}
	};

	if (sent) {
		return (
			<>
				<Seo title={t('forgot.pageTitle')} noindex />
				<div className="pg-auth">
					<StatusScreen tone="info" icon={<EnvelopeSimple size={32} aria-hidden="true" />} title={t('forgot.sentTitle')} text={t('forgot.sentText')}>
						<div className="pg-pending__actions">
							<Button component={Link} href={ROUTES.login} variant="contained">
								{t('forgot.backToLogin')}
							</Button>
							<Button variant="outlined" onClick={() => setSent(false)}>
								{t('forgot.tryAnother')}
							</Button>
						</div>
					</StatusScreen>
				</div>
			</>
		);
	}

	return (
		<>
			<Seo title={t('forgot.pageTitle')} noindex />
			<div className="pg-auth">
				<div className="pg-auth__head">
					<h1>{t('forgot.title')}</h1>
					<p>{t('forgot.subtitle')}</p>
				</div>
				<form ref={form} className="pg-auth__form" method="post" onSubmit={submit} noValidate aria-busy={busy || undefined}>
					<AuthError error={formError} />
					<Field
						label={t('fields.email')}
						type="email"
						name="email"
						value={email}
						onChange={(value) => {
							setEmail(value);
							setIssues({});
						}}
						placeholder={t('fields.emailPlaceholder')}
						autoComplete="email"
						error={issues.memberEmail ? fieldMessage(t, 'memberEmail', issues.memberEmail) : undefined}
						disabled={busy}
						autoFocus
					/>
					<Button
						type="submit"
						variant="contained"
						size="large"
						fullWidth
						disabled={busy || !hydrated}
						startIcon={busy ? <CircularProgress className="tz-btn-spinner" size={18} color="inherit" aria-hidden="true" /> : undefined}
					>
						{busy ? t('forgot.submitting') : t('forgot.submit')}
					</Button>
					<p className="pg-auth__switch">
						<Link href={ROUTES.login} className="tz-link">
							{t('forgot.backToLogin')}
						</Link>
					</p>
				</form>
			</div>
		</>
	);
};

export default withLayoutBasic(ForgotPassword);
