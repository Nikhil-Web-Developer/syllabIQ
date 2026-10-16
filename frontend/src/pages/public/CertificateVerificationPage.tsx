import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  ShieldCheck,
  Award,
  Calendar,
  User,
  BookOpen,
  Search,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ExternalLink,
} from 'lucide-react';
import { certificateService } from '../../services/certificateService';
import { CertificateVerification } from '../../types';

export const CertificateVerificationPage: React.FC = () => {
  const { code: routeCode } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const [inputCode, setInputCode] = useState(routeCode || '');

  useEffect(() => {
    if (routeCode) {
      setInputCode(routeCode);
    }
  }, [routeCode]);

  const {
    data: verification,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<CertificateVerification>({
    queryKey: ['verify-certificate', routeCode],
    queryFn: () => certificateService.verifyCertificate(routeCode!),
    enabled: Boolean(routeCode),
    retry: false,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      navigate(`/verify/${inputCode.trim()}`);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-6 animate-fade-in">
      <div className="text-center space-y-3">
        <div className="inline-flex p-3 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 mb-2">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-black text-white">Official Credential Verification</h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Verify authentic certificates, course completion credentials, and digital qualifications issued by the Ministry of Earth Sciences (MoES).
        </p>
      </div>

      {/* Code Input Form */}
      <form onSubmit={handleSearch} className="max-w-xl mx-auto">
        <div className="flex gap-2 bg-slate-900/90 p-2 rounded-2xl border border-slate-800 shadow-2xl">
          <input
            type="text"
            placeholder="Enter Certificate Verification Code (e.g. CERT-MOES-2026-ABCD1234)..."
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            className="flex-1 bg-transparent text-xs sm:text-sm text-white px-3 py-2 focus:outline-none font-mono"
          />
          <Button type="submit" size="sm" className="shadow-md shadow-brand-500/20">
            <Search className="h-4 w-4 mr-1" />
            Verify
          </Button>
        </div>
      </form>

      {/* Verification Result */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-500 text-sm animate-pulse">
          Validating cryptographic credential with MoES registry...
        </div>
      ) : routeCode && isError ? (
        <Card className="max-w-xl mx-auto border-rose-500/30 bg-rose-950/20 text-center p-8 space-y-3">
          <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Credential Verification Failed</h3>
          <p className="text-xs text-rose-300">
            No certificate matching code <strong className="font-mono">{routeCode}</strong> was found in the official registry.
          </p>
        </Card>
      ) : verification && verification.valid ? (
        <Card className="max-w-2xl mx-auto border-emerald-500/40 bg-gradient-to-b from-slate-900/95 to-slate-900/80 shadow-2xl p-8 space-y-6 relative overflow-hidden">
          {/* Official Verification Watermark/Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  Official Verified Credential
                </span>
                <span className="text-[11px] text-slate-400">
                  Registered in Ministry of Earth Sciences Digital Archive
                </span>
              </div>
            </div>
            <Badge variant="success">Verified Authentic</Badge>
          </div>

          {/* Certificate Title & Recipient */}
          <div className="space-y-4 text-center py-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 p-6">
            <h2 className="text-xl sm:text-2xl font-black text-white">{verification.title}</h2>
            <p className="text-xs text-slate-400">Awarded to</p>
            <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-cyan-300">
              {verification.trainee_name}
            </p>
            <p className="text-xs text-slate-400">for successful completion of training in</p>
            <p className="text-sm font-semibold text-white">{verification.course_title}</p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Issuing Organization</span>
              <strong className="text-white block mt-0.5">{verification.issuing_body}</strong>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Issue Date</span>
              <strong className="text-white block mt-0.5">
                {new Date(verification.issue_date).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </strong>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 sm:col-span-2">
              <span className="text-slate-500 block text-[11px]">Verification Code</span>
              <strong className="text-brand-400 font-mono block mt-0.5">
                {verification.verification_code}
              </strong>
            </div>
          </div>

          {/* Footer with QR linkage */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-mono text-[10px]">
              <QrCode className="h-4 w-4 text-slate-400" />
              Verified at: {new Date(verification.verified_at).toISOString()}
            </span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Tamper-Proof Record
            </span>
          </div>
        </Card>
      ) : null}
    </div>
  );
};
