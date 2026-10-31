import { FormEvent, useEffect, useRef, useState } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import { useMutation } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { CheckCircle, SignOut, WarningCircle } from 'phosphor-react';
import { IMAGE_UPLOADER, UPDATE_MEMBER } from '../../apollo/user/mutation';
import { userVar } from '../../apollo/store';
import withLayoutBasic from '../../libs/components/layout/LayoutBasic';
import { withAccount } from '../../libs/components/account/AccountShell';
import PageHead from '../../libs/components/account/PageHead';
import DeleteAccount from '../../libs/components/account/DeleteAccount';
import Field from '../../libs/components/common/Field';
import Seo from '../../libs/components/common/Seo';
import { displayName } from '../../libs/components/common/Avatar';
import InitialsAvatar from '../../libs/components/common/InitialsAvatar';
import useAuth from '../../libs/hooks/useAuth';
import { logOut } from '../../libs/auth';
import { avatarProblem, AVATAR_MAX_BYTES, PHONE_FORMAT, ProfileValues, validateProfile } from '../../libs/account/profile';
import { FieldIssues, fieldMessage, serverIssues } from '../../libs/fieldErrors';
import useFocusInvalid from '../../libs/hooks/useFocusInvalid';
import { NETWORK_ERROR, parseApiError } from '../../libs/errors';
import { formatViewerDate } from '../../libs/format';
import { ROUTES } from '../../libs/routes';
import { MemberProfile } from '../../libs/types/member';

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
	props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'events', 'checkout', 'account', 'auth'])) },
});

/** The inputs of this form, by backend property name. */
const FORM_FIELDS = ['memberFullName', 'memberNick', 'memberPhone'] as const;

const valuesOf = (user: MemberProfile): ProfileValues => ({
	memberFullName: user.memberFullName ?? '',
	memberNick: user.memberNick ?? '',
	memberPhone: user.memberPhone ?? '',
});

