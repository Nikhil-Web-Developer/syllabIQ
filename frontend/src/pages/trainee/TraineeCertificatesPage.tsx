import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { profileService } from '../../services/profileService';
import { Certificate } from '../../types';
import {
  Award,
  Download,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Upload,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Building,
} from 'lucide-react';

export const TraineeCertificatesPage: React.FC = () => {
  const [certificates, setCertificates] = useState<(Certificate & { signed_url?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload modal state
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [issuingBody, setIssuingBody] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await profileService.getCertificates();
      setCertificates(data);
    } catch (err: any) {
      console.error('Failed to load certificates', err);
      setError('Unable to load certificates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !issuingBody || !issueDate) {
      setUploadError('Please fill out all fields and select a valid file.');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      const res = await profileService.uploadCertificate(file, title, issuingBody, issueDate);
      setCertificates([res.certificate, ...certificates]);
      setTitle('');
      setIssuingBody('');
      setIssueDate('');
      setFile(null);
      setShowModal(false);
    } catch (err: any) {
      console.error('Upload failed', err);
      setUploadError(err.response?.data?.message || 'Failed to upload certificate.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl pb-12">
      <PageHeader
        title="My Issued &amp; Uploaded Certificates"
        description="Verifiable digital credentials awarded upon passing course assessments or uploaded as external certifications."
        badge={<Badge variant="purple">Verifiable Credentials</Badge>}
      />

      {/* Security & Signed URL info card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-brand-950/20 to-slate-900 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Cryptographically Signed Object Storage</h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Certificates are stored in private storage containers and accessed via HMAC-signed, time-limited download links for maximum data integrity.
            </p>
          </div>
        </div>
        <Button onClick={() => setShowModal(true)} className="shrink-0 shadow-lg shadow-brand-500/20">
          <Upload className="h-3.5 w-3.5" />
          Upload Certificate
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
          <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
          <p className="text-sm text-slate-400">Loading certificate repository...</p>
        </div>
      ) : certificates.length === 0 ? (
        <div className="text-center py-16 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
          <Award className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Certificates Recorded</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            You have not earned or uploaded any certificates yet. Complete an enrolled course assessment or upload an external credential.
          </p>
          <Button size="sm" onClick={() => setShowModal(true)} className="mt-4">
            <Upload className="h-3.5 w-3.5" />
            Upload Your First Certificate
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {certificates.map((cert) => (
            <Card
              key={cert.id}
              className="border-purple-500/30 bg-gradient-to-r from-slate-900 via-purple-950/15 to-slate-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-purple-500/50 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-2xl shrink-0">
                  <Award className="h-8 w-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="success" size="sm">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified Credential
                    </Badge>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {cert.issueDate || (cert as any).issue_date}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">{cert.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-slate-500" />
                    Issued by: <span className="text-slate-300 font-medium">{cert.issuingBody || (cert as any).issuing_body}</span>
                  </p>
                  {(cert.verificationCode || cert.verification_code) && (
                    <p className="text-[11px] font-mono text-brand-400 mt-1.5 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      Code: {cert.verificationCode || cert.verification_code}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex sm:flex-col gap-2 shrink-0">
                <a
                  href={`/verify/${cert.verificationCode || cert.verification_code || cert.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-brand-400" />
                  Verify Online
                </a>
                {cert.signed_url ? (
                  <a
                    href={cert.signed_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-brand-500 text-white hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download / View PDF
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-500 italic text-center">Digital Verifiable Only</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Certificate Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="h-4 w-4 text-brand-400" />
                Upload Certificate Document
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {uploadError && (
              <div className="p-3 text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-xl">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Certificate Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Certificate of Competency in Doppler Weather Radar"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Issuing Organization / Authority
                </label>
                <input
                  type="text"
                  placeholder="e.g. India Meteorological Department (IMD)"
                  value={issuingBody}
                  onChange={(e) => setIssuingBody(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Date of Issuance
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Certificate File (PDF or Image, max 5MB)
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-500 file:text-white hover:file:bg-brand-600"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Uploading File...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Save &amp; Upload
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
