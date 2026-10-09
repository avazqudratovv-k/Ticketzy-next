import React from 'react';
import { useTranslation } from 'next-i18next';
import { Info } from 'phosphor-react';

interface Props {
	title: string;
	lead?: string;
	/** Short "sample text, not legal advice" style banner shown under the title. */
	note?: { title: string; text: string };
	children: React.ReactNode;
}

/** Shared frame of the information pages (FAQ, About, Terms, Privacy, Contact): one h1, a lead, an optional notice, then the body. */
const StaticPage = ({ title, lead, note, children }: Props) => {
	const { t } = useTranslation('common');
	return (
		<div className="tz-container doc">
			<header className="doc__head">
				<h1 className="doc__title">{title}</h1>
				{lead && <p className="doc__lead">{lead}</p>}
			</header>
			{note && (
				<div className="tz-alert tz-alert--warning doc__note" role="note" aria-label={t('doc.noteLabel')}>
					<span className="tz-alert__icon" aria-hidden="true">
						<Info size={18} />
					</span>
					<div>
						<p className="tz-alert__title" style={{ margin: 0 }}>
							{note.title}
						</p>
						<p className="tz-alert__text" style={{ margin: 0 }}>
							{note.text}
						</p>
					</div>
				</div>
			)}
			<div className="doc__body">{children}</div>
		</div>
	);
};

export default StaticPage;
