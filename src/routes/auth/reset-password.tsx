import { useMutation } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AxiosError } from 'axios';
import { authApi } from '@/api/auth';
import { Field, PasswordInput } from '@/components/auth/fields';
import { ContaShell } from '@/components/auth/shell';

interface FormErrors {
  password?: string;
  confirm?: string;
  form?: string;
}

/// Consome o `?token=…` do link enviado por e-mail (ou copiado do log em dev)
/// e troca a senha. Quando o backend confirma, revoga toda a sessão ativa e
/// joga o usuário pro login com um aviso de sucesso.
export function ResetPasswordRoute() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const mutation = useMutation({
    mutationFn: authApi.resetPassword,
    onError: (err: unknown) => {
      if (err instanceof AxiosError && err.response?.status === 401) {
        setErrors({
          form: 'esse link expirou ou já foi usado. peça um novo.',
        });
      } else {
        setErrors({ form: 'não rolou. tenta de novo em alguns segundos.' });
      }
    },
    onSuccess: () => {
      navigate('/login', {
        replace: true,
        state: { flash: 'senha redefinida — entra com a nova.' },
      });
    },
  });

  useEffect(() => {
    if (!token) {
      setErrors({ form: 'link inválido. abra o e-mail e clique de novo.' });
    }
  }, [token]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: FormErrors = {};
    if (password.length < 8) next.password = 'mínimo 8 caracteres';
    if (confirm !== password) next.confirm = 'as duas senhas precisam bater';
    setErrors(next);
    if (Object.keys(next).length) return;
    mutation.mutate({ token, password });
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
            nova senha
          </h1>
          <p className="mt-2 text-[15px] text-ink-2">
            depois disso, é só{' '}
            <Link
              to="/login"
              className="border-b-[1.5px] border-clay font-bold text-clay"
            >
              entrar
            </Link>{' '}
            com ela.
          </p>
        </div>

        <Field label="nova senha" error={errors.password}>
          <PasswordInput
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!errors.password}
          />
        </Field>

        <Field label="confirme" error={errors.confirm}>
          <PasswordInput
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={!!errors.confirm}
          />
        </Field>

        {errors.form && (
          <div className="rounded-xl bg-clay-d/10 px-4 py-3 text-sm font-medium text-clay-d">
            {errors.form}
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending || !token}
          className="mt-2 inline-flex items-center justify-center gap-2.5 rounded-full bg-clay px-7 py-5 text-base font-semibold text-cream transition-all disabled:opacity-60"
        >
          {mutation.isPending ? 'salvando…' : 'redefinir senha →'}
        </button>
      </form>
    </ContaShell>
  );
}
