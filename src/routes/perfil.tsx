import { useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { Link, Navigate } from 'react-router';
import {
  useMe,
  useMyPayments,
  useMyReservations,
  useMySubscriptions,
  useUpdateMe,
  type Payment,
  type Reservation,
} from '@/api/me';
import { useHealthGateStatus } from '@/api/health-gate';
import { useUpdateVisibility } from '@/api/friends';
import { Logo } from '@/components/brand/logo';
import { useLogout } from '@/hooks/useLogout';
import {
  formatCents,
  formatFullDate,
  initials,
  paymentMethodLabel,
} from '@/lib/format';
import { digitsOnly, maskCpf, maskPhone } from '@/lib/masks';
import { useAuthStore } from '@/stores/auth';

const ATTENDED: ReadonlyArray<Reservation['status']> = [
  'CHECKED_IN',
  'COMPLETED',
];

export function PerfilRoute() {
  const session = useAuthStore((s) => s.user);

  const meQ = useMe();
  const reservationsQ = useMyReservations();
  const paymentsQ = useMyPayments();
  const subsQ = useMySubscriptions();
  const gateQ = useHealthGateStatus();

  if (!session) return <Navigate to="/login" replace />;

  const me = meQ.data;
  const reservations = reservationsQ.data ?? [];
  const stats = deriveStats(reservations);

  return (
    <div className="min-h-svh bg-cream">
      <header className="sticky top-0 z-40 border-b border-sand bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-4 px-6 py-3.5">
          <Link to="/dashboard">
            <Logo />
          </Link>
          <Link
            to="/dashboard"
            className="rounded-full px-3.5 py-2 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-cream-2"
          >
            ← painel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] px-6 pb-24">
        {meQ.isLoading || !me ? (
          <div className="mt-16 rounded-2xl bg-cream-2 px-5 py-12 text-center text-sm text-ink-2">
            carregando perfil…
          </div>
        ) : (
          <>
            <Hero me={me} stats={stats} />
            <DadosBlock me={me} />
            <SaudeBlock
              liabilityValid={!!gateQ.data?.liability.valid}
              liabilityExpiresAt={gateQ.data?.liability.expiresAt ?? null}
              parqValid={!!gateQ.data?.parq.valid}
              parqExpiresAt={gateQ.data?.parq.expiresAt ?? null}
            />
            <PlanoBlock
              subscriptions={subsQ.data}
              payments={paymentsQ.data}
            />
            <BikeBlock favorite={stats.favoriteBike} />
            <ConquistasBlock stats={stats} />
            <ZonaConta hideFromFriends={me.hideReservationsFromFriends} />
          </>
        )}
      </main>
    </div>
  );
}

interface DerivedStats {
  aulasFeitas: number;
  joinedAt: Date;
  monthsAsMember: number;
  streakDays: number;
  /// Bike with the highest count of attended reservations.
  favoriteBike: {
    label: string;
    row: string | null;
    col: number | null;
    count: number;
  } | null;
}

