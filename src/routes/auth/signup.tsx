import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  authApi,
  type FitnessLevelEnum,
  type UserGoalEnum,
} from '@/api/auth';
import {
  AuthInput,
  CheckBox,
  Field,
  PasswordInput,
} from '@/components/auth/fields';
import { ContaShell } from '@/components/auth/shell';
import {
  birthToIsoDate,
  digitsOnly,
  isValidEmail,
  maskBirth,
  maskCpf,
  maskPhone,
} from '@/lib/masks';
import { useAuthStore } from '@/stores/auth';

interface FormState {
  nome: string;
  email: string;
  phone: string;
  pwd: string;
  cpf: string;
  birth: string;
  goal: UserGoalKey | '';
  level: FitnessLevelEnum | '';
  terms: boolean;
}

type UserGoalKey = 'queimar' | 'forma' | 'energia' | 'amigos';

const GOAL_OPTIONS: ReadonlyArray<[UserGoalKey, string, UserGoalEnum]> = [
  ['queimar', 'queimar gordura', 'PERDER_PESO'],
  ['forma', 'entrar em forma', 'GANHAR_CONDICIONAMENTO'],
  ['energia', 'mais energia no dia', 'MANTER_FORMA'],
  ['amigos', 'conhecer gente nova', 'OUTRO'],
];

const LEVEL_OPTIONS: ReadonlyArray<[FitnessLevelEnum, string]> = [
  ['INICIANTE', 'novato'],
  ['INTERMEDIARIO', 'já pedalei'],
  ['AVANCADO', 'sou da casa'],
];

interface FormErrors {
  nome?: string;
  email?: string;
  phone?: string;
  pwd?: string;
  cpf?: string;
  birth?: string;
  goal?: string;
  level?: string;
  terms?: string;
  form?: string;
}

