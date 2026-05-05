import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { Reservation } from '@/api/me';
import { formatCountdown, intensityLabel } from '@/lib/format';
import { Button } from '@/components/ui/button';

interface Props {
  reservation: Reservation | undefined;
  onCancel: (reservationId: string) => void;
  cancelling: boolean;
}

/// Hero card for the next upcoming reservation. Shows a live HH:MM:SS
/// countdown and the bike id. Falls back to an empty-state CTA when the
/// user has no upcoming class.
export function NextClass({ reservation, onCancel, cancelling }: Props) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!reservation) {
    return (
      <div className="relative col-span-12 flex min-h-[340px] flex-col justify-between overflow-hidden rounded-[22px] bg-ink p-7 text-cream lg:col-span-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-[340px] w-[340px] rounded-full opacity-70"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, var(--color-sun), transparent 70%)',
          }}
        />
        <div className="relative">
          <div className="text-xs font-bold uppercase tracking-wide text-sun">
            sem aula reservada
          </div>
          <div
            className="display-tight mt-3.5"
            style={{ fontSize: 'clamp(40px, 6vw, 80px)', lineHeight: 0.92 }}
          >
            que tal
            <br />
            <span className="font-normal italic opacity-70">
              escolher um horário?
            </span>
          </div>
          <p className="mt-6 max-w-[420px] text-cream/80">
            Reserve uma bike numerada na areia. Cancele até 8h antes — crédito
            volta pra carteira.
          </p>
        </div>
        <div className="relative mt-8">
          <Button asChild size="lg" className="bg-clay hover:bg-clay-d">
            <Link to="/reservar">
              ver aulas de hoje <span aria-hidden>→</span>
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const slot = reservation.classSlot;
  const titulo =
    slot.classKind?.name?.toLowerCase() ?? slot.title ?? 'aula';
  const intens = intensityLabel(slot.classKind?.intensity);

  return (
    <div className="relative col-span-12 flex min-h-[340px] flex-col justify-between overflow-hidden rounded-[22px] bg-ink p-7 text-cream lg:col-span-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-[340px] w-[340px] rounded-full opacity-70"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, var(--color-sun), transparent 70%)',
        }}
      />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-sun">
          <span className="bb-pulse h-2 w-2 rounded-full bg-sun" />
          sua próxima aula
        </div>
        <div
          className="display-tight mt-3.5"
          style={{ fontSize: 'clamp(40px, 6vw, 80px)', lineHeight: 0.92 }}
        >
          {titulo}
          <br />
          <span className="font-normal italic opacity-70">
            com {slot.instructor.name.split(' ')[0]?.toLowerCase()}
          </span>
        </div>

        <div className="mt-8 flex flex-wrap items-stretch gap-4">
          <Stat
            label="começa em"
            value={formatCountdown(slot.startsAt)}
            mono
          />
          <Divider />
          <Stat label="bike" value={reservation.bike.label} />
          <Divider />
          <Stat label="duração" value={`${slot.durationMinutes} min`} />
          <Divider />
          <Stat label="pegada" value={intens} />
        </div>

        <div className="mt-7 flex flex-wrap gap-2.5">
          <Button asChild size="lg" className="bg-clay hover:bg-clay-d">
            <Link to={`/reservar?slot=${slot.id}`}>
              ver detalhes da aula <span aria-hidden>→</span>
            </Link>
          </Button>
          <button
            type="button"
            disabled={cancelling}
            onClick={() => onCancel(reservation.id)}
            className="rounded-full border-[1.5px] border-cream/30 px-6 py-3 text-sm font-semibold transition-colors hover:bg-cream/10 disabled:opacity-50"
          >
            {cancelling ? 'cancelando…' : 'cancelar reserva'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-[90px] flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
        {label}
      </span>
      <span
        className="display-tight"
        style={{
          fontSize: 30,
          lineHeight: 1,
          fontVariantNumeric: mono ? 'tabular-nums' : 'normal',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="hidden w-px bg-cream/20 md:block" />;
}
