import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { authApi } from '@/api/auth';
import {
  AuthInput,
  CheckBox,
  Field,
  PasswordInput,
} from '@/components/auth/fields';
import { ContaShell } from '@/components/auth/shell';
import { isValidEmail } from '@/lib/masks';
import { useAuthStore } from '@/stores/auth';

interface LoginErrors {
  email?: string;
  password?: string;
  form?: string;
}

export function LoginRoute() {
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<LoginErrors>({});

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setSession(data.accessToken, data.refreshToken, data.user);
      const home =
        data.user.role === 'ADMIN'
          ? '/admin'
          : data.user.role === 'INSTRUCTOR'
            ? '/professor'
            : '/dashboard';
      navigate(home, { replace: true });
    },
    onError: () => {
      setErrors((e) => ({
        ...e,
        form: 'email ou senha não bateram. tenta de novo.',
      }));
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: LoginErrors = {};
    if (!isValidEmail(email)) next.email = 'email não parece válido';
    if (password.length < 8) next.password = 'mínimo 8 caracteres';
    setErrors(next);
    if (Object.keys(next).length) return;
    mutation.mutate({ email, password });
  };

  const success = mutation.isSuccess;

  return (
    <ContaShell mode="login">
      <form
        onSubmit={submit}
        className="flex flex-col gap-4 px-2 pt-10 lg:px-2"
      >
        <div>
          <h1
            className="display-tight"
            style={{ fontSize: 48, lineHeight: 1 }}
          >
            entrar
          </h1>
          <p className="mt-2 text-[15px] text-ink-2">
            ainda não é da casa?{' '}
            <Link
              to="/cadastro"
              className="border-b-[1.5px] border-clay font-bold text-clay"
            >
              criar conta
            </Link>
          </p>
        </div>

        <Field label="email" error={errors.email}>
          <AuthInput
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!errors.email}
          />
        </Field>

        <Field label="senha" error={errors.password}>
          <PasswordInput
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!errors.password}
          />
        </Field>

        <div className="flex items-center justify-between">
          <CheckBox checked={remember} onChange={setRemember}>
            <span className="font-medium">continuar conectado</span>
          </CheckBox>
          <Link
            to="/esqueci-senha"
            className="text-sm font-semibold text-clay"
          >
            esqueci a senha
          </Link>
        </div>

        {errors.form && (
          <div className="rounded-xl bg-clay-d/10 px-4 py-3 text-sm font-medium text-clay-d">
            {errors.form}
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending || success}
          className="mt-2 inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-5 text-base font-semibold text-cream transition-all disabled:opacity-60"
          style={{
            background: success
              ? 'var(--color-sea)'
              : 'var(--color-clay)',
          }}
        >
          {success
            ? 'indo pro painel ✓'
            : mutation.isPending
              ? 'validando…'
              : (
                <>
                  entrar <span>→</span>
                </>
              )}
        </button>
      </form>
    </ContaShell>
  );
}
