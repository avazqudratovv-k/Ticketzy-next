import { useTranslation } from 'next-i18next';
import { Check } from 'phosphor-react';

/** Tickets, Payment, Confirmation (design: checkout stepper). */
const Steps = ({ current }: { current: 1 | 2 | 3 }) => {
	const { t } = useTranslation('checkout');
	const steps = [t('steps.tickets'), t('steps.payment'), t('steps.confirmation')];
	return (
		<ol className="steps" aria-label={t('steps.label')}>
			{steps.map((label, index) => {
				const number = index + 1;
				const done = number < current;
				return (
					<li key={label} className={`steps__item${number === current ? ' is-current' : ''}${done ? ' is-done' : ''}`} aria-current={number === current ? 'step' : undefined}>
						<span className="steps__dot" aria-hidden="true">
							{done ? <Check size={14} weight="bold" /> : number}
						</span>
						{label}
					</li>
				);
			})}
		</ol>
	);
};

export default Steps;
