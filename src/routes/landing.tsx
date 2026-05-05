import { Arena } from '@/components/home/arena';
import { Aulas } from '@/components/home/aulas';
import { Como } from '@/components/home/como';
import { CTA } from '@/components/home/cta';
import { Footer } from '@/components/home/footer';
import { Hero } from '@/components/home/hero';
import { Instrutores } from '@/components/home/instrutores';
import { Marquee } from '@/components/home/marquee';
import { Nav } from '@/components/home/nav';
import { Planos } from '@/components/home/planos';

/// Public landing. Adapted from the Claude Designer prototype to reflect the
/// real backend: prices come from the seed (PackOffer + Plan rows), the
/// "1ª aula R$ 1" promo is replaced with rule-grounded perks, and the cancel
/// window line uses our actual 8h policy.
export function LandingRoute() {
  return (
    <div className="min-h-svh overflow-x-hidden bg-cream text-ink">
      <Nav />
      <Hero />
      <Marquee />
      <Como />
      <Aulas />
      <Instrutores />
      <Planos />
      <Arena />
      <CTA />
      <Footer />
    </div>
  );
}
