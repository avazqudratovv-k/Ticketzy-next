import { useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Button } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { ArrowLeft, ArrowRight, TrashSimple, UploadSimple, WarningCircle } from 'phosphor-react';
import { IMAGE_UPLOADER } from '../../../../apollo/user/mutation';
import { imageProblem, readImageSize, RECOMMENDED } from '../../../organizer/images';
import { describeError } from '../../../organizer/errors';
import { LIMITS } from '../../../organizer/form';
import { imageSrc } from '../../events/EventImage';
import { useErrorText } from './fields';
import { StepProps } from './types';

interface Note {
	name: string;
	kind: 'type' | 'size' | 'small' | 'failed' | 'network';
	detail?: string;
}

const StepImages = ({ editor, readOnly }: StepProps) => {
	const { t } = useTranslation('organizer');
	const text = useErrorText();
	const client = useApolloClient();
	const input = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);
	const [uploading, setUploading] = useState(0);
	const [notes, setNotes] = useState<Note[]>([]);
	const { values, errors, setField } = editor;

	const add = async (files: File[]) => {
		const next: Note[] = [];
		let images = values.images;
		for (const file of files) {
			if (images.length >= LIMITS.maxImages) {
				next.push({ name: file.name, kind: 'size', detail: 'max' });
				continue;
			}
			const problem = imageProblem(file);
			if (problem) {
				next.push({ name: file.name, kind: problem });
				continue;
			}
			const size = await readImageSize(file);
			if (size && (size.width < RECOMMENDED.width || size.height < RECOMMENDED.height)) {
				next.push({ name: file.name, kind: 'small', detail: `${size.width} × ${size.height}` });
			}
			setUploading((n) => n + 1);
			try {
				// One file per request: the multi-file uploader drops a rejected file silently and leaves a hole in the list
				const { data } = await client.mutate({ mutation: IMAGE_UPLOADER, variables: { file, target: 'event' } });
				images = [...images, data.imageUploader as string];
				setField('images', images);
			} catch (err) {
				const described = describeError(err);
				next.push({ name: file.name, kind: described.network ? 'network' : 'failed', detail: described.key ? t(`serverErrors.${described.key}`) : described.raw });
			} finally {
				setUploading((n) => n - 1);
			}
		}
		setNotes(next);
	};

	const move = (index: number, by: number) => {
		const list = [...values.images];
		const target = index + by;
		if (target < 0 || target >= list.length) return;
		[list[index], list[target]] = [list[target], list[index]];
		setField('images', list);
	};

	return (
		<div className="org-fields">
			{!readOnly && (
				<div
					className={`org-drop ${dragging ? 'is-over' : ''}`}
					onDragOver={(event) => {
						event.preventDefault();
						setDragging(true);
					}}
					onDragLeave={() => setDragging(false)}
					onDrop={(event) => {
						event.preventDefault();
						setDragging(false);
						void add(Array.from(event.dataTransfer.files));
					}}
				>
					<UploadSimple size={28} aria-hidden="true" />
					<strong>{t('form.images.drop')}</strong>
					<span>{t('form.images.rules', { size: LIMITS.imageBytes / 1024 / 1024, width: RECOMMENDED.width, height: RECOMMENDED.height, max: LIMITS.maxImages })}</span>
					<input
						ref={input}
						type="file"
						accept="image/png,image/jpeg"
						multiple
						className="org-visually-hidden"
						aria-label={t('form.images.choose')}
						onChange={(event) => {
							void add(Array.from(event.target.files ?? []));
							event.target.value = '';
						}}
					/>
					<Button variant="outlined" onClick={() => input.current?.click()} disabled={uploading > 0 || values.images.length >= LIMITS.maxImages}>
						{uploading > 0 ? t('form.images.uploading') : t('form.images.choose')}
					</Button>
				</div>
			)}

			{errors.images && (
				<p className="tz-field__error" role="alert">
					<WarningCircle size={18} weight="fill" aria-hidden="true" /> {text(errors.images)}
				</p>
			)}
			{notes.length > 0 && (
				<ul className="org-notes" role="alert">
					{notes.map((note, index) => (
						<li key={`${note.name}-${index}`} className={note.kind === 'small' ? 'is-warn' : 'is-bad'}>
							<WarningCircle size={18} weight="fill" aria-hidden="true" />
							<span>
								<strong>{note.name}</strong>: {note.detail === 'max' ? t('form.images.max', { max: LIMITS.maxImages }) : note.kind === 'small' ? t('form.images.small', { dimensions: note.detail, width: RECOMMENDED.width, height: RECOMMENDED.height }) : note.kind === 'failed' ? note.detail || t('errors.generic') : note.kind === 'network' ? t('errors.network') : t(`form.images.problem.${note.kind}`, { size: LIMITS.imageBytes / 1024 / 1024 })}
							</span>
						</li>
					))}
				</ul>
			)}

			{values.images.length === 0 ? (
				<p className="org-hint">{t('form.images.none')}</p>
			) : (
				<ul className="org-thumbs" aria-label={t('form.images.listLabel')}>
					{values.images.map((src, index) => (
						<li key={`${src}-${index}`} className="org-thumb">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img src={imageSrc(src)} alt={t('form.images.alt', { number: index + 1 })} />
							{index === 0 && <span className="org-thumb__cover">{t('form.images.cover')}</span>}
							{!readOnly && (
								<div className="org-thumb__bar">
									<button type="button" aria-label={t('form.images.moveEarlier')} disabled={index === 0} onClick={() => move(index, -1)}>
										<ArrowLeft size={18} />
									</button>
									<button type="button" aria-label={t('form.images.moveLater')} disabled={index === values.images.length - 1} onClick={() => move(index, 1)}>
										<ArrowRight size={18} />
									</button>
									<button type="button" aria-label={t('form.images.remove')} onClick={() => setField('images', values.images.filter((_, i) => i !== index))}>
										<TrashSimple size={18} />
									</button>
								</div>
							)}
						</li>
					))}
				</ul>
			)}
			<p className="org-hint">{t('form.images.hint')}</p>
		</div>
	);
};

export default StepImages;
