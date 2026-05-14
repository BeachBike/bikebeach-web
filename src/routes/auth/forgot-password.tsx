import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { authApi } from '@/api/auth';
import { AuthInput, Field } from '@/components/auth/fields';
import { ContaShell } from '@/components/auth/shell';
import { isValidEmail } from '@/lib/masks';

/// Solicita o link de reset por e-mail. O backend é stub (sem envio real) até
/// a Fase 6 ligar o Resend — em dev o `devToken` volta no payload e a CLI
/// loga a URL completa. Para o usuário a UX é a mesma: "se essa conta existe,
/// mandamos o link" — não vazamos existência de e-mail.
export function ForgotPasswordRoute() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  // Dev-only: o backend devolve o token quando NODE_ENV !== 'production'
  // pra a gente conseguir testar o fluxo sem precisar mexer no log.
  const [devToken, setDevToken] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: (data) => {
      setSent(true);
      setDevToken(data.devToken ?? null);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setEmailError('email não parece válido');
      return;
    }
    setEmailError(null);
    mutation.mutate(email);
  };

  return (
    <ContaShell mode="recovery">
      <form
        onSubmit={submit}
        className="flex flex-col gap-4 px-2 pt-10 lg:px-2"
      >
        <div>
          <h1
            className="display-tight"
            style={{ fontSize: 48, lineHeight: 1 }}
          >
            esqueci a senha
          </h1>
          <p className="mt-2 text-[15px] text-ink-2">
            lembrou agora?{' '}
            <Link
              to="/login"
              className="border-b-[1.5px] border-clay font-bold text-clay"
            >
              voltar pro login
            </Link>
          </p>
        </div>

        {!sent ? (
          <>
            <Field label="email da sua conta" error={emailError ?? undefined}>
              <AuthInput
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="voce@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!emailError}
              />
            </Field>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="mt-2 inline-flex items-center justify-center gap-2.5 rounded-full bg-clay px-7 py-5 text-base font-semibold text-cream transition-all disabled:opacity-60"
            >
              {mutation.isPending ? 'enviando…' : 'mandar link de reset →'}
            </button>
          </>
        ) : (
          <div className="rounded-2xl bg-cream-2 px-6 py-7 text-[15px] text-ink-2">
            <p className="font-semibold text-ink">
              Se essa conta existe, mandamos um link pra <strong>{email}</strong>.
            </p>
            <p className="mt-2">
              Olha sua caixa de entrada (e o spam, vai que). O link vale por
              1 hora.
            </p>
            {devToken && (
              <p className="mt-4 rounded-lg bg-ink/5 px-3 py-2 text-xs">
                <strong>dev:</strong>{' '}
                <Link
                  to={`/redefinir-senha?token=${devToken}`}
                  className="font-mono text-clay underline"
                >
                  /redefinir-senha?token={devToken.slice(0, 18)}…
                </Link>
              </p>
            )}
          </div>
        )}
      </form>
    </ContaShell>
  );
}
