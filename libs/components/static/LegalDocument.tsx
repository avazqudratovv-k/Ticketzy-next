import React from 'react';
import { useTranslation } from 'next-i18next';
import Seo from '../common/Seo';
import StaticPage from './StaticPage';
import { MAX_SEATS_PER_ORDER, SEAT_HOLD_SECONDS } from '../../site';

interface Section {
	title: string;
	p: string[];
	list: string[];
}

/** Terms and privacy share one layout: a "sample text, not legal advice" notice, then numbered sections. */
const LegalDocument = ({ doc }: { doc: 'terms' | 'privacy' }) => {
	const { t } = useTranslation('legal');
	const vars = { seconds: SEAT_HOLD_SECONDS, max: MAX_SEATS_PER_ORDER };
	const sections = t(`${doc}.sections`, { returnObjects: true, ...vars }) as Section[];

	return (
		<StaticPage title={t(`${doc}.title`)} lead={t(`${doc}.lead`)} note={{ title: t('note.title'), text: t('note.text') }}>
			<Seo title={t(`${doc}.title`)} description={t(`${doc}.lead`)} />
			<p className="doc__meta">{t('updated')}</p>
			{sections.map((section, index) => (
				<section key={section.title} className="doc__section" aria-labelledby={`${doc}-${index}`}>
					<h2 id={`${doc}-${index}`}>
						{index + 1}. {section.title}
					</h2>
					{section.p.map((text) => (
						<p key={text}>{text}</p>
					))}
					{section.list.length > 0 && (
						<ul>
							{section.list.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					)}
				</section>
			))}
		</StaticPage>
	);
};

export default LegalDocument;
