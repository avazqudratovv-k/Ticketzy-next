import { LIMITS } from './form';

export type ImageProblem = 'type' | 'size';

/** PNG or JPEG up to 5 MB. The server limit is 15 MB and it checks the real type from the file's first bytes. */
export function imageProblem(file: Pick<File, 'type' | 'size'>): ImageProblem | null {
	if (!(LIMITS.imageTypes as readonly string[]).includes(file.type)) return 'type';
	if (file.size > LIMITS.imageBytes) return 'size';
	return null;
}

/** Natural size of a picked file, to warn about small images (the design asks for 1600 x 1200 px or larger). */
export function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
	return new Promise((resolve) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			resolve({ width: img.naturalWidth, height: img.naturalHeight });
			URL.revokeObjectURL(url);
		};
		img.onerror = () => {
			resolve(null);
			URL.revokeObjectURL(url);
		};
		img.src = url;
	});
}

export const RECOMMENDED = { width: 1600, height: 1200 };
