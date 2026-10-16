import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Lock, Mail, AlertCircle, Sparkles, Clock } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPendingBlocked, setIsPendingBlocked] = useState(false);
  const { setAuth, setUser } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setIsPendingBlocked(false);

    try {
      const res = await api.post('/auth/login', data);
      const { user, tokens } = res.data;
      setAuth(user, tokens);

      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'trainer') {
        navigate('/trainer/dashboard');
      } else {
        navigate('/trainee/dashboard');
      }
    } catch (err: any) {
      if (!err.response) {
        setServerError(
          'Cannot connect to the backend API at http://localhost:4000. Please make sure the backend is running in a terminal ("npm run start:dev" inside the backend folder).',
        );
        return;
      }

      const msg =
        err.response?.data?.message || 'Login failed. Please verify your credentials.';
      setServerError(msg);

      if (
        err.response?.status === 403 &&
        msg.toLowerCase().includes('pending')
      ) {
        setIsPendingBlocked(true);
        // Save pending user context for status page
        setUser({
          id: 'pending',
          name: data.email.split('@')[0],
          email: data.email,
          role: 'trainee',
          status: 'pending',
        });
      }
    }
  };

  const fillDemoAdmin = () => {
    setValue('email', 'admin@syllabiq.gov.in', { shouldValidate: true });
    setValue('password', 'Admin@SyllabIQ2026', { shouldValidate: true });
    setServerError(null);
  };

  const fillDemoTrainer = () => {
    setValue('email', 'trainer@moes.gov.in', { shouldValidate: true });
    setValue('password', 'Trainer@SyllabIQ2026', { shouldValidate: true });
    setServerError(null);
  };

  const fillDemoTrainee = () => {
    setValue('email', 'trainee@moes.gov.in', { shouldValidate: true });
    setValue('password', 'Trainee@SyllabIQ2026', { shouldValidate: true });
    setServerError(null);
  };

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">Portal Sign In</h1>
        <p className="mt-2 text-sm text-slate-400">
          Access your SyllabIQ capacity building workspace
        </p>
      </div>

      <Card>
        {serverError && (
          <div
            id="login-error-banner"
            className={`mb-6 rounded-xl border p-3.5 text-xs ${
              isPendingBlocked
                ? 'border-amber-500/80 bg-amber-950/60 text-amber-300'
                : 'border-rose-800/80 bg-rose-950/60 text-rose-300'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isPendingBlocked ? (
                <Clock className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <div className="space-y-1.5 flex-1">
                <p className="font-semibold">{serverError}</p>
                {isPendingBlocked && (
                  <Link
                    to="/pending-approval"
                    className="inline-block font-bold text-amber-300 underline hover:text-white"
                  >
                    View Account Review Status Page →
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                id="login-email-input"
                type="email"
                {...register('email')}
                placeholder="name@moes.gov.in"
                className="w-full rounded-xl bg-slate-900/80 border border-slate-700 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-rose-400">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                id="login-password-input"
                type="password"
                {...register('password')}
                placeholder="••••••••"
                className="w-full rounded-xl bg-slate-900/80 border border-slate-700 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-rose-400">{errors.password.message}</p>
            )}
          </div>

          <Button
            id="login-submit-btn"
            type="submit"
            isLoading={isSubmitting}
            className="w-full mt-2"
          >
            Sign In to Dashboard
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-700/60 text-center">
          <p className="text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/signup" className="text-brand-400 font-semibold hover:underline">
              Create one here
            </Link>
          </p>
        </div>
      </Card>

      {/* Pre-approved Demo Accounts Shortcuts */}
      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-xs space-y-3">
        <p className="font-semibold text-slate-200 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          Pre-approved Demo Accounts (Instant Login)
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            id="fill-demo-admin-btn"
            onClick={fillDemoAdmin}
            className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-950/20 hover:bg-purple-900/40 text-left transition-colors"
          >
            <span className="block font-bold text-purple-300">Admin</span>
            <span className="block text-[11px] text-slate-400 mt-0.5">Approve users</span>
          </button>

          <button
            type="button"
            id="fill-demo-trainer-btn"
            onClick={fillDemoTrainer}
            className="p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-900/40 text-left transition-colors"
          >
            <span className="block font-bold text-cyan-300">Trainer</span>
            <span className="block text-[11px] text-slate-400 mt-0.5">Author courses</span>
          </button>

          <button
            type="button"
            id="fill-demo-trainee-btn"
            onClick={fillDemoTrainee}
            className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-900/40 text-left transition-colors"
          >
            <span className="block font-bold text-emerald-300">Trainee</span>
            <span className="block text-[11px] text-slate-400 mt-0.5">Learn &amp; certify</span>
          </button>
        </div>
      </div>
    </div>
  );
};
