import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SkillTagger } from '../../components/ui/SkillTagger';
import { useAuthStore } from '../../store/authStore';
import { profileService, TraineeProfileResponse } from '../../services/profileService';
import { UserSkill } from '../../types';
import {
  User,
  GraduationCap,
  Briefcase,
  Award,
  Sparkles,
  Save,
  Plus,
  Trash2,
  Upload,
  Calendar,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react';

export const TraineeProfilePage: React.FC = () => {
  const { user: authUser, setUser } = useAuthStore();
  const [profileData, setProfileData] = useState<TraineeProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterestInput, setNewInterestInput] = useState('');
  const [qualifications, setQualifications] = useState<
    Array<{ degree: string; institution: string; year?: string | number }>
  >([]);
  const [workExperience, setWorkExperience] = useState<
    Array<{ role: string; organization: string; duration?: string; description?: string }>
  >([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);

  // Certificate Upload State
  const [showCertModal, setShowCertModal] = useState(false);
  const [certTitle, setCertTitle] = useState('');
  const [certIssuingBody, setCertIssuingBody] = useState('');
  const [certIssueDate, setCertIssueDate] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certUploading, setCertUploading] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await profileService.getTraineeProfile();
      setProfileData(data);
      setName(data.user.name || '');
      setBio(data.profile?.bio || '');
      setInterests(data.profile?.interests || []);
      setQualifications(data.profile?.qualifications || []);
      setWorkExperience(data.profile?.workExperience || (data.profile as any)?.work_experience || []);
      setUserSkills(data.skills || []);
    } catch (err: any) {
      console.error('Failed to load profile', err);
      setError(err.response?.data?.message || 'Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      const res = await profileService.updateTraineeProfile({
        name,
        bio,
        interests,
        qualifications,
        work_experience: workExperience,
      });

      setProfileData(res);
      if (authUser) {
        setUser({ ...authUser, name: res.user.name });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to save profile', err);
      setError(err.response?.data?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  // Qualifications Helpers
  const addQualification = () => {
    setQualifications([
      ...qualifications,
      { degree: '', institution: '', year: new Date().getFullYear() },
    ]);
  };

  const updateQualification = (index: number, field: string, value: any) => {
    const updated = [...qualifications];
    updated[index] = { ...updated[index], [field]: value };
    setQualifications(updated);
  };

  const removeQualification = (index: number) => {
    setQualifications(qualifications.filter((_, i) => i !== index));
  };

  // Work Experience Helpers
  const addWorkExperience = () => {
    setWorkExperience([
      ...workExperience,
      { role: '', organization: '', duration: '', description: '' },
    ]);
  };

  const updateWorkExperience = (index: number, field: string, value: any) => {
    const updated = [...workExperience];
    updated[index] = { ...updated[index], [field]: value };
    setWorkExperience(updated);
  };

  const removeWorkExperience = (index: number) => {
    setWorkExperience(workExperience.filter((_, i) => i !== index));
  };

  // Interests Helpers
  const handleAddInterest = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!newInterestInput.trim()) return;
    if (!interests.includes(newInterestInput.trim())) {
      setInterests([...interests, newInterestInput.trim()]);
    }
    setNewInterestInput('');
  };

  const removeInterest = (item: string) => {
    setInterests(interests.filter((i) => i !== item));
  };

  // Certificate Upload
  const handleCertificateUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certFile || !certTitle || !certIssuingBody || !certIssueDate) {
      setCertError('Please provide all certificate details and select a file.');
      return;
    }

    try {
      setCertUploading(true);
      setCertError(null);

      const res = await profileService.uploadCertificate(
        certFile,
        certTitle,
        certIssuingBody,
        certIssueDate,
      );

      // Refresh profile certificates
      if (profileData) {
        setProfileData({
          ...profileData,
          certificates: [res.certificate, ...(profileData.certificates || [])],
        });
      }

      setCertTitle('');
      setCertIssuingBody('');
      setCertIssueDate('');
      setCertFile(null);
      setShowCertModal(false);
    } catch (err: any) {
      console.error('Certificate upload failed', err);
      setCertError(err.response?.data?.message || 'Certificate upload failed.');
    } finally {
      setCertUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
        <p className="text-sm text-slate-400">Loading Trainee profile &amp; competencies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl pb-12">
      <PageHeader
        title="My Trainee Profile &amp; Skills"
        description="Manage your qualifications, work experience, research interests, and tagged competencies."
        badge={<Badge variant="success">MoES Trainee</Badge>}
      />

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-sm animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>Profile information updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-8">
        {/* User Identity & Bio Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 text-center space-y-4">
            <div className="mx-auto w-24 h-24 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-cyan-400 text-white flex items-center justify-center text-3xl font-black shadow-xl shadow-brand-500/20 border border-brand-400/30">
              {profileData?.user.name.charAt(0) || 'T'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{profileData?.user.name}</h2>
              <p className="text-xs text-slate-400">{profileData?.user.email}</p>
            </div>
            <div className="pt-2 border-t border-slate-700/60 flex flex-wrap justify-center gap-1.5">
              <Badge variant="success">{profileData?.user.status?.toUpperCase() || 'APPROVED'}</Badge>
              <Badge variant="info">MOES TRAINEE</Badge>
            </div>
          </Card>

          <Card className="md:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4 text-brand-400" />
              Personal &amp; Scientific Bio
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                placeholder="e.g. Dr. Rajesh Sharma"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Professional &amp; Research Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500 transition-colors leading-relaxed"
                placeholder="Describe your research background, technical specialization, and capacity building goals..."
              />
            </div>
          </Card>
        </div>

        {/* Reusable Skill Tagger Component */}
        <SkillTagger
          userSkills={userSkills}
          onSkillsChange={(newSkills) => setUserSkills(newSkills)}
          title="Trainee Competency Taxonomy"
          subtitle="Tag your competencies to help match with relevant advanced courses and assessments."
        />

        {/* Qualifications Section */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Academic Qualifications</h3>
                <p className="text-xs text-slate-400">Degrees, diplomas, and specialized training programs</p>
              </div>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addQualification}>
              <Plus className="h-3.5 w-3.5" />
              Add Qualification
            </Button>
          </div>

          {qualifications.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">No qualifications listed yet.</p>
          ) : (
            <div className="space-y-3">
              {qualifications.map((q, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-slate-900/70 border border-slate-800 rounded-xl items-center"
                >
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Degree / Diploma (e.g. M.Sc. Meteorology)"
                      value={q.degree}
                      onChange={(e) => updateQualification(idx, 'degree', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Institution / University (e.g. IIT Delhi)"
                      value={q.institution}
                      onChange={(e) => updateQualification(idx, 'institution', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <input
                      type="text"
                      placeholder="Year"
                      value={q.year || ''}
                      onChange={(e) => updateQualification(idx, 'year', e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeQualification(idx)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Work Experience Section */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Work &amp; Research Experience</h3>
                <p className="text-xs text-slate-400">Scientific appointments, field missions, and organizational roles</p>
              </div>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addWorkExperience}>
              <Plus className="h-3.5 w-3.5" />
              Add Experience
            </Button>
          </div>

          {workExperience.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">No work experience listed yet.</p>
          ) : (
            <div className="space-y-3">
              {workExperience.map((exp, idx) => (
                <div
                  key={idx}
                  className="space-y-2 p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        placeholder="Position / Title (e.g. Senior Research Fellow)"
                        value={exp.role}
                        onChange={(e) => updateWorkExperience(idx, 'role', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        placeholder="Organization (e.g. INCOIS Hyderabad)"
                        value={exp.organization}
                        onChange={(e) => updateWorkExperience(idx, 'organization', e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Duration (e.g. 2022-2024)"
                        value={exp.duration || ''}
                        onChange={(e) => updateWorkExperience(idx, 'duration', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeWorkExperience(idx)}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Interests Section */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Scientific Interests &amp; Domains</h3>
              <p className="text-xs text-slate-400">Topic areas you want to explore or deepen expertise in</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add interest (e.g. Tropical Cyclones, AI Weather Forecasting)..."
              value={newInterestInput}
              onChange={(e) => setNewInterestInput(e.target.value)}
              onKeyDown={handleAddInterest}
              className="flex-1 px-3.5 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
            />
            <Button type="button" size="sm" variant="outline" onClick={handleAddInterest}>
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {interests.map((interest) => (
              <span
                key={interest}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700"
              >
                {interest}
                <button
                  type="button"
                  onClick={() => removeInterest(interest)}
                  className="text-slate-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </Card>

        {/* Save Changes Button Bar */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            size="lg"
            disabled={saving}
            className="shadow-xl shadow-brand-500/25 px-8"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Profile Changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Profile Changes
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Certificates & Credentials Section */}
      <Card className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Certificates &amp; Credentials</h3>
              <p className="text-xs text-slate-400">
                Uploaded certificate files stored securely with cryptographic signed download URLs
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => setShowCertModal(true)}
            className="shrink-0"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Certificate
          </Button>
        </div>

        {profileData?.certificates && profileData.certificates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profileData.certificates.map((cert) => (
              <div
                key={cert.id}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="purple" size="sm">
                      Verifiable
                    </Badge>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {cert.issueDate || (cert as any).issue_date}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{cert.title}</h4>
                  <p className="text-xs text-slate-400">
                    Issued by: <span className="text-slate-300 font-medium">{cert.issuingBody || (cert as any).issuing_body}</span>
                  </p>
                </div>

                {cert.signed_url && (
                  <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                    <a
                      href={cert.signed_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Certificate (Signed URL)
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            <Award className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-300">No certificates uploaded yet</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Upload external certifications or certificates earned through MoES programs.
            </p>
          </div>
        )}
      </Card>

      {/* Upload Certificate Modal */}
      {showCertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="h-4 w-4 text-brand-400" />
                Upload Certificate
              </h3>
              <button
                type="button"
                onClick={() => setShowCertModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {certError && (
              <div className="p-3 text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-xl">
                {certError}
              </div>
            )}

            <form onSubmit={handleCertificateUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Certificate Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Certified Numerical Weather Model Specialist"
                  value={certTitle}
                  onChange={(e) => setCertTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Issuing Organization / Body
                </label>
                <input
                  type="text"
                  placeholder="e.g. India Meteorological Department (IMD)"
                  value={certIssuingBody}
                  onChange={(e) => setCertIssuingBody(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={certIssueDate}
                  onChange={(e) => setCertIssueDate(e.target.value)}
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
                  onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-500 file:text-white hover:file:bg-brand-600"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCertModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={certUploading}>
                  {certUploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Upload
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
