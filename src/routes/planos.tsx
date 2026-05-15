import { useMemo } from 'react';
import { Link } from 'react-router';
import {
  useMe,
  useMyCreditPacks,
  useMySubscriptions,
  type CreditPack,
  type MySubscription,
} from '@/api/me';
import {
  useEffectiveArena,
  usePackOffers,
  usePlans,
  type PublicPackOffer,
  type PublicPlan,
} from '@/api/public';
import { PackCard } from '@/components/planos/pack-card';
import { PlanCard } from '@/components/planos/plan-card';
import { PlanosTopBar } from '@/components/planos/top-bar';
import { useArenaStore } from '@/stores/arena';
import { useAuthStore } from '@/stores/auth';

/// Public /planos — works for logged-out (marketing-style) and logged-in
/// (renew / change plan) users. Cards always link to /checkout, which
/// handles the auth bounce when needed.
export function PlanosRoute() {
  const session = useAuthStore((s) => s.user);
  const loggedIn = !!session;
  // Auth store only carries id/email/role/unitId — fetch the real name
  // from /users/me so the top-bar shows "olá, marina" instead of the email.
  const meQ = useMe({ enabled: loggedIn });

  const arena = useArenaStore((s) => s.selectedArenaId);
  const { unit, isLoading: unitLoading } = useEffectiveArena();
  const offersQ = usePackOffers(arena);
  const plansQ = usePlans();

  // Logged-in extras — gated so we don't fire 401-bound requests when the
  // page is being browsed by an anonymous visitor.
  const myPacksQ = useMyCreditPacks({ enabled: loggedIn });
  const mySubsQ = useMySubscriptions({ enabled: loggedIn });

  const myPacks = myPacksQ.data;
  const mySubs = mySubsQ.data;

  const activeSub: MySubscription | null = useMemo(() => {
    const now = Date.now();
    return (
      mySubs?.find(
        (s) =>
          s.status === 'ACTIVE' ||
          s.status === 'PENDING_PAYMENT' ||
          s.status === 'PAST_DUE' ||
          (s.status === 'CANCELLED' &&
            new Date(s.currentPeriodEnd).getTime() > now),
      ) ?? null
    );
  }, [mySubs]);

  const packsByClasses = useMemo(() => {
    const map = new Map<number, CreditPack>();
    if (!myPacks) return map;
    const now = Date.now();
    for (const p of myPacks) {
      if (p.remainingCredits <= 0) continue;
      if (p.expiresAt && new Date(p.expiresAt).getTime() <= now) continue;
      // Index by total — the offer the user originally bought.
      if (!map.has(p.totalCredits)) map.set(p.totalCredits, p);
    }
    return map;
  }, [myPacks]);

  const offers: PublicPackOffer[] = (offersQ.data ?? [])
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder || a.classes - b.classes);
  const plans: PublicPlan[] = (plansQ.data ?? []).filter((p) => p.isActive);

  // Highlight the middle pack (or pack 10 if present) and the first plan.
  const highlightedOfferId = pickHighlightedOfferId(offers);

  const isLoading =
    unitLoading || offersQ.isLoading || plansQ.isLoading;

  return (
    <div className="min-h-svh bg-cream">
      <PlanosTopBar
        user={
          loggedIn
            ? {
                name: meQ.data?.name ?? session!.email,
                email: session!.email,
              }
            : null
        }
      />

      <main className="mx-auto max-w-[1200px] px-6 pb-20">
        {/* Hero */}
        <section className="pb-2 pt-10">
          <div className="text-xs font-bold uppercase tracking-widest text-clay">
            planos & pacotes
          </div>
          <h1
            className="display-tight mt-3"
            style={{ fontSize: 'clamp(48px,8vw,96px)', lineHeight: 0.92 }}
          >
            escolhe como
            <br />
            <span className="font-normal italic text-clay">vai pedalar.</span>
          </h1>
          <p className="mt-4 max-w-[640px] text-[15px] text-ink-2">
            Pacote pra quem vai do jeito que dá. Mensal pra quem fez do
            spinning rotina. Sem fidelidade, sem letrinha miúda. Aceitamos
            Pix, crédito e débito.
          </p>
        </section>

        {/* Loading / empty */}
        {isLoading && (
          <div className="mt-10 rounded-2xl bg-cream-2 px-5 py-12 text-center text-sm text-ink-2">
            carregando opções…
          </div>
        )}

        {!isLoading && offers.length === 0 && plans.length === 0 && (
          <div className="mt-10 rounded-2xl bg-cream-2 px-5 py-12 text-center text-sm text-ink-2">
            sem planos ativos no momento. Volta em alguns minutos.
          </div>
        )}

        {/* Pack offers */}
        {!isLoading && offers.length > 0 && (
          <section className="mt-12">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2
                className="display-tight"
                style={{ fontSize: 'clamp(32px,4vw,44px)', lineHeight: 1 }}
              >
                pacotes
              </h2>
              <p className="text-sm text-ink-2">
                Comprou? Os créditos ficam na sua carteira. Use quando quiser
                até a data de validade.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {offers.map((offer) => (
                <PackCard
                  key={offer.id}
                  offer={offer}
                  unit={unit}
                  myMatchingPack={
                    packsByClasses.get(offer.classes) ?? null
                  }
                  loggedIn={loggedIn}
                  highlighted={offer.id === highlightedOfferId}
                />
              ))}
            </div>
          </section>
        )}

        {/* Plans (subscription) */}
        {!isLoading && plans.length > 0 && (
          <section className="mt-14">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2
                className="display-tight"
                style={{ fontSize: 'clamp(32px,4vw,44px)', lineHeight: 1 }}
              >
                mensal
              </h2>
              <p className="text-sm text-ink-2">
                Pra quem pedala toda semana.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan, i) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  myActiveSubscription={
                    activeSub && activeSub.planId === plan.id ? activeSub : null
                  }
                  loggedIn={loggedIn}
                  highlighted={i === 0}
                />
              ))}
            </div>
          </section>
        )}

        {/* FAQ-ish reassurance row */}
        <section className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              t: 'Sem fidelidade',
              d: 'Cancela quando quiser, no painel. Pacote vale até a validade.',
            },
            {
              t: 'Cancele aulas até 8h antes',
              d: 'Crédito volta pra carteira automaticamente. Sem custo.',
            },
            {
              t: 'Pix com 5% off',
              d: 'Desconto aplicado direto no checkout. Confirmação em segundos.',
            },
          ].map((c) => (
            <div
              key={c.t}
              className="rounded-2xl border border-sand bg-cream p-5"
            >
              <div
                className="display-tight"
                style={{ fontSize: 22, lineHeight: 1.05 }}
              >
                {c.t}
              </div>
              <p className="mt-2 text-sm text-ink-2">{c.d}</p>
            </div>
          ))}
        </section>

        <footer className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-sand pt-6 text-[13px] text-ink-2">
          <span>© 2026 bikebeach</span>
          <div className="flex gap-5">
            <Link to="/" className="hover:text-clay">
              home
            </Link>
            <Link to="/faq" className="hover:text-clay">
              faq
            </Link>
            <Link to="/termos" className="hover:text-clay">
              termos
            </Link>
            <Link to="/privacidade" className="hover:text-clay">
              privacidade
            </Link>
            <a
              href="mailto:contato@bikebeach.com.br"
              className="hover:text-clay"
            >
              contato
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}

function pickHighlightedOfferId(
  offers: PublicPackOffer[],
): string | null {
  if (offers.length === 0) return null;
  // Prefer a pack of 10 if present (matches the home's "+ pedido" call).
  const ten = offers.find((o) => o.classes === 10);
  if (ten) return ten.id;
  // Otherwise highlight the middle one.
  const mid = offers[Math.floor(offers.length / 2)]!;
  return mid.id;
}
