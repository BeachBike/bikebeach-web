import { Link } from 'react-router';
import { useDefaultUnit } from '@/api/public';
import { Logo } from '@/components/brand/logo';

interface Props {
  mode: 'login' | 'cadastro';
}

/// Decorative brand panel that sits next to the form. Color + headline shift
/// per mode (login = clay+sun warmth; cadastro = ink+sea calm).
export function ContaAside({ mode }: Props) {
  const { unit } = useDefaultUnit();
  const bikeCount = unit?.operationalBikeCount;

  const isLogin = mode === 'login';

  return (
    <aside
      className="relative flex min-h-[580px] flex-col justify-between overflow-hidden rounded-3xl px-9 py-10 text-cream"
      style={{
        background: isLogin ? 'var(--color-clay)' : 'var(--color-ink)',
      }}
    >
      {/* Sun / moon decorative gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-[340px] w-[340px] rounded-full opacity-85"
        style={{
          background: isLogin
            ? 'radial-gradient(circle at 30% 30%, var(--color-sun) 0%, var(--color-clay-d) 60%, transparent 80%)'
            : 'radial-gradient(circle at 30% 30%, var(--color-sea) 0%, transparent 70%)',
        }}
      />
      {/* Subtle stripes overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          background:
            'repeating-linear-gradient(115deg, transparent 0 28px, var(--color-cream) 28px 29px)',
        }}
      />

      <Link to="/" className="relative z-10 inline-flex">
        <Logo />
      </Link>

      <div className="relative z-10">
        <h2
          className="display font-medium"
          style={{ fontSize: 'clamp(58px,7vw,108px)', lineHeight: 0.88 }}
        >
          {isLogin ? (
            <>
              de volta ao
              <br />
              <span className="font-normal italic">pedal</span>.
            </>
          ) : (
            <>
              vem
              <br />
              pra{' '}
              <span
                className="font-normal italic"
                style={{ color: 'var(--color-sun)' }}
              >
                areia
              </span>
              .
            </>
          )}
        </h2>
        <p className="mt-6 max-w-[380px] text-[17px] leading-relaxed opacity-90">
          {isLogin
            ? 'entra com seus dados, escolhe o horário e a bike. a gente cuida do resto.'
            : 'cadastro em menos de um minuto. sua reserva fica garantida com a bike numerada.'}
        </p>
      </div>

      <div className="relative z-10 flex items-center gap-6">
        <Stat
          value={bikeCount ? String(bikeCount) : '32'}
          label="bikes / aula"
        />
        <Divider />
        <Stat value="6h–19h" label="todos os dias" />
        <Divider />
        <Stat value="BC" label="balneário camboriú" />
      </div>
    </aside>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className="display-tight"
        style={{ fontSize: 42, lineHeight: 1 }}
      >
        {value}
      </span>
      <span className="text-xs font-semibold opacity-85">{label}</span>
    </div>
  );
}

function Divider() {
  return <div className="h-12 w-px bg-cream/30" />;
}
