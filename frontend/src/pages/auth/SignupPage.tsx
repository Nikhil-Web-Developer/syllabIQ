import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Lock, Mail, User, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

const signupSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid official email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long'),
  role: z.enum(['trainee', 'trainer']),
  bio: z.string().optional(),
});

type SignupFormData = z.infer<typeof signupSchema>;

export const SignupPage: React.FC = () => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: 'trainee',
      name: '',
      email: '',
      password: '',
      bio: '',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: SignupFormData) => {
    setServerError(null);
    try {
      const res = await api.post('/auth/signup', data);
      const user = res.data.user;
      setUser(user);
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/pending-approval');
      }, 1200);
    } catch (err: any) {
      setServerError(
        err.response?.data?.message ||
          'Registration failed. Please check your information and try again.',
      );
    }
  };

  return (
    <div className="mx-auto max-w-lg py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">Create Account</h1>
        <p className="mt-2 text-sm text-slate-400">
          Join the Ministry of Earth Sciences Digital Capacity Building Portal
        </p>
      </div>

      <Card>
        {serverError && (
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-rose-950/60 border border-rose-800/80 p-3.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {isSuccess && (
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 p-3.5 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Account registered successfully! Redirecting to approval portal...</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                id="signup-name-input"
                type="text"
                {...register('name')}
                placeholder="Dr. Rajesh Kumar"
                className="w-full rounded-xl bg-slate-900/80 border border-slate-700 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-xs text-rose-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Official Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                id="signup-email-input"
                type="email"
                {...register('email')}
                placeholder="rajesh.kumar@moes.gov.in"
                className="w-full rounded-xl bg-slate-900/80 border border-slate-700 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-rose-400">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Password (Min 8 Characters)
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                id="signup-password-input"
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

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Account Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="select-role-trainee"
                onClick={() => setValue('role', 'trainee')}
                className={`rounded-xl border p-3.5 text-left transition-all ${
                  selectedRole === 'trainee'
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 shadow-md shadow-emerald-950/40'
                    : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="font-bold text-sm text-white">Trainee</div>
                <div className="text-xs text-slate-400 mt-0.5">Learner &amp; Participant</div>
              </button>

              <button
                type="button"
                id="select-role-trainer"
                onClick={() => setValue('role', 'trainer')}
                className={`rounded-xl border p-3.5 text-left transition-all ${
                  selectedRole === 'trainer'
                    ? 'border-blue-500 bg-blue-950/40 text-blue-300 shadow-md shadow-blue-950/40'
                    : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="font-bold text-sm text-white">Trainer</div>
                <div className="text-xs text-slate-400 mt-0.5">Course &amp; Quiz Author</div>
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              * Admin accounts cannot be self-registered and are provisioned directly by existing administrators.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Designation / Professional Bio
            </label>
            <textarea
              id="signup-bio-input"
              rows={2}
              {...register('bio')}
              placeholder="e.g. Scientific Officer at IMD / INCOIS Numerical Modeling Wing"
              className="w-full rounded-xl bg-slate-900/80 border border-slate-700 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <Button
            id="signup-submit-btn"
            type="submit"
            isLoading={isSubmitting}
            className="w-full mt-2"
          >
            Submit Registration
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-700/60 text-center">
          <p className="text-xs text-slate-400">
            Already have an approved account?{' '}
            <Link to="/login" className="text-brand-400 font-semibold hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};
