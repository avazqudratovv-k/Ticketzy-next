import { Fragment, ReactNode } from 'react';
import Link from 'next/link';

/** Routes of this app the assistant may link to; anything else that starts with `/` is shown as plain text. */
const APP_ROUTES = new Set(['events', 'orders', 'tickets', 'notifications', 'account', 'settings', 'organizers']);

type SafeLink = { kind: 'internal'; href: string } | { kind: 'external'; href: string } | null;

/** Links are only the app's own routes or https URLs: no javascript:, data:, http:, protocol-relative or other schemes. */
export function safeLink(raw: string): SafeLink {
	const url = raw.trim();
	if (url.startsWith('/')) {
		if (url.startsWith('//') || url.includes('\\')) return null;
		const first = url.slice(1).split(/[/?#]/)[0];
		if (first !== '' && !APP_ROUTES.has(first)) return null;
		return /^[\w\-./?=&#%]*$/.test(url) ? { kind: 'internal', href: url } : null;
	}
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'https:' && parsed.hostname ? { kind: 'external', href: parsed.href } : null;
	} catch {
		return null;
	}
}

/** `[text](url)`, `**bold**`, a bare https URL, or a bare `/events/...` path. */
const INLINE = /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|(https:\/\/[^\s<>()]+[^\s<>().,;:!?'"])|(?<![\w/])(\/(?:events|orders|tickets|organizers)\/[\w\-./]*[\w\-/])/g;

const renderLink = (label: string, link: NonNullable<SafeLink>, key: string, onNavigate?: () => void): ReactNode =>
	link.kind === 'internal' ? (
		<Link key={key} href={link.href} className="tz-link" onClick={onNavigate}>
			{label}
		</Link>
	) : (
		<a key={key} href={link.href} className="tz-link" target="_blank" rel="noopener noreferrer">
			{label}
		</a>
	);

function renderInline(text: string, keyPrefix: string, onNavigate?: () => void): ReactNode[] {
	const out: ReactNode[] = [];
	let last = 0;
	let index = 0;
	for (const match of Array.from(text.matchAll(INLINE))) {
		const start = match.index ?? 0;
		if (start > last) out.push(text.slice(last, start));
		const key = `${keyPrefix}-${index++}`;
		const [whole, mdLabel, mdUrl, bold, bareUrl, barePath] = match;
		if (mdUrl) {
			const link = safeLink(mdUrl);
			out.push(link ? renderLink(mdLabel, link, key, onNavigate) : mdLabel);
		} else if (bold) {
			out.push(<strong key={key}>{bold}</strong>);
		} else {
			const raw = bareUrl ?? barePath;
			const link = safeLink(raw);
			out.push(link ? renderLink(raw, link, key, onNavigate) : whole);
		}
		last = start + whole.length;
	}
	if (last < text.length) out.push(text.slice(last));
	return out;
}

const BULLET = /^\s*(?:[*\-•]\s+)(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

/**
 * The answer as React nodes: paragraphs, bullet and numbered lists, bold, and safe links.
 * Text goes through React, so HTML in an answer is shown as text and never run.
 */
export function renderAnswer(text: string, onNavigate?: () => void): ReactNode {
	const blocks: ReactNode[] = [];
	let paragraph: string[] = [];
	let list: { ordered: boolean; items: string[] } | null = null;

	const flushParagraph = () => {
		if (!paragraph.length) return;
		const key = `p${blocks.length}`;
		blocks.push(
			<p key={key}>
				{paragraph.map((line, i) => (
					<Fragment key={i}>
						{i > 0 && <br />}
						{renderInline(line, `${key}-${i}`, onNavigate)}
					</Fragment>
				))}
			</p>,
		);
		paragraph = [];
	};
	const flushList = () => {
		if (!list) return;
		const key = `l${blocks.length}`;
		const items = list.items.map((item, i) => <li key={i}>{renderInline(item, `${key}-${i}`, onNavigate)}</li>);
		blocks.push(list.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>);
		list = null;
	};

	for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
		const bullet = BULLET.exec(line);
		const numbered = bullet ? null : NUMBERED.exec(line);
		const item = bullet ?? numbered;
		if (item) {
			flushParagraph();
			const ordered = Boolean(numbered);
			if (list && list.ordered !== ordered) flushList();
			list = list ?? { ordered, items: [] };
			list.items.push(item[1]);
		} else if (!line.trim()) {
			flushParagraph();
			flushList();
		} else {
			flushList();
			paragraph.push(line.trim());
		}
	}
	flushParagraph();
	flushList();
	return <>{blocks}</>;
}
