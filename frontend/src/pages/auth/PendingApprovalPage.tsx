import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Clock, ShieldAlert, LogOut, ArrowRight, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

export const PendingApprovalPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  const checkStatus = async () => {
    setIsChecking(true);
    setCheckMessage(null);
    try {
      // Attempt login check or me check
      const res = await api.get('/users/me');
      const currentUser = res.data.user;
      if (currentUser?.status === 'approved') {
        if (currentUser.role === 'trainer') navigate('/trainer/dashboard');
        else if (currentUser.role === 'admin') navigate('/admin/dashboard');
        else navigate('/trainee/dashboard');
      } else {
        setCheckMessage('Your account is still pending administrator review.');
      }
    } catch {
      setCheckMessage('Account review is still in progress. Please check back shortly.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <Card className="border-amber-500/40 bg-gradient-to-b from-amber-950/20 via-slate-900 to-slate-900 shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <Clock className="h-8 w-8 animate-pulse" />
        </div>

        <h1 className="text-2xl font-black text-white">Registration Under Review</h1>
        <p className="mt-3 text-sm text-slate-300 leading-relaxed">
          {user?.email ? (
            <>
              Account: <span className="font-semibold text-amber-300">{user.email}</span>
            </>
          ) : (
            'Your account registration'
          )}{' '}
          is currently pending administrator review and approval.
        </p>

        {checkMessage && (
          <div className="mt-4 rounded-xl bg-amber-950/40 border border-amber-800/60 p-3 text-xs text-amber-300">
            {checkMessage}
          </div>
        )}

        <div className="mt-6 rounded-xl bg-slate-950/60 p-4 text-xs text-slate-400 border border-slate-800 text-left space-y-2">
          <div className="flex items-center gap-2 text-slate-300 font-semibold">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            Security &amp; Role Management Gate
          </div>
          <p>
            In accordance with Ministry of Earth Sciences governance, all trainee and trainer registrations are vetted before access to capacity building resources is granted.
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            id="check-approval-btn"
            variant="secondary"
            onClick={checkStatus}
            isLoading={isChecking}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Check Status Again
          </Button>

          <Link to="/login" className="w-full sm:w-auto">
            <Button variant="primary" className="w-full sm:w-auto">
              Return to Login
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