export function SignupRoute() {
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [data, setData] = useState<FormState>({
    nome: '',
    email: '',
    phone: '',
    pwd: '',
    cpf: '',
    birth: '',
    goal: '',
    level: '',
    terms: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  /// Strength meter — same scoring as the prototype.
  const pwdScore = useMemo(() => {
    let s = 0;
    if (data.pwd.length >= 8) s++;
    if (/[A-Z]/.test(data.pwd)) s++;
    if (/[0-9]/.test(data.pwd)) s++;
    if (/[^A-Za-z0-9]/.test(data.pwd)) s++;
    return s;
  }, [data.pwd]);

  const validateStep0 = (): boolean => {
    const e: FormErrors = {};
    if (data.nome.trim().length < 2) e.nome = 'como a gente te chama?';
    if (!isValidEmail(data.email)) e.email = 'email inválido';
    if (digitsOnly(data.phone).length < 10) e.phone = 'telefone incompleto';
    if (data.pwd.length < 8) e.pwd = 'mínimo 8 caracteres';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep1 = (): boolean => {
    const e: FormErrors = {};
    if (digitsOnly(data.cpf).length !== 11) e.cpf = 'cpf incompleto';
    if (digitsOnly(data.birth).length !== 8) e.birth = 'data inválida';
    if (!data.goal) e.goal = 'escolhe pelo menos um objetivo';
    if (!data.level) e.level = 'escolhe seu nível';
    if (!data.terms) e.terms = 'preciso que você concorde';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: authApi.signup,
    onSuccess: (res) => {
      setSession(res.accessToken, res.refreshToken, res.user);
      setStep(2);
      // Brief celebratory pause before navigating, mirroring the prototype.
      setTimeout(() => navigate('/dashboard', { replace: true }), 1600);
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (err as any).response?.data?.message ?? 'algo deu errado.'
          : 'algo deu errado.';
      setErrors((e) => ({
        ...e,
        form:
          typeof message === 'string'
            ? message
            : 'não deu pra criar a conta. tenta de novo em instantes.',
      }));
    },
  });

  const next = () => {
    if (step === 0 && validateStep0()) {
      setStep(1);
      return;
    }
    if (step === 1 && validateStep1()) {
      const goalApi = GOAL_OPTIONS.find((g) => g[0] === data.goal)?.[2];
      mutation.mutate({
        name: data.nome.trim(),
        email: data.email.trim(),
        password: data.pwd,
        phone: data.phone || undefined,
        cpf: digitsOnly(data.cpf),
        birthDate: birthToIsoDate(data.birth),
        goal: goalApi,
        fitnessLevel: (data.level || undefined) as FitnessLevelEnum | undefined,
      });
    }
  };

  if (step === 2) {
    return (
      <ContaShell mode="cadastro">
        <div className="flex min-h-[520px] flex-col justify-center gap-4 px-2 pt-10 lg:px-2">
          <div
            className="display"
            style={{ fontSize: 80, lineHeight: 0.9 }}
          >
            tá
            <br />
            <span className="font-normal italic text-clay">dentro!</span>
          </div>
          <p className="mt-3 max-w-[420px] text-[17px] text-ink-2">
            oi, <b>{data.nome.split(' ')[0] || 'ciclista'}</b>. levando você
            pro painel — escolha sua primeira aula por lá.
          </p>
          <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-cream-2">
            <div
              className="h-full bg-clay"
              style={{
                width: '100%',
                animation: 'bb-fill 1.6s ease forwards',
              }}
            />
          </div>
        </div>
      </ContaShell>
    );
  }

  return (
    <ContaShell mode="cadastro">
      <div className="flex flex-col gap-4 px-2 pt-10 lg:px-2">
        <div>
          <div className="flex items-center justify-between gap-4">
            <h1
              className="display-tight whitespace-nowrap"
              style={{ fontSize: 48, lineHeight: 1 }}
            >
              cadastro
            </h1>
            <span className="whitespace-nowrap text-[13px] font-semibold text-ink-2">
              passo {step + 1} <span className="opacity-50">/ 2</span>
            </span>
          </div>
          <p className="mt-2 text-[15px] text-ink-2">
            já tem conta?{' '}
            <Link
              to="/login"
              className="border-b-[1.5px] border-clay font-bold text-clay"
            >
              entrar
            </Link>
          </p>
          <div className="mt-4 flex gap-1.5">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-[5px] flex-1 rounded-full transition-colors"
                style={{
                  background:
                    i <= step
                      ? 'var(--color-clay)'
                      : 'var(--color-cream-2)',
                }}
              />
            ))}
          </div>
        </div>

        {step === 0 && (
          <>
            <Field label="seu nome" error={errors.nome}>
              <AuthInput
                placeholder="como a gente te chama?"
                value={data.nome}
                onChange={(e) => set('nome', e.target.value)}
                error={!!errors.nome}
                autoComplete="name"
              />
            </Field>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="email" error={errors.email}>
                <AuthInput
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="voce@email.com"
                  value={data.email}
                  onChange={(e) => set('email', e.target.value)}
                  error={!!errors.email}
                />
              </Field>
              <Field label="celular" error={errors.phone}>
                <AuthInput
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(47) 99999-9999"
                  value={data.phone}
                  onChange={(e) => set('phone', maskPhone(e.target.value))}
                  error={!!errors.phone}
                />
              </Field>
            </div>
            <Field
              label="crie uma senha"
              error={errors.pwd}
              hint="oito caracteres ou mais. mistura número, letra maiúscula e símbolo pra ficar forte."
            >
              <PasswordInput
                autoComplete="new-password"
                value={data.pwd}
                onChange={(e) => set('pwd', e.target.value)}
                error={!!errors.pwd}
              />
            </Field>
            {data.pwd.length > 0 && (
              <div className="-mt-1.5 flex items-center gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-[5px] flex-1 rounded-full"
                    style={{
                      background:
                        i < pwdScore
                          ? pwdScore <= 1
                            ? 'var(--color-clay-d)'
                            : pwdScore === 2
                              ? 'var(--color-sun)'
                              : 'var(--color-sea)'
                          : 'var(--color-cream-2)',
                    }}
                  />
                ))}
                <span className="ml-1 text-[11px] font-semibold text-ink-2">
                  {pwdScore <= 1
                    ? 'fraca'
                    : pwdScore === 2
                      ? 'ok'
                      : pwdScore === 3
                        ? 'boa'
                        : 'forte'}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={next}
              className="mt-3 inline-flex items-center justify-center gap-2.5 rounded-full bg-ink px-7 py-5 text-base font-semibold text-cream transition-colors hover:bg-ink-2"
            >
              continuar <span>→</span>
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[1.4fr_1fr]">
              <Field label="cpf" error={errors.cpf}>
                <AuthInput
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={data.cpf}
                  onChange={(e) => set('cpf', maskCpf(e.target.value))}
                  error={!!errors.cpf}
                />
              </Field>
              <Field label="nascimento" error={errors.birth}>
                <AuthInput
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  value={data.birth}
                  onChange={(e) => set('birth', maskBirth(e.target.value))}
                  error={!!errors.birth}
                />
              </Field>
            </div>

            <Field label="qual seu objetivo?" error={errors.goal}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {GOAL_OPTIONS.map(([key, label]) => {
                  const on = data.goal === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => set('goal', key)}
                      className="rounded-[14px] border-[1.5px] px-4 py-3.5 text-left text-sm font-semibold transition-all"
                      style={{
                        borderColor: on
                          ? 'var(--color-ink)'
                          : 'var(--color-sand)',
                        background: on
                          ? 'var(--color-ink)'
                          : 'transparent',
                        color: on
                          ? 'var(--color-cream)'
                          : 'var(--color-ink)',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field
              label="seu nível com bike de spinning"
              error={errors.level}
            >
              <div className="grid grid-cols-3 gap-2">
                {LEVEL_OPTIONS.map(([key, label]) => {
                  const on = data.level === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => set('level', key)}
                      className="rounded-[14px] border-[1.5px] px-3 py-3.5 text-sm font-semibold transition-all"
                      style={{
                        borderColor: on
                          ? 'var(--color-clay)'
                          : 'var(--color-sand)',
                        background: on
                          ? 'var(--color-clay)'
                          : 'transparent',
                        color: on
                          ? 'var(--color-cream)'
                          : 'var(--color-ink)',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <CheckBox
              checked={data.terms}
              onChange={(v) => set('terms', v)}
              error={!!errors.terms}
            >
              <span className="text-[13px] leading-snug text-ink-2">
                concordo com os{' '}
                <a
                  href="/termos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-clay underline-offset-2 hover:underline"
                >
                  termos de uso
                </a>{' '}
                e a{' '}
                <a
                  href="/privacidade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-clay underline-offset-2 hover:underline"
                >
                  política de privacidade
                </a>
                . ciente de que atividade física tem riscos e que devo
                avisar antes da aula se tiver qualquer condição de saúde.
              </span>
            </CheckBox>
            {errors.terms && (
              <span className="-mt-2 text-xs font-medium text-clay-d">
                ↳ {errors.terms}
              </span>
            )}

            {errors.form && (
              <div className="rounded-xl bg-clay-d/10 px-4 py-3 text-sm font-medium text-clay-d">
                {errors.form}
              </div>
            )}

            <div className="mt-2 flex gap-2.5">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="rounded-full border-[1.5px] border-ink px-6 py-5 text-[15px] font-semibold transition-colors hover:bg-cream-2"
                disabled={mutation.isPending}
              >
                ← voltar
              </button>
              <button
                type="button"
                onClick={next}
                disabled={mutation.isPending}
                className="flex flex-1 items-center justify-center gap-2.5 rounded-full bg-clay px-7 py-5 text-base font-semibold text-cream shadow-[0_18px_40px_-16px_rgba(216,93,52,.6)] transition-colors hover:bg-clay-d disabled:opacity-60"
              >
                {mutation.isPending ? 'criando…' : 'criar conta →'}
              </button>
            </div>
          </>
        )}
      </div>
    </ContaShell>
  );
}
