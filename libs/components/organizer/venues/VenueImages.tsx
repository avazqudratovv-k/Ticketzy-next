import { useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { ArrowLeft, ArrowRight, TrashSimple, UploadSimple, WarningCircle } from 'phosphor-react';
import { IMAGE_UPLOADER } from '../../../../apollo/user/mutation';
import { describeError } from '../../../organizer/errors';
import { LIMITS as FORM_LIMITS } from '../../../organizer/form';
import { imageProblem } from '../../../organizer/images';
import { LIMITS } from '../../../venues/model';
import { imageSrc } from '../../events/EventImage';

interface Props {
	images: string[];
	onChange: (images: string[]) => void;
}

/** Photos of the venue (`venueImages`, uploaded with `imageUploader(target: "venue")`). Same rules as event images: PNG or JPEG, 5 MB. */
const VenueImages = ({ images, onChange }: Props) => {
	const { t } = useTranslation('organizer');
	const client = useApolloClient();
	const input = useRef<HTMLInputElement>(null);
	const [uploading, setUploading] = useState(0);
	const [notes, setNotes] = useState<string[]>([]);

	const add = async (files: File[]) => {
		const next: string[] = [];
		let list = images;
		for (const file of files) {
			if (list.length >= LIMITS.maxImages) {
				next.push(`${file.name}: ${t('venues.images.max', { max: LIMITS.maxImages })}`);
				continue;
			}
			const problem = imageProblem(file);
			if (problem) {
				next.push(`${file.name}: ${t(`form.images.problem.${problem}`, { size: FORM_LIMITS.imageBytes / 1024 / 1024 })}`);
				continue;
			}
			setUploading((n) => n + 1);
			try {
				const { data } = await client.mutate({ mutation: IMAGE_UPLOADER, variables: { file, target: 'venue' } });
				list = [...list, data.imageUploader as string];
				onChange(list);
			} catch (err) {
				const described = describeError(err);
				next.push(`${file.name}: ${described.network ? t('errors.network') : described.key ? t(`serverErrors.${described.key}`) : described.raw}`);
			} finally {
				setUploading((n) => n - 1);
			}
		}
		setNotes(next);
	};

	const move = (index: number, by: number) => {
		const list = [...images];
		const target = index + by;
		if (target < 0 || target >= list.length) return;
		[list[index], list[target]] = [list[target], list[index]];
		onChange(list);
	};

	return (
		<div className="org-fields">
			<div className="org-drop vi-drop">
				<UploadSimple size={24} aria-hidden="true" />
				<span>{t('venues.images.rules', { size: FORM_LIMITS.imageBytes / 1024 / 1024, max: LIMITS.maxImages })}</span>
				<input
					ref={input}
					type="file"
					accept="image/png,image/jpeg"
					multiple
					className="org-visually-hidden"
					aria-label={t('venues.images.choose')}
					onChange={(event) => {
						void add(Array.from(event.target.files ?? []));
						event.target.value = '';
					}}
				/>
				<Button variant="outlined" onClick={() => input.current?.click()} disabled={uploading > 0 || images.length >= LIMITS.maxImages}>
					{uploading > 0 ? t('form.images.uploading') : t('venues.images.choose')}
				</Button>
			</div>
			{notes.length > 0 && (
				<ul className="org-notes" role="alert">
					{notes.map((note) => (
						<li key={note} className="is-bad">
							<WarningCircle size={18} weight="fill" aria-hidden="true" />
							<span>{note}</span>
						</li>
					))}
				</ul>
			)}
			{images.length > 0 && (
				<ul className="org-thumbs" aria-label={t('venues.images.listLabel')}>
					{images.map((src, index) => (
						<li key={`${src}-${index}`} className="org-thumb">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img src={imageSrc(src)} alt={t('venues.images.alt', { number: index + 1 })} />
							<div className="org-thumb__bar">
								<button type="button" aria-label={t('form.images.moveEarlier')} disabled={index === 0} onClick={() => move(index, -1)}>
									<ArrowLeft size={18} />
								</button>
								<button type="button" aria-label={t('form.images.moveLater')} disabled={index === images.length - 1} onClick={() => move(index, 1)}>
									<ArrowRight size={18} />
								</button>
								<button type="button" aria-label={t('form.images.remove')} onClick={() => onChange(images.filter((_, i) => i !== index))}>
									<TrashSimple size={18} />
								</button>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

export default VenueImages;