const Settings: NextPage = () => {
	const { t } = useTranslation('account');
	const router = useRouter();
	const { locale } = router;
	const { user } = useAuth();
	const [values, setValues] = useState<ProfileValues>(() => (user ? valuesOf(user) : { memberFullName: '', memberNick: '', memberPhone: '' }));
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [fileError, setFileError] = useState<'type' | 'size' | null>(null);
	const [errors, setErrors] = useState<FieldIssues>({});
	const [status, setStatus] = useState<{ kind: 'saved' } | { kind: 'error'; message: string } | null>(null);
	const [saving, setSaving] = useState(false);
	const input = useRef<HTMLInputElement>(null);
	const statusRef = useRef<HTMLDivElement>(null);
	const formRef = useRef<HTMLFormElement>(null);
	const focusInvalid = useFocusInvalid(formRef);
	const [upload] = useMutation(IMAGE_UPLOADER);
	const [update] = useMutation(UPDATE_MEMBER);

	// The profile loads after mount on a fresh visit: fill the form once, not on every change of the stored member
	const filled = useRef(Boolean(user));
	useEffect(() => {
		if (user && !filled.current) {
			filled.current = true;
			setValues(valuesOf(user));
		}
	}, [user]);

	useEffect(() => () => {
		if (preview) URL.revokeObjectURL(preview);
	}, [preview]);

	useEffect(() => {
		if (status) statusRef.current?.focus();
	}, [status]);

	if (!user) return null;

	const name = displayName(user);
	const message = (field: keyof ProfileValues) =>
		errors[field] ? (errors[field] === PHONE_FORMAT ? t('profile.error.phone') : fieldMessage(t, field, errors[field] as string)) : undefined;
	const set = (key: keyof ProfileValues) => (value: string) => {
		setValues((prev) => ({ ...prev, [key]: value }));
		setErrors((prev) => ({ ...prev, [key]: undefined }));
		setStatus(null);
	};

	const pick = (selected?: File) => {
		if (!selected) return;
		const problem = avatarProblem(selected);
		setFileError(problem);
		setStatus(null);
		if (problem) {
			setFile(null);
			setPreview(null);
		} else {
			setFile(selected);
			setPreview(URL.createObjectURL(selected));
		}
		if (input.current) input.current.value = '';
	};

	const submit = async (event: FormEvent) => {
		event.preventDefault();
		const found = validateProfile(values);
		setErrors(found);
		if (Object.keys(found).length > 0) {
			focusInvalid();
			return;
		}
		const original = valuesOf(user);
		const changed: Partial<ProfileValues> = {};
		(Object.keys(values) as (keyof ProfileValues)[]).forEach((key) => {
			if (values[key].trim() !== original[key]) changed[key] = values[key].trim();
		});
		if (!file && Object.keys(changed).length === 0) {
			setStatus({ kind: 'saved' });
			return;
		}
		setSaving(true);
		setStatus(null);
		try {
			let memberImage: string | undefined;
			if (file) {
				const { data } = await upload({ variables: { file, target: 'member' } });
				memberImage = data.imageUploader as string;
			}
			const { data } = await update({ variables: { input: { _id: user._id, ...changed, ...(memberImage ? { memberImage } : {}) } } });
			userVar({ ...user, ...(data.updateMember as MemberProfile) });
			setFile(null);
			setPreview(null);
			setStatus({ kind: 'saved' });
		} catch (err) {
			const apiError = parseApiError(err);
			const { issues, banner } = serverIssues(apiError, FORM_FIELDS);
			setErrors(issues);
			if (Object.keys(issues).length > 0) focusInvalid();
			if (banner) setStatus({ kind: 'error', message: apiError.code === NETWORK_ERROR ? t('state.network') : t('profile.saveError') });
		} finally {
			setSaving(false);
		}
	};

	const handleLogout = async () => {
		// Leave the page first so the guard does not bounce to the login screen with a returnTo
		await router.push(ROUTES.home);
		logOut();
	};

	return (
		<>
			<Seo title={t('profile.title')} noindex />
			<PageHead title={t('profile.title')} text={t('profile.sub')} />

			<form ref={formRef} className="card settings__card" onSubmit={submit} noValidate aria-labelledby="profile-heading">
				<h2 id="profile-heading" className="card__title">
					{t('profile.details')}
				</h2>

				<div className="settings__avatar">
					<InitialsAvatar src={preview ?? user.memberImage} name={name} size={72} />
					<div>
						<input ref={input} id="avatar-file" className="tz-sr" type="file" accept="image/png,image/jpeg" onChange={(event) => pick(event.target.files?.[0])} aria-label={t('profile.photoFile')} aria-describedby="avatar-hint" />
						<Button variant="outlined" onClick={() => input.current?.click()} disabled={saving}>
							{t('profile.changePhoto')}
						</Button>
						<p id="avatar-hint" className={`settings__hint${fileError ? ' is-error' : ''}`} role={fileError ? 'alert' : undefined}>
							{fileError === 'type'
								? t('profile.photoType')
								: fileError === 'size'
								? t('profile.photoSize', { size: AVATAR_MAX_BYTES / 1024 / 1024 })
								: file
								? t('profile.photoReady', { name: file.name })
								: t('profile.photoHint', { size: AVATAR_MAX_BYTES / 1024 / 1024 })}
						</p>
					</div>
				</div>

				<Field label={t('profile.fullName')} value={values.memberFullName} onChange={set('memberFullName')} autoComplete="name" hint={t('profile.fullNameHint')} error={message('memberFullName')} />
				<Field label={t('profile.nick')} value={values.memberNick} onChange={set('memberNick')} autoComplete="nickname" hint={t('profile.nickHint')} error={message('memberNick')} />
				<Field label={t('profile.email')} value={user.memberEmail ?? ''} onChange={() => undefined} type="email" disabled hint={t('profile.emailHint')} />
				<Field label={t('profile.phone')} value={values.memberPhone} onChange={set('memberPhone')} autoComplete="tel" placeholder="+82 10 0000 0000" error={message('memberPhone')} />

				<div ref={statusRef} tabIndex={-1} role="status" className="settings__status">
					{status?.kind === 'saved' && (
						<p className="tz-alert tz-alert--success">
							<CheckCircle size={20} aria-hidden="true" /> {t('profile.saved')}
						</p>
					)}
					{status?.kind === 'error' && (
						<p className="tz-alert" role="alert">
							<WarningCircle size={20} aria-hidden="true" /> {status.message}
						</p>
					)}
				</div>
				<div>
					<Button type="submit" variant="contained" disabled={saving}>
						{saving ? t('profile.saving') : t('profile.save')}
					</Button>
				</div>
			</form>

			<section className="card settings__card" aria-labelledby="account-heading">
				<h2 id="account-heading" className="card__title">
					{t('profile.accountTitle')}
				</h2>
				<dl className="breakdown">
					<div className="breakdown__row">
						<dt>{t('profile.memberType')}</dt>
						<dd>
							<span className="tz-rolebadge">{t(`profile.type.${user.memberType}`)}</span>
						</dd>
					</div>
					<div className="breakdown__row">
						<dt>{t('profile.memberStatus')}</dt>
						<dd>
							<span className={`tz-badge tz-badge--${user.memberStatus === 'ACTIVE' ? 'success' : user.memberStatus === 'PENDING' ? 'warning' : 'danger'}`}>{t(`profile.status.${user.memberStatus}`)}</span>
						</dd>
					</div>
					<div className="breakdown__row">
						<dt>{t('profile.since')}</dt>
						<dd>{formatViewerDate(user.createdAt, locale)}</dd>
					</div>
				</dl>
			</section>

			<section className="card settings__card" aria-labelledby="signout-heading">
				<h2 id="signout-heading" className="card__title">
					{t('profile.signOutTitle')}
				</h2>
				<p className="breakdown__note">{t('profile.signedInAs', { email: user.memberEmail ?? name })}</p>
				<div>
					<Button variant="outlined" startIcon={<SignOut size={20} aria-hidden="true" />} onClick={handleLogout}>
						{t('profile.logout')}
					</Button>
				</div>
			</section>

			<DeleteAccount />
		</>
	);
};

export default withLayoutBasic(withAccount(Settings));