function deriveStats(reservations: Reservation[]): DerivedStats {
  const attended = reservations.filter((r) => ATTENDED.includes(r.status));
  const aulasFeitas = attended.length;

  // streak: consecutive days back from today where at least one attended
  // reservation exists. Single-day buckets keyed by yyyy-mm-dd.
  const dayBuckets = new Set<string>();
  for (const r of attended) {
    const d = new Date(r.classSlot.startsAt);
    dayBuckets.add(
      `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
    );
  }
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (
    dayBuckets.has(
      `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`,
    )
  ) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  // favorite bike — by attended count, ties broken by most-recent.
  const counts = new Map<
    string,
    { count: number; lastAt: number; bike: Reservation['bike'] }
  >();
  for (const r of attended) {
    const cur = counts.get(r.bike.id);
    const at = new Date(r.classSlot.startsAt).getTime();
    if (!cur) {
      counts.set(r.bike.id, { count: 1, lastAt: at, bike: r.bike });
    } else {
      cur.count += 1;
      if (at > cur.lastAt) cur.lastAt = at;
    }
  }
  const favorite = [...counts.values()].sort(
    (a, b) => b.count - a.count || b.lastAt - a.lastAt,
  )[0];

  // join date: prefer Me.createdAt when available; otherwise oldest
  // reservation. Fallback to today.
  const earliest = reservations
    .map((r) => new Date(r.classSlot.startsAt).getTime())
    .sort((a, b) => a - b)[0];
  const joinedAt = earliest ? new Date(earliest) : new Date();
  const monthsAsMember = Math.max(
    0,
    Math.floor((Date.now() - joinedAt.getTime()) / 86_400_000 / 30),
  );

  return {
    aulasFeitas,
    joinedAt,
    monthsAsMember,
    streakDays: streak,
    favoriteBike: favorite
      ? {
          label: favorite.bike.label,
          row: favorite.bike.row,
          col: favorite.bike.col,
          count: favorite.count,
        }
      : null,
  };
}

interface MeShape {
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  birthDate: string | null;
  createdAt: string;
}

function Hero({ me, stats }: { me: MeShape; stats: DerivedStats }) {
  const parts = me.name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? me.email;
  const lastTokens = parts.slice(1);
  const last = lastTokens.length > 0 ? lastTokens.join(' ') : '';
  const joinedAt = new Date(me.createdAt);
  const months = Math.max(
    0,
    Math.floor((Date.now() - joinedAt.getTime()) / 86_400_000 / 30),
  );

  return (
    <section
      className="fadein grid items-end gap-9 border-b border-sand pb-8 pt-10 md:grid-cols-[auto_1fr]"
    >
      <div
        className="relative grid place-items-center rounded-full bg-clay text-cream shadow-[0_20px_50px_-22px_rgba(216,93,52,0.55)]"
        style={{
          width: 'clamp(120px, 16vw, 188px)',
          height: 'clamp(120px, 16vw, 188px)',
        }}
      >
        <span
          className="display-tight"
          style={{
            fontSize: 'clamp(54px, 7vw, 84px)',
            lineHeight: 1,
            letterSpacing: '-.04em',
          }}
        >
          {initials(me.name)}
        </span>
        <span className="absolute bottom-2 right-2 rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-cream">
          desde{' '}
          {joinedAt.toLocaleDateString('pt-BR', {
            month: 'short',
            year: '2-digit',
          })}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-widest text-clay">
          meu perfil
        </div>
        <div
          className="display-tight mt-3"
          style={{ fontSize: 'clamp(40px,7vw,84px)', lineHeight: 0.92 }}
        >
          {first.toLowerCase()}
          {last && (
            <>
              <br />
              <span className="font-normal italic text-ink-2">
                {last.toLowerCase()}.
              </span>
            </>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-[13px] text-ink-2">
          <span>
            <b>{stats.aulasFeitas}</b>{' '}
            {stats.aulasFeitas === 1 ? 'aula feita' : 'aulas feitas'}
          </span>
          <span className="text-sand-2">·</span>
          <span>
            na bikebeach há <b>{stats.monthsAsMember || months || '·'}</b>{' '}
            {(stats.monthsAsMember || months) === 1 ? 'mês' : 'meses'}
          </span>
          {stats.favoriteBike && (
            <>
              <span className="text-sand-2">·</span>
              <span>
                bike preferida{' '}
                <b className="mono">{stats.favoriteBike.label}</b>
              </span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Section({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="pt-12">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-clay">
            {eyebrow}
          </div>
          <div
            className="display-tight mt-1"
            style={{ fontSize: 30, lineHeight: 1.05 }}
          >
            {title}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ReadRow({
  label,
  value,
  mono,
  fallback,
  hint,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  fallback?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sand bg-cream px-5 py-4">
      <div className="min-w-[180px] flex-1">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-3">
          {label}
        </div>
        {value ? (
          <div
            className={`text-base font-medium ${mono ? 'mono' : ''}`}
          >
            {value}
          </div>
        ) : (
          <div className="text-base font-normal text-ink-3">
            {fallback ?? '—'}
          </div>
        )}
      </div>
      {hint && (
        <span className="text-[11px] text-ink-3">{hint}</span>
      )}
    </div>
  );
}

type EditableField = 'email' | 'phone' | 'cpf' | 'birthDate';

interface EditRowProps {
  label: string;
  /// Display text when not editing (already formatted for humans).
  displayValue: string | null;
  /// Raw form value to seed the input (e.g. CPF as 11 digits, date as YYYY-MM-DD).
  rawValue: string;
  type: 'email' | 'tel' | 'text' | 'date';
  /// Inputmode hint for mobile keyboards (numeric, email, etc.).
  inputMode?: 'text' | 'numeric' | 'email' | 'tel';
  mono?: boolean;
  fallback?: string;
  field: EditableField;
  /// Called when the user clicks save — should send the raw, validated
  /// value to the backend. Empty string clears the field.
  onSave: (field: EditableField, value: string) => Promise<void>;
  /// Optional client-side validator. Runs on the value after `extract`.
  /// Returns an error message or null.
  validate?: (raw: string) => string | null;
  /// Optional input transformer applied on every keystroke. Use to enforce
  /// a visible mask while the user types (CPF "111.222.333-44", phone
  /// "(48) 99999-1234"). Leave undefined for plain text fields.
  displayMask?: (raw: string) => string;
  /// Optional value-extractor — takes the masked string and returns the raw
  /// value to send to the backend (e.g. strip non-digits from CPF). Defaults
  /// to `v.trim()`, which is enough for fields whose visible value is the
  /// payload value (email, phone).
  extract?: (masked: string) => string;
  saving: boolean;
  errorMessage: string | null;
}

function EditRow({
  label,
  displayValue,
  rawValue,
  type,
  inputMode,
  mono,
  fallback,
  field,
  onSave,
  validate,
  displayMask,
  extract,
  saving,
  errorMessage,
}: EditRowProps) {
  const [editing, setEditing] = useState(false);
  // Seed the input with the masked form so the cursor doesn't start on the
  // raw digits. When `displayMask` is undefined this is identity.
  const [val, setVal] = useState(() =>
    displayMask ? displayMask(rawValue) : rawValue,
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const start = () => {
    setVal(displayMask ? displayMask(rawValue) : rawValue);
    setLocalError(null);
    setEditing(true);
  };
  const cancel = () => {
    setVal(displayMask ? displayMask(rawValue) : rawValue);
    setLocalError(null);
    setEditing(false);
  };
  const save = async () => {
    const clean = extract ? extract(val) : val.trim();
    if (validate) {
      const err = validate(clean);
      if (err) {
        setLocalError(err);
        return;
      }
    }
    if (clean === rawValue) {
      setEditing(false);
      return;
    }
    setLocalError(null);
    try {
      await onSave(field, clean);
      setEditing(false);
    } catch {
      // surface via parent's errorMessage, keep the user in edit mode
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') cancel();
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sand bg-cream px-5 py-4">
      <div className="min-w-[180px] flex-1">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-3">
          {label}
        </div>
        {editing ? (
          <input
            type={type}
            inputMode={inputMode}
            value={val}
            autoFocus
            onChange={(e) =>
              setVal(
                displayMask ? displayMask(e.target.value) : e.target.value,
              )
            }
            onKeyDown={onKey}
            className={`w-full rounded-[10px] border-[1.5px] border-sand bg-cream px-3.5 py-2.5 text-base transition-colors focus:border-ink focus:bg-white focus:outline-none ${mono ? 'mono' : ''}`}
          />
        ) : displayValue ? (
          <div
            className={`text-base font-medium ${mono ? 'mono' : ''}`}
          >
            {displayValue}
          </div>
        ) : (
          <div className="text-base font-normal text-ink-3">
            {fallback ?? '—'}
          </div>
        )}
        {(localError || (editing && errorMessage)) && (
          <div className="mt-1.5 text-[12px] font-medium text-clay-d">
            {localError ?? errorMessage}
          </div>
        )}
      </div>
      {editing ? (
        <div className="flex flex-shrink-0 gap-2">
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            className="px-3 py-2 text-[12px] font-semibold text-ink-3"
          >
            cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-full bg-ink px-4 py-2 text-[12px] font-semibold text-cream disabled:opacity-60"
          >
            {saving ? 'salvando…' : 'salvar'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={start}
          className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-clay transition-colors hover:bg-cream-2"
        >
          editar
        </button>
      )}
    </div>
  );
}

function formatCpf(digits: string): string {
  if (digits.length !== 11) return digits;
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

function isoToInputDate(iso: string | null): string {
  if (!iso) return '';
  // Trim to YYYY-MM-DD; works for both ISO and date-only strings.
  return iso.slice(0, 10);
}

function DadosBlock({ me }: { me: MeShape }) {
  const updateM = useUpdateMe();
  const [activeField, setActiveField] = useState<EditableField | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSave = async (field: EditableField, value: string) => {
    setActiveField(field);
    setErrorMessage(null);
    try {
      await updateM.mutateAsync({ [field]: value });
      setActiveField(null);
    } catch (err) {
      setErrorMessage(extractApiMessage(err));
      setActiveField(field);
      throw err;
    }
  };

  const cpfRaw = me.cpf ?? '';
  const cpfDisplay = me.cpf ? formatCpf(me.cpf) : null;
  const birthRaw = isoToInputDate(me.birthDate);
  const birthDisplay = me.birthDate
    ? new Date(me.birthDate).toLocaleDateString('pt-BR')
    : null;

  return (
    <Section eyebrow="01 · você" title="dados pessoais">
      <div className="grid gap-2.5 md:grid-cols-2">
        <ReadRow
          label="nome"
          value={me.name}
          hint="alterar via recepção"
        />
        <EditRow
          label="email"
          field="email"
          type="email"
          inputMode="email"
          displayValue={me.email}
          rawValue={me.email}
          fallback="—"
          onSave={onSave}
          saving={updateM.isPending && activeField === 'email'}
          errorMessage={activeField === 'email' ? errorMessage : null}
          extract={(v) => v.trim()}
          validate={(v) =>
            v.length === 0
              ? 'E-mail é obrigatório'
              : /\S+@\S+\.\S+/.test(v)
                ? null
                : 'E-mail inválido'
          }
        />
        <EditRow
          label="telefone"
          field="phone"
          type="tel"
          inputMode="tel"
          displayValue={me.phone}
          rawValue={me.phone ?? ''}
          fallback="não informado"
          onSave={onSave}
          saving={updateM.isPending && activeField === 'phone'}
          errorMessage={activeField === 'phone' ? errorMessage : null}
          displayMask={maskPhone}
          // Backend's @Matches accepts the masked form, so we pass it as-is.
          extract={(v) => v.trim()}
          validate={(v) =>
            v.length === 0 || /^\+?[0-9\s\-()]{8,20}$/.test(v)
              ? null
              : 'Telefone inválido'
          }
        />
        <EditRow
          label="cpf"
          field="cpf"
          type="text"
          inputMode="numeric"
          mono
          displayValue={cpfDisplay}
          rawValue={cpfRaw}
          fallback="não informado"
          onSave={onSave}
          saving={updateM.isPending && activeField === 'cpf'}
          errorMessage={activeField === 'cpf' ? errorMessage : null}
          // Show "111.222.333-44" while typing, but the backend wants 11
          // raw digits — strip everything else before sending.
          displayMask={maskCpf}
          extract={(v) => digitsOnly(v).slice(0, 11)}
          validate={(v) =>
            v.length === 0 || v.length === 11
              ? null
              : 'CPF deve ter 11 dígitos'
          }
        />
        <EditRow
          label="nascimento"
          field="birthDate"
          type="date"
          mono
          displayValue={birthDisplay}
          rawValue={birthRaw}
          fallback="não informado"
          onSave={onSave}
          saving={updateM.isPending && activeField === 'birthDate'}
          errorMessage={activeField === 'birthDate' ? errorMessage : null}
        />
      </div>
    </Section>
  );
}

function extractApiMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as
      | { message?: string | string[] }
      | undefined;
    if (Array.isArray(data?.message)) return data!.message!.join(' · ');
    if (typeof data?.message === 'string') return data!.message!;
  }
  return 'Algo deu errado. Tenta de novo em alguns segundos.';
}

interface SaudeBlockProps {
  liabilityValid: boolean;
  liabilityExpiresAt: string | null;
  parqValid: boolean;
  parqExpiresAt: string | null;
}

function SaudeBlock({
  liabilityValid,
  liabilityExpiresAt,
  parqValid,
  parqExpiresAt,
}: SaudeBlockProps) {
  const ok = liabilityValid && parqValid;
  return (
    <Section
      eyebrow="02 · responsabilidade"
      title="saúde & termo"
      action={
        <Link
          to="/saude"
          className="text-[13px] font-semibold text-clay hover:underline"
        >
          {ok ? 'rever respostas' : 'responder agora'} →
        </Link>
      }
    >
      <div className="grid gap-2.5 md:grid-cols-2">
        <SaudeCard
          label="termo de responsabilidade"
          sub="renovação mensal"
          valid={liabilityValid}
          expiresAt={liabilityExpiresAt}
        />
        <SaudeCard
          label="par-q · screening"
          sub="renovação trimestral"
          valid={parqValid}
          expiresAt={parqExpiresAt}
        />
      </div>
    </Section>
  );
}

function SaudeCard({
  label,
  sub,
  valid,
  expiresAt,
}: {
  label: string;
  sub: string;
  valid: boolean;
  expiresAt: string | null;
}) {
  return (
    <div
      className={`rounded-2xl border-[1.5px] px-6 py-5 ${
        valid ? 'border-sand bg-cream' : 'border-clay bg-clay/[.06]'
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div>
          <div className="text-sm font-semibold">{label}</div>
          <div className="mt-0.5 text-[12px] text-ink-3">{sub}</div>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-cream"
          style={{
            background: valid
              ? 'var(--color-success)'
              : 'var(--color-clay-d)',
          }}
        >
          {valid ? 'em dia' : 'pendente'}
        </span>
      </div>
      <div className="mt-4 border-t border-dashed border-sand pt-3 text-[12px] text-ink-2">
        {valid ? (
          expiresAt ? (
            <>
              expira em <b>{formatFullDate(expiresAt)}</b>
            </>
          ) : (
            'em dia'
          )
        ) : (
          'responda antes de reservar a próxima aula'
        )}
      </div>
    </div>
  );
}

function PlanoBlock({
  subscriptions,
  payments,
}: {
  subscriptions: ReturnType<typeof useMySubscriptions>['data'];
  payments: Payment[] | undefined;
}) {
  const active = subscriptions?.find(
    (s) => s.status === 'ACTIVE' || s.status === 'PENDING_PAYMENT',
  );
  const recentPayments = (payments ?? [])
    .filter((p) => p.status === 'PAID')
    .slice(0, 5);

  return (
    <Section
      eyebrow="03 · sua assinatura"
      title="plano e pagamento"
      action={
        <Link
          to="/planos"
          className="text-[13px] font-semibold text-clay hover:underline"
        >
          {active ? 'trocar plano' : 'ver planos'} →
        </Link>
      }
    >
      {active ? (
        <div className="grid gap-3.5 md:grid-cols-[1.1fr_.9fr]">
          <div
            className="relative overflow-hidden rounded-2xl px-7 py-6 text-cream"
            style={{ background: 'var(--color-ink)' }}
          >
            <div
              className="pointer-events-none absolute size-[200px] rounded-full bg-clay/40"
              style={{ right: -60, top: -60 }}
            />
            <div className="relative">
              <div className="text-[11px] font-bold uppercase tracking-widest opacity-75">
                plano atual
              </div>
              <div
                className="display-tight mt-2"
                style={{ fontSize: 30, lineHeight: 1 }}
              >
                {active.plan.name.toLowerCase()}
              </div>
              <div
                className="display-tight mono mt-3"
                style={{
                  fontSize: 44,
                  lineHeight: 1,
                  color: 'var(--color-sun)',
                }}
              >
                {formatCents(active.plan.priceCents)}
                <span className="text-base font-normal opacity-80">
                  {' '}
                  /mês
                </span>
              </div>
              <div className="mt-2 text-[13px] opacity-80">
                {active.plan.monthlyCredits} créditos por ciclo
              </div>
              <div className="mt-5 border-t border-cream/20 pt-4 text-[12px] opacity-85">
                próxima renovação ·{' '}
                <b>{formatFullDate(active.currentPeriodEnd)}</b>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border-[1.5px] border-sand bg-cream px-7 py-6">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-clay">
                forma de pagamento
              </div>
              <div
                className="display-tight mt-2"
                style={{ fontSize: 22 }}
              >
                cartão recorrente
              </div>
              <div className="mono mt-2 text-[15px] text-ink-2">
                cobrança automática via asaas
              </div>
              <div className="mt-1 text-[12px] text-ink-3">
                troca de cartão pelo painel da operadora — ou fale com a
                recepção.
              </div>
            </div>
            {active.status === 'PENDING_PAYMENT' && (
              <div className="mt-5 rounded-xl bg-clay/10 px-4 py-3 text-[12px] text-clay-d">
                aguardando confirmação do primeiro pagamento.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-[1.5px] border-dashed border-sand-2 bg-cream-2 px-6 py-8 text-center">
          <div
            className="display-tight"
            style={{ fontSize: 22, lineHeight: 1.1 }}
          >
            sem plano ativo
          </div>
          <p className="mx-auto mt-2 max-w-[420px] text-[13px] text-ink-2">
            você pode comprar pacotes avulsos ou assinar um plano mensal
            quando preferir.
          </p>
          <Link
            to="/planos"
            className="mt-4 inline-flex rounded-full bg-clay px-5 py-2.5 text-[13px] font-semibold text-cream"
          >
            ver planos →
          </Link>
        </div>
      )}

      {recentPayments.length > 0 && (
        <div className="mt-6">
          <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-3">
            histórico de cobranças
          </div>
          <div className="overflow-hidden rounded-xl border border-sand bg-cream">
            {recentPayments.map((p, i) => (
              <div
                key={p.id}
                className={`grid grid-cols-[1fr_auto_auto] items-center gap-3.5 px-5 py-3.5 ${
                  i === 0 ? '' : 'border-t border-cream-2'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold capitalize">
                    {formatFullDate(p.paidAt ?? p.createdAt)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink-3">
                    {paymentMethodLabel(p.method)}
                    {p.kind === 'SUBSCRIPTION_CYCLE'
                      ? ' · plano mensal'
                      : ' · pacote'}
                  </div>
                </div>
                <div className="mono text-sm font-semibold">
                  {formatCents(p.amountCents)}
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-cream"
                  style={{ background: 'var(--color-success)' }}
                >
                  pago
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

function BikeBlock({
  favorite,
}: {
  favorite: DerivedStats['favoriteBike'];
}) {
  return (
    <Section eyebrow="04 · ritual" title="sua bike">
      <div className="grid gap-3.5 md:grid-cols-2">
        <div
          className="relative overflow-hidden rounded-2xl px-7 py-7 text-cream"
          style={{ background: 'var(--color-sea)' }}
        >
          <div
            className="pointer-events-none absolute size-[160px] rounded-full bg-sun/35"
            style={{ left: -50, bottom: -50 }}
          />
          <div className="relative">
            {favorite ? (
              <>
                <div className="text-[11px] font-bold uppercase tracking-widest opacity-80">
                  quando você não escolhe
                </div>
                <div
                  className="display-tight mt-2.5"
                  style={{ fontSize: 26, lineHeight: 1.05 }}
                >
                  a gente sugere
                </div>
                <div
                  className="display-tight mono mt-2"
                  style={{
                    fontSize: 84,
                    lineHeight: 1,
                    color: 'var(--color-sun)',
                  }}
                >
                  {favorite.label}
                </div>
                <div className="mt-3 max-w-[300px] text-[13px] opacity-85">
                  {favorite.row && favorite.col
                    ? `fileira ${favorite.row}, posição ${favorite.col}.`
                    : ''}{' '}
                  Você reservou essa bike{' '}
                  <b>
                    {favorite.count}{' '}
                    {favorite.count === 1 ? 'vez' : 'vezes'}
                  </b>
                  .
                </div>
              </>
            ) : (
              <>
                <div className="text-[11px] font-bold uppercase tracking-widest opacity-80">
                  ainda em construção
                </div>
                <div
                  className="display-tight mt-2.5"
                  style={{ fontSize: 26, lineHeight: 1.05 }}
                >
                  reserve sua primeira aula
                </div>
                <div className="mt-3 max-w-[320px] text-[13px] opacity-85">
                  conforme você escolhe bikes, a gente passa a entender qual
                  é a sua preferida — e te sugere ela primeiro.
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border-[1.5px] border-sand bg-cream px-6 py-6">
          <div className="text-[11px] font-bold uppercase tracking-widest text-clay">
            como a bike preferida funciona
          </div>
          <div className="mt-2 text-[13px] leading-relaxed text-ink-2">
            é só uma estatística — a gente não bloqueia bikes pra você. No
            momento da reserva, se a sua bike preferida estiver livre, ela
            aparece destacada na arena. Se estiver ocupada, basta escolher
            outra.
          </div>
          <div className="mt-4 rounded-xl bg-cream-2 px-4 py-3 text-[12px] text-ink-2">
            <b>dica:</b> bikes próximas ao palco têm mais som e visibilidade
            do instrutor.
          </div>
        </div>
      </div>
    </Section>
  );
}

interface Achievement {
  k: string;
  l: string;
  icon: string;
  unlocked: boolean;
  desc: string;
  hint?: string;
}

function ConquistasBlock({ stats }: { stats: DerivedStats }) {
  const achievements: Achievement[] = useMemo(() => {
    const a = stats.aulasFeitas;
    const s = stats.streakDays;
    return [
      {
        k: 'first',
        l: 'primeira pedalada',
        icon: '☼',
        unlocked: a >= 1,
        desc: 'sua aula de estreia',
        hint: a === 0 ? 'reserve sua primeira aula' : undefined,
      },
      {
        k: 'ten',
        l: '10 aulas',
        icon: 'X',
        unlocked: a >= 10,
        desc: 'o ritual está formado',
        hint: a < 10 ? `faltam ${10 - a}` : undefined,
      },
      {
        k: 'thirty',
        l: '30 aulas',
        icon: 'XXX',
        unlocked: a >= 30,
        desc: 'membro de verdade',
        hint: a < 30 && a >= 10 ? `faltam ${30 - a}` : undefined,
      },
      {
        k: 'fifty',
        l: '50 aulas',
        icon: 'L',
        unlocked: a >= 50,
        desc: 'meio caminho pro centenário',
        hint: a < 50 && a >= 30 ? `faltam ${50 - a}` : undefined,
      },
      {
        k: 'hundred',
        l: '100 aulas',
        icon: 'C',
        unlocked: a >= 100,
        desc: 'clube dos centenários',
        hint: a < 100 && a >= 50 ? `faltam ${100 - a}` : undefined,
      },
      {
        k: 'streak7',
        l: '7 dias seguidos',
        icon: '~',
        unlocked: s >= 7,
        desc: 'streak forte',
        hint: s < 7 && s > 0 ? `${s}/7` : undefined,
      },
      {
        k: 'streak30',
        l: '30 dias seguidos',
        icon: '≈',
        unlocked: s >= 30,
        desc: 'streak épico',
        hint: s < 30 && s > 0 ? `${s}/30` : undefined,
      },
    ];
  }, [stats.aulasFeitas, stats.streakDays]);
  const earned = achievements.filter((a) => a.unlocked).length;

  return (
    <Section eyebrow="05 · marcos" title="suas conquistas">
      <div
        className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl px-7 py-6 text-cream"
        style={{
          background: 'linear-gradient(135deg, var(--color-clay), var(--color-sun))',
        }}
      >
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest opacity-85">
            streak ativo
          </div>
          <div
            className="display-tight mt-1.5"
            style={{ fontSize: 26, lineHeight: 1.05 }}
          >
            {stats.streakDays}{' '}
            {stats.streakDays === 1 ? 'dia' : 'dias'} seguidos pedalando
          </div>
          <div className="mt-1 text-[13px] opacity-85">
            {stats.streakDays >= 30
              ? 'você é um streak épico — mantém aí.'
              : stats.streakDays === 0
                ? 'volte a pedalar pra acender o streak.'
                : `próxima meta: ${stats.streakDays >= 7 ? 30 : 7} dias · faltam ${
                    (stats.streakDays >= 7 ? 30 : 7) - stats.streakDays
                  }`}
          </div>
        </div>
        <div className="flex items-end gap-1.5">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[3px]"
              style={{
                width: i === 13 ? 16 : 10,
                height: 10 + i * 1.4,
                background:
                  i < stats.streakDays % 14
                    ? 'var(--color-cream)'
                    : 'rgba(246,239,226,.3)',
              }}
            />
          ))}
        </div>
      </div>

      <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-3">
        medalhas · {earned}/{achievements.length} desbloqueadas
      </div>

      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(170px,1fr))]">
        {achievements.map((c) => (
          <div
            key={c.k}
            className="overflow-hidden rounded-2xl border px-4 py-4"
            style={{
              background: c.unlocked
                ? 'var(--color-cream)'
                : 'var(--color-cream-2)',
              borderColor: c.unlocked
                ? 'var(--color-sand)'
                : 'var(--color-sand-2)',
              opacity: c.unlocked ? 1 : 0.6,
            }}
          >
            <div
              className="display-tight"
              style={{
                fontSize: 32,
                lineHeight: 1,
                color: c.unlocked
                  ? 'var(--color-clay)'
                  : 'var(--color-ink-3)',
              }}
            >
              {c.icon}
            </div>
            <div className="mt-3 text-sm font-semibold leading-tight">
              {c.l}
            </div>
            <div className="mt-1 text-[11px] leading-snug text-ink-3">
              {c.desc}
            </div>
            <div
              className="mono mt-2.5 border-t border-dashed pt-2.5 text-[10px] uppercase tracking-wide"
              style={{
                borderColor: c.unlocked
                  ? 'var(--color-sand)'
                  : 'var(--color-sand-2)',
                color: c.unlocked
                  ? 'var(--color-ink-3)'
                  : 'var(--color-sand-2)',
              }}
            >
              {c.unlocked ? 'desbloqueado' : (c.hint ?? 'bloqueado')}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ZonaConta({ hideFromFriends }: { hideFromFriends: boolean }) {
  const logout = useLogout();
  const visibilityM = useUpdateVisibility();
  const [hidden, setHidden] = useState(hideFromFriends);

  const toggleVisibility = () => {
    const next = !hidden;
    setHidden(next);
    visibilityM.mutate(next, {
      onError: () => setHidden(hidden), // revert on failure
    });
  };

  return (
    <Section eyebrow="06 · conta" title="privacidade & saída">
      <div className="grid gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand bg-cream px-6 py-4.5">
          <div className="max-w-[520px]">
            <div className="text-sm font-semibold">modo invisível</div>
            <div className="mt-1 text-[12px] leading-snug text-ink-3">
              suas reservas ficam ocultas pros seus amigos no app — você
              continua vendo as deles normalmente.
            </div>
          </div>
          <button
            type="button"
            onClick={toggleVisibility}
            disabled={visibilityM.isPending}
            aria-pressed={hidden}
            className="relative inline-flex h-8 w-14 flex-shrink-0 items-center rounded-full border-[1.5px] transition-colors disabled:opacity-50"
            style={{
              borderColor: hidden
                ? 'var(--color-ink)'
                : 'var(--color-sand)',
              background: hidden ? 'var(--color-ink)' : 'transparent',
            }}
          >
            <span
              className="absolute size-6 rounded-full transition-transform"
              style={{
                background: hidden
                  ? 'var(--color-cream)'
                  : 'var(--color-ink-2)',
                transform: hidden ? 'translateX(24px)' : 'translateX(2px)',
              }}
            />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand bg-cream px-6 py-4">
          <div>
            <div className="text-sm font-semibold">sair desse dispositivo</div>
            <div className="mt-1 text-[12px] text-ink-3">
              você precisará entrar de novo na próxima vez.
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink px-5 py-2.5 text-[13px] font-semibold transition-colors hover:bg-ink hover:text-cream"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            sair
          </button>
        </div>

        <div
          className="rounded-2xl border-[1.5px] px-6 py-5"
          style={{
            background: 'rgba(216,93,52,.06)',
            borderColor: 'var(--color-clay)',
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-[480px]">
              <div className="text-[11px] font-bold uppercase tracking-widest text-clay-d">
                zona perigosa
              </div>
              <div
                className="display-tight mt-1.5"
                style={{ fontSize: 22 }}
              >
                excluir minha conta
              </div>
              <p className="mt-2 text-[13px] leading-snug text-ink-2">
                isso apaga seu histórico, conquistas e dados pessoais. plano
                ativo é cancelado, mas <b>sem reembolso</b> do mês corrente.
                A exclusão hoje só é feita pela equipe — fale com a recepção
                ou envie um e-mail.
              </p>
            </div>
            <a
              href="mailto:contato@bikebeach.com.br?subject=Exclusao%20de%20conta"
              className="whitespace-nowrap rounded-full border-[1.5px] border-clay-d px-4 py-2.5 text-[13px] font-semibold text-clay-d hover:bg-clay-d hover:text-cream"
            >
              pedir exclusão
            </a>
          </div>
        </div>
      </div>
    </Section>
  );
}
