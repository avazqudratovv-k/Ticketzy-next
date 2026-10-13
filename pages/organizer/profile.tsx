import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMutation, useQuery } from '@apollo/client';
import { Avatar as MuiAvatar, Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ArrowSquareOut, CheckCircle, WarningCircle } from 'phosphor-react';
import { IMAGE_UPLOADER, UPDATE_MEMBER } from '../../apollo/user/mutation';
import { GET_ORGANIZER_ME } from '../../apollo/organizer/sales';
import { userVar } from '../../apollo/store';
import { withOrganizerLayout } from '../../libs/components/layout/LayoutAdmin';
import BlockedPanel from '../../libs/components/organizer/BlockedPanel';
import CommissionTier from '../../libs/components/organizer/sales/CommissionTier';
import ProfilePreview from '../../libs/components/organizer/sales/ProfilePreview';
import Field from '../../libs/components/common/Field';
import { imageSrc } from '../../libs/components/events/EventImage';
import useAuth from '../../libs/hooks/useAuth';
import useUnsavedGuard from '../../libs/hooks/useUnsavedGuard';
import { commissionState } from '../../libs/organizer/commission';
import { ADDRESS_MAX, AVATAR_MAX_BYTES, avatarProblem, DESC_MAX, OrgProfileErrors, OrgProfileValues, validateOrgProfile } from '../../libs/organizer/profile';
import { NETWORK_ERROR, parseApiError } from '../../libs/errors';
import { formatNumber, formatViewerDate } from '../../libs/format';
import { organizerUrl } from '../../libs/routes';
import { MemberProfile } from '../../libs/types/member';

export const getStaticProps = async ({ locale }: any) => ({
	props: {
		...(await serverSideTranslations(locale, ['common', 'organizer', 'events', 'auth'])),
	},
});

const valuesOf = (m: Partial<MemberProfile> | null | undefined): OrgProfileValues => ({
	memberFullName: m?.memberFullName ?? '',
	memberNick: m?.memberNick ?? '',
	memberDesc: m?.memberDesc ?? '',
	memberPhone: m?.memberPhone ?? '',
	memberAddress: m?.memberAddress ?? '',
});

const KEYS: (keyof OrgProfileValues)[] = ['memberFullName', 'memberNick', 'memberDesc', 'memberPhone', 'memberAddress'];

