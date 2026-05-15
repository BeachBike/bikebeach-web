import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Footer } from '@/components/home/footer';
import { Nav } from '@/components/home/nav';

/// Shared shell for the two legal pages (/termos, /privacidade). Editorial
/// reading layout: a sticky numbered table of contents on the left with a
/// scroll-spy highlight, the document body on the right. Both pages feed it
/// the same `LegalSection[]` shape so the structure stays identical.

export interface LegalSection {
  id: string;
  heading: string;
  body: ReactNode;
}

export function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  sections,
  sibling,
}: {
  eyebrow: string;
  title: ReactNode;
  intro: string;
  /// Human-readable "last updated" label, e.g. "14 de maio de 2026".
  updated: string;
  sections: LegalSection[];
  /// Cross-link to the companion document.
  sibling: { label: string; href: string };
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    const nodes = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el != null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-25% 0px -60% 0px' },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="min-h-svh overflow-x-hidden bg-cream text-ink">
      {/* Páginas legais não têm as seções da Home (#aulas, #planos, etc.) —
          `variant="minimal"` esconde os links de seção que apontariam pra
          âncoras inexistentes aqui. Logo + ArenaPicker + auth seguem. */}
      <Nav variant="minimal" />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <header className="px-7 pb-12 pt-[150px]">
        <div className="mx-auto max-w-[1100px]">
          <div className="text-xs font-bold uppercase tracking-[.2em] text-clay">
            {eyebrow}
          </div>
          <h1
            className="display-tight mt-4 max-w-[820px]"
            style={{ fontSize: 'clamp(48px,8vw,108px)', lineHeight: 0.9 }}
          >
            {title}
          </h1>
          <p className="mt-5 max-w-[600px] text-[15px] leading-relaxed text-ink-2">
            {intro}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-sand bg-cream-2 px-4 py-2 text-[13px] text-ink-2">
            <span className="size-1.5 rounded-full bg-sea" />
            última atualização: {updated}
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────── */}
      <main className="mx-auto max-w-[1100px] px-7 pb-24">
        <div className="grid gap-12 lg:grid-cols-[230px_1fr]">
          {/* Sticky TOC */}
          <nav className="hidden lg:block">
            <div className="sticky top-28">
              <div className="text-[11px] font-bold uppercase tracking-[.18em] text-ink-3">
                neste documento
              </div>
              <ol className="mt-4 flex flex-col gap-0.5 list-none">
                {sections.map((s, i) => {
                  const on = activeId === s.id;
                  return (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className="flex gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-cream-2"
                      >
                        <span
                          className="mono text-[12px] tabular-nums"
                          style={{
                            color: on
                              ? 'var(--color-clay)'
                              : 'var(--color-ink-3)',
                          }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span
                          className="text-[13.5px] leading-tight"
                          style={{
                            color: on
                              ? 'var(--color-ink)'
                              : 'var(--color-ink-3)',
                            fontWeight: on ? 600 : 500,
                          }}
                        >
                          {s.heading}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </div>
          </nav>

          {/* Document */}
          <article className="max-w-[680px]">
            <div className="flex flex-col gap-10">
              {sections.map((s, i) => (
                <section key={s.id} id={s.id} className="scroll-mt-28">
                  <div className="flex items-baseline gap-3">
                    <span
                      className="mono text-sm font-semibold tabular-nums text-clay"
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h2
                      className="display-tight"
                      style={{ fontSize: 'clamp(24px,3vw,32px)', lineHeight: 1.1 }}
                    >
                      {s.heading}
                    </h2>
                  </div>
                  <div className="legal-body mt-3 space-y-3 text-[14.5px] leading-relaxed text-ink-2">
                    {s.body}
                  </div>
                </section>
              ))}
            </div>

            {/* Footer of the document */}
            <div className="mt-12 rounded-2xl border border-sand bg-cream-2 px-6 py-7">
              <p className="text-[13px] leading-relaxed text-ink-2">
                Dúvidas sobre este documento? Escreva para{' '}
                <a
                  className="font-semibold text-clay underline underline-offset-2"
                  href="mailto:contato@bikebeach.com.br"
                >
                  contato@bikebeach.com.br
                </a>
                . Veja também a{' '}
                <Link
                  className="font-semibold text-clay underline underline-offset-2"
                  to={sibling.href}
                >
                  {sibling.label}
                </Link>
                .
              </p>
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/// Reusable definition row used inside section bodies (e.g. credit-expiry
/// tiers, the list of e-mail triggers).
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="ml-1 list-none space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-sand-2" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
