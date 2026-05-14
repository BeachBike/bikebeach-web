import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Footer } from '@/components/home/footer';
import { Nav } from '@/components/home/nav';
import {
  FAQ_CATEGORIES,
  SITUATIONS,
  type FaqCategory,
} from '@/components/faq/data';

/// Public /faq — the questions are the hard edges of the product (the 8h
/// window, waitlist auto-promotion, credit expiry, health-gate blocking).
/// Not a plain accordion list: a beach-tide layout with a scroll-spy rail,
/// "situation" quick-jumps phrased as the user's problem, and live search.

/// Flat index of every question → its category, for search + jump logic.
const ALL_QUESTIONS = FAQ_CATEGORIES.flatMap((cat) =>
  cat.questions.map((q) => ({ ...q, categoryId: cat.id })),
);

export function FaqRoute() {
  const [query, setQuery] = useState('');
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [activeCat, setActiveCat] = useState<string>(FAQ_CATEGORIES[0]!.id);

  const normalizedQuery = query.trim().toLowerCase();
  const searching = normalizedQuery.length > 1;

  // When searching, a question matches on its visible text or its keyword bag.
  const matchIds = useMemo(() => {
    if (!searching) return null;
    const terms = normalizedQuery.split(/\s+/);
    return new Set(
      ALL_QUESTIONS.filter((q) => {
        const hay = `${q.q} ${q.search}`.toLowerCase();
        return terms.every((t) => hay.includes(t));
      }).map((q) => q.id),
    );
  }, [normalizedQuery, searching]);

  // Categories filtered down to their matching questions while searching.
  const visibleCategories: FaqCategory[] = useMemo(() => {
    if (!matchIds) return FAQ_CATEGORIES;
    return FAQ_CATEGORIES.map((cat) => ({
      ...cat,
      questions: cat.questions.filter((q) => matchIds.has(q.id)),
    })).filter((cat) => cat.questions.length > 0);
  }, [matchIds]);

  // While searching, every match is forced open; otherwise honor user toggles.
  const effectiveOpen = matchIds ?? openIds;

  function toggle(id: string) {
    if (searching) return; // search controls open-state; toggling is a no-op
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function jumpTo(questionId: string) {
    setQuery('');
    setOpenIds((prev) => new Set(prev).add(questionId));
    // Defer until the cleared-search render lands so the node exists/visible.
    requestAnimationFrame(() => {
      const el = document.getElementById(`q-${questionId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // Scroll-spy: light up the rail entry for whichever category is in view.
  useEffect(() => {
    if (searching) return;
    const sections = FAQ_CATEGORIES.map((c) =>
      document.getElementById(`cat-${c.id}`),
    ).filter((el): el is HTMLElement => el != null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveCat(visible[0].target.id.replace('cat-', ''));
        }
      },
      { rootMargin: '-30% 0px -55% 0px' },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [searching]);

  return (
    <div className="min-h-svh overflow-x-hidden bg-cream text-ink">
      <Nav />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <header className="relative px-7 pb-16 pt-[150px]">
        {/* Decorative blurred sun, echoing the landing CTA section. */}
        <div
          aria-hidden
          className="bb-breathe pointer-events-none absolute -right-40 -top-24 h-[420px] w-[420px] rounded-full opacity-40"
          style={{ background: 'var(--color-sun)', filter: 'blur(8px)' }}
        />
        <div className="relative mx-auto max-w-[1180px]">
          <div className="text-xs font-bold uppercase tracking-[.2em] text-clay">
            central de dúvidas
          </div>
          <h1
            className="display-tight mt-4 max-w-[900px]"
            style={{ fontSize: 'clamp(52px,9vw,128px)', lineHeight: 0.9 }}
          >
            Toda dúvida
            <br />
            <span className="font-normal italic text-clay">quebra</span> aqui.
          </h1>
          <p className="mt-5 max-w-[560px] text-[15px] leading-relaxed text-ink-2">
            As regras que mais geram pergunta — a janela das 8 horas, a lista de
            espera que anda sozinha, a validade dos créditos, o portão de saúde.
            Procure, ou diga o que está acontecendo com você.
          </p>

          {/* Search */}
          <div className="relative mt-9 max-w-[560px]">
            <span
              aria-hidden
              className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-lg text-ink-3"
            >
              ⌕
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="busque por 'cancelar', 'crédito', 'lista de espera'…"
              className="w-full rounded-full border-[1.5px] border-sand bg-cream py-4 pl-12 pr-5 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-clay"
            />
          </div>

          {/* Situation chips — phrased as the user's problem, not a topic. */}
          {!searching && (
            <div className="mt-6 flex flex-wrap gap-2.5">
              <span className="self-center text-[13px] font-semibold text-ink-3">
                tô com um problema:
              </span>
              {SITUATIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => jumpTo(s.target)}
                  className="rounded-full border border-sand bg-cream-2 px-4 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:border-clay hover:bg-clay hover:text-cream"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────── */}
      <main className="mx-auto max-w-[1180px] px-7 pb-24">
        {searching && visibleCategories.length === 0 && (
          <div className="rounded-2xl border border-sand bg-cream-2 px-6 py-16 text-center">
            <div
              className="display-tight text-ink"
              style={{ fontSize: 28 }}
            >
              nada na maré pra &quot;{query.trim()}&quot;
            </div>
            <p className="mt-2 text-sm text-ink-2">
              Tenta outra palavra — ou fala com a gente em{' '}
              <a
                className="text-clay underline underline-offset-2"
                href="mailto:contato@bikebeach.com.br"
              >
                contato@bikebeach.com.br
              </a>
              .
            </p>
          </div>
        )}

        <div className="grid gap-12 lg:grid-cols-[230px_1fr]">
          {/* Scroll-spy rail — hidden while searching (no stable anchors). */}
          {!searching && (
            <nav className="hidden lg:block">
              <div className="sticky top-28">
                <div className="text-[11px] font-bold uppercase tracking-[.18em] text-ink-3">
                  navegue
                </div>
                <ul className="mt-4 flex flex-col gap-0.5 list-none">
                  {FAQ_CATEGORIES.map((cat) => {
                    const on = activeCat === cat.id;
                    return (
                      <li key={cat.id}>
                        <a
                          href={`#cat-${cat.id}`}
                          className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-cream-2"
                        >
                          <span
                            className="size-2 shrink-0 rounded-full transition-transform"
                            style={{
                              background: `var(--color-${cat.accent})`,
                              transform: on ? 'scale(1.6)' : 'scale(1)',
                            }}
                          />
                          <span
                            className="text-[14px] leading-tight transition-colors"
                            style={{
                              color: on
                                ? 'var(--color-ink)'
                                : 'var(--color-ink-3)',
                              fontWeight: on ? 600 : 500,
                            }}
                          >
                            {cat.label}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </nav>
          )}

          {/* Question columns */}
          <div className={searching ? 'lg:col-span-2' : ''}>
            <div className="flex flex-col gap-14">
              {visibleCategories.map((cat) => (
                <CategorySection
                  key={cat.id}
                  category={cat}
                  openIds={effectiveOpen}
                  onToggle={toggle}
                />
              ))}
            </div>

            {/* Still-stuck CTA */}
            <div className="relative mt-16 overflow-hidden rounded-2xl bg-ink px-8 py-12 text-cream">
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-20 -left-10 h-[260px] w-[260px] rounded-full opacity-30"
                style={{ background: 'var(--color-sea)', filter: 'blur(6px)' }}
              />
              <div className="relative flex flex-wrap items-end justify-between gap-6">
                <div>
                  <h2
                    className="display-tight"
                    style={{ fontSize: 'clamp(32px,4vw,52px)', lineHeight: 0.95 }}
                  >
                    Ainda perdido
                    <br />
                    <span className="font-normal italic text-sun">na maré?</span>
                  </h2>
                  <p className="mt-3 max-w-[420px] text-sm text-cream/75">
                    Manda a dúvida que a gente responde — gente de verdade, não
                    robô. Resposta no mesmo dia útil.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="mailto:contato@bikebeach.com.br"
                    className="rounded-full bg-clay px-7 py-4 text-sm font-semibold text-cream transition-colors hover:bg-clay-d"
                  >
                    falar com a gente →
                  </a>
                  <Link
                    to="/planos"
                    className="rounded-full border-[1.5px] border-cream/40 px-7 py-4 text-sm font-semibold transition-colors hover:bg-cream hover:text-ink"
                  >
                    ver planos
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* ── Category block ─────────────────────────────────────────── */

function CategorySection({
  category,
  openIds,
  onToggle,
}: {
  category: FaqCategory;
  openIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const accent = `var(--color-${category.accent})`;
  return (
    <section id={`cat-${category.id}`} className="scroll-mt-28">
      {/* Colored header band */}
      <div className="flex items-center gap-4">
        <span
          className="h-10 w-1.5 rounded-full"
          style={{ background: accent }}
        />
        <div>
          <h2
            className="display-tight"
            style={{ fontSize: 'clamp(28px,3.4vw,42px)', lineHeight: 1 }}
          >
            {category.label}
          </h2>
          <div
            className="mt-0.5 text-[13px] font-semibold uppercase tracking-wider"
            style={{ color: accent }}
          >
            {category.tagline}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        {category.questions.map((q, i) => (
          <FaqItem
            key={q.id}
            id={q.id}
            n={i + 1}
            question={q.q}
            answer={q.a}
            accent={accent}
            open={openIds.has(q.id)}
            onToggle={() => onToggle(q.id)}
          />
        ))}
      </div>
    </section>
  );
}

/* ── Single Q/A ─────────────────────────────────────────────── */

function FaqItem({
  id,
  n,
  question,
  answer,
  accent,
  open,
  onToggle,
}: {
  id: string;
  n: number;
  question: string;
  answer: React.ReactNode;
  accent: string;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = `panel-${id}`;
  const headRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      id={`q-${id}`}
      className="scroll-mt-28 overflow-hidden rounded-xl border border-sand bg-cream transition-colors"
      style={open ? { borderColor: accent } : undefined}
    >
      <button
        ref={headRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-cream-2"
      >
        <span
          className="mono shrink-0 text-[13px] font-semibold tabular-nums"
          style={{ color: accent }}
        >
          {String(n).padStart(2, '0')}
        </span>
        <span className="flex-1 text-[15px] font-semibold leading-snug text-ink">
          {question}
        </span>
        <span
          aria-hidden
          className="grid size-7 shrink-0 place-items-center rounded-full text-base transition-transform duration-300"
          style={{
            background: open ? accent : 'var(--color-cream-2)',
            color: open ? 'var(--color-cream)' : 'var(--color-ink-2)',
            transform: open ? 'rotate(45deg)' : 'none',
          }}
        >
          +
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          className="fadeup px-5 pb-5 pl-[3.25rem] text-[14.5px] leading-relaxed text-ink-2"
        >
          {answer}
        </div>
      )}
    </div>
  );
}