const Profile: NextPage = () => {
	const { t } = useTranslation('organizer');
	const { locale } = useRouter();
	const { user, organizerAccess } = useAuth();
	const editable = organizerAccess === 'active' || organizerAccess === 'pending';

	const { data, error: loadError, refetch } = useQuery(GET_ORGANIZER_ME, { variables: { memberId: user?._id }, skip: !user || !editable, fetchPolicy: 'cache-and-network' });
	const member = data?.getMember;
	// what is saved: the stored account, refreshed by the query above
	const saved = useMemo(() => valuesOf(member ?? user), [member, user]);

	const [values, setValues] = useState<OrgProfileValues>(saved);
	const filled = useRef(false);
	useEffect(() => {
		// the form is filled once from the first complete data; later refreshes must not overwrite typing
		if (member && !filled.current) {
			filled.current = true;
			setValues(valuesOf(member));
		}
	}, [member]);

	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [fileError, setFileError] = useState<'type' | 'size' | null>(null);
	const [errors, setErrors] = useState<OrgProfileErrors>({});
	const [status, setStatus] = useState<{ kind: 'saved' } | { kind: 'error'; message: string } | null>(null);
	const [saving, setSaving] = useState(false);
	const input = useRef<HTMLInputElement>(null);
	const statusRef = useRef<HTMLDivElement>(null);
	const [upload] = useMutation(IMAGE_UPLOADER);
	const [update] = useMutation(UPDATE_MEMBER);

	const changed = KEYS.filter((key) => values[key].trim() !== saved[key].trim());
	const dirty = changed.length > 0 || Boolean(file);
	useUnsavedGuard(dirty && !saving, t('profile.leave'));

	useEffect(() => () => {
		if (preview) URL.revokeObjectURL(preview);
	}, [preview]);
	useEffect(() => {
		if (status) statusRef.current?.focus();
	}, [status]);

	if (!user) return null;
	if (organizerAccess && !editable) return <BlockedPanel access={organizerAccess as Exclude<typeof organizerAccess, 'active' | 'pending'>} action="events" />;

	const set = (key: keyof OrgProfileValues) => (value: string) => {
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
		const found = validateOrgProfile(values);
		setErrors(found);
		if (Object.keys(found).length > 0) return;
		if (!dirty) {
			setStatus({ kind: 'saved' });
			return;
		}
		setSaving(true);
		setStatus(null);
		try {
			let memberImage: string | undefined;
			if (file) {
				const res = await upload({ variables: { file, target: 'member' } });
				memberImage = res.data.imageUploader as string;
			}
			const patch: Partial<OrgProfileValues> = {};
			changed.forEach((key) => {
				patch[key] = values[key].trim();
			});
			const res = await update({ variables: { input: { _id: user._id, ...patch, ...(memberImage ? { memberImage } : {}) } } });
			userVar({ ...user, ...(res.data.updateMember as MemberProfile) });
			// the form now matches the saved account
			setValues((prev) => ({ ...prev, ...patch }));
			setFile(null);
			setPreview(null);
			setStatus({ kind: 'saved' });
			void refetch();
		} catch (err) {
			const apiError = parseApiError(err);
			const taken = apiError.message === 'Already used member email, nick or phone';
			setStatus({ kind: 'error', message: apiError.code === NETWORK_ERROR ? t('errors.network') : taken ? t('profile.error.taken') : t('profile.error.save') });
		} finally {
			setSaving(false);
		}
	};

	const state = member ? commissionState(member.completedEvents, member.commissionOverride) : null;
	const image = preview ?? imageSrc(member?.memberImage ?? user.memberImage);
	const publicUrl = organizerUrl(user._id);
	const active = (member?.memberStatus ?? user.memberStatus) === 'ACTIVE';

	return (
		<div className="org-page">
			<Head>
				<title>{`${t('profile.title')} · Ticketzy`}</title>
			</Head>
			<div className="tz-pagehead org-pagehead">
				<div>
					<h1>{t('profile.title')}</h1>
					<p>{t('profile.subtitle')}</p>
				</div>
				<Button component={Link} href={publicUrl} target="_blank" variant="outlined" endIcon={<ArrowSquareOut size={18} aria-hidden="true" />} disabled={!active}>
					{t('profile.viewPublic')}
				</Button>
			</div>
			{!active && (
				<p className="tz-alert tz-alert--warning" role="note">
					<WarningCircle size={20} aria-hidden="true" />
					<span>{t('profile.notPublic')}</span>
				</p>
			)}
			{loadError && !member && (
				<p className="tz-alert tz-alert--error" role="alert">
					<WarningCircle size={20} aria-hidden="true" />
					<span>
						{t('profile.error.load')}{' '}
						<button type="button" className="tz-link org-linkbtn" onClick={() => refetch()}>
							{t('errors.retry')}
						</button>
					</span>
				</p>
			)}

			<div className="org-profile">
				<form className="org-card org-profile__form" onSubmit={submit} noValidate aria-labelledby="prof-heading">
					<div className="org-card__head">
						<h2 id="prof-heading">{t('profile.public')}</h2>
						{dirty && <span className="tz-badge tz-badge--warning">{t('form.unsaved')}</span>}
					</div>

					<div className="settings__avatar">
						<MuiAvatar src={image} alt="" sx={{ width: 72, height: 72 }}>
							{(values.memberFullName || values.memberNick || '?').trim().charAt(0).toUpperCase()}
						</MuiAvatar>
						<div>
							<input ref={input} id="org-avatar" className="tz-sr" type="file" accept="image/png,image/jpeg" onChange={(e) => pick(e.target.files?.[0])} aria-label={t('profile.logoFile')} aria-describedby="org-avatar-hint" />
							<Button variant="outlined" onClick={() => input.current?.click()} disabled={saving}>
								{t('profile.changeLogo')}
							</Button>
							<p id="org-avatar-hint" className={`settings__hint${fileError ? ' is-error' : ''}`} role={fileError ? 'alert' : undefined}>
								{fileError === 'type'
									? t('profile.logoType')
									: fileError === 'size'
									? t('profile.logoSize', { size: AVATAR_MAX_BYTES / 1024 / 1024 })
									: file
									? t('profile.logoReady', { name: file.name })
									: t('profile.logoHint', { size: AVATAR_MAX_BYTES / 1024 / 1024 })}
							</p>
						</div>
					</div>

					<Field label={t('profile.fullName')} value={values.memberFullName} onChange={set('memberFullName')} autoComplete="organization" required hint={t('profile.fullNameHint')} error={errors.memberFullName ? t('profile.error.fullName') : undefined} />
					<Field label={t('profile.nick')} value={values.memberNick} onChange={set('memberNick')} autoComplete="nickname" required hint={t('profile.nickHint')} error={errors.memberNick ? t('profile.error.nick') : undefined} />
					<div className="tz-field">
						<label className="tz-field__label" htmlFor="org-desc">
							{t('profile.desc')}
						</label>
						<textarea
							id="org-desc"
							className="tz-input org-textarea"
							rows={5}
							value={values.memberDesc}
							onChange={(e) => set('memberDesc')(e.target.value)}
							maxLength={DESC_MAX + 200}
							aria-invalid={errors.memberDesc ? true : undefined}
							aria-describedby="org-desc-hint"
						/>
						<p id="org-desc-hint" className={`settings__hint${errors.memberDesc ? ' is-error' : ''}`}>
							{errors.memberDesc ? t('profile.error.desc', { max: DESC_MAX }) : t('profile.descHint')} · {formatNumber(Array.from(values.memberDesc).length, locale)}/{formatNumber(DESC_MAX, locale)}
						</p>
					</div>
					<Field label={t('profile.address')} value={values.memberAddress} onChange={set('memberAddress')} autoComplete="street-address" hint={t('profile.addressHint')} error={errors.memberAddress ? t('profile.error.address', { max: ADDRESS_MAX }) : undefined} />
					<Field label={t('profile.email')} value={member?.memberEmail ?? user.memberEmail ?? ''} onChange={() => undefined} type="email" disabled hint={t('profile.emailHint')} />
					<Field label={t('profile.phone')} value={values.memberPhone} onChange={set('memberPhone')} autoComplete="tel" placeholder="+82 10 0000 0000" hint={t('profile.phoneHint')} error={errors.memberPhone ? t('profile.error.phone') : undefined} />

					<div ref={statusRef} tabIndex={-1} role="status" className="settings__status">
						{status?.kind === 'saved' && (
							<p className="tz-alert tz-alert--success">
								<CheckCircle size={20} aria-hidden="true" /> {t('profile.saved')}
							</p>
						)}
						{status?.kind === 'error' && (
							<p className="tz-alert tz-alert--error" role="alert">
								<WarningCircle size={20} aria-hidden="true" /> {status.message}
							</p>
						)}
					</div>
					<div className="org-actions">
						<Button
							type="submit"
							variant="contained"
							className={!saving && !dirty ? 'tz-blocked' : undefined}
							disabled={saving}
							aria-disabled={!saving && !dirty ? true : undefined}
							onClick={(event) => {
								if (!dirty) event.preventDefault();
							}}
						>
							{saving ? t('profile.saving') : t('profile.save')}
						</Button>
						<Button
							type="button"
							variant="text"
							className={!saving && !dirty ? 'tz-blocked' : undefined}
							disabled={saving}
							aria-disabled={!saving && !dirty ? true : undefined}
							onClick={() => {
								if (!dirty) return;
								setValues(saved);
								setFile(null);
								setPreview(null);
								setErrors({});
								setFileError(null);
								setStatus(null);
							}}
						>
							{t('profile.discard')}
						</Button>
					</div>
				</form>

				<div className="org-stack">
					<section className="org-card" aria-labelledby="prof-preview">
						<div className="org-card__head">
							<h2 id="prof-preview">{t('profile.preview.title')}</h2>
						</div>
						<p className="org-hint">{t('profile.preview.note')}</p>
						<ProfilePreview
							name={values.memberFullName}
							nick={values.memberNick}
							desc={values.memberDesc}
							address={values.memberAddress}
							image={preview ?? member?.memberImage ?? user.memberImage}
							events={member?.memberEvents ?? 0}
							completed={member?.completedEvents ?? 0}
							followers={member?.memberFollowers ?? 0}
						/>
					</section>

					<section className="org-card" aria-labelledby="prof-account">
						<div className="org-card__head">
							<h2 id="prof-account">{t('profile.account.title')}</h2>
						</div>
						<dl className="org-dl">
							<div>
								<dt>{t('profile.account.status')}</dt>
								<dd>
									<span className={`tz-badge tz-badge--${active ? 'success' : 'warning'}`}>{t(`profile.account.statusValue.${member?.memberStatus ?? user.memberStatus}`)}</span>
								</dd>
							</div>
							<div>
								<dt>{t('profile.account.followers')}</dt>
								<dd>{member ? formatNumber(member.memberFollowers, locale) : '–'}</dd>
							</div>
							<div>
								<dt>{t('profile.account.events')}</dt>
								<dd>{member ? formatNumber(member.memberEvents, locale) : '–'}</dd>
							</div>
							<div>
								<dt>{t('profile.account.completed')}</dt>
								<dd>{member ? formatNumber(member.completedEvents, locale) : '–'}</dd>
							</div>
							<div>
								<dt>{t('profile.account.since')}</dt>
								<dd>{formatViewerDate(user.createdAt, locale)}</dd>
							</div>
						</dl>
					</section>

					<section className="org-card" aria-labelledby="prof-tier">
						<div className="org-card__head">
							<h2 id="prof-tier">{t('payouts.tier.title')}</h2>
							<Link href="/organizer/payouts" className="tz-link">
								{t('profile.account.payouts')}
							</Link>
						</div>
						{state && member ? <CommissionTier state={state} completed={member.completedEvents} /> : <span className="tz-skel tz-skel--block" aria-busy="true" />}
					</section>
				</div>
			</div>
		</div>
	);
};

export default withOrganizerLayout(Profile);
