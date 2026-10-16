import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SkillTagger } from '../../components/ui/SkillTagger';
import { useAuthStore } from '../../store/authStore';
import { profileService, TrainerProfileResponse } from '../../services/profileService';
import { UserSkill } from '../../types';
import {
  User,
  GraduationCap,
  Sparkles,
  Save,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Compass,
  Cpu,
} from 'lucide-react';

export const TrainerProfilePage: React.FC = () => {
  const { user: authUser, setUser } = useAuthStore();
  const [profileData, setProfileData] = useState<TrainerProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [yearsExperience, setYearsExperience] = useState<number>(0);
  const [qualifications, setQualifications] = useState<
    Array<{ degree: string; institution: string; year?: string | number }>
  >([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await profileService.getTrainerProfile();
      setProfileData(data);
      setName(data.user.name || '');
      setBio(data.profile?.bio || '');
      setYearsExperience(data.profile?.yearsExperience || (data.profile as any)?.years_experience || 0);
      setQualifications(data.profile?.qualifications || []);
      setUserSkills(data.skills || []);
    } catch (err: any) {
      console.error('Failed to load trainer profile', err);
      setError(err.response?.data?.message || 'Failed to load trainer profile.');
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

      const res = await profileService.updateTrainerProfile({
        name,
        bio,
        years_experience: Number(yearsExperience),
        qualifications,
      });

      setProfileData(res);
      if (authUser) {
        setUser({ ...authUser, name: res.user.name });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to save trainer profile', err);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
        <p className="text-sm text-slate-400">Loading Trainer profile &amp; competencies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl pb-12">
      <PageHeader
        title="Trainer Profile &amp; Competency Tags"
        description="Your subject-matter expertise tags directly feed into the Ministry's automated competency-matching engine for course assignments."
        badge={<Badge variant="info">Faculty Profile</Badge>}
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
          <span>Faculty profile updated successfully!</span>
        </div>
      )}

      {/* Competency Matching Engine Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-slate-900 border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-cyan-950/20">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Algorithmic Course-Trainer Matching Active
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold">
                v1.0 Weighted Engine
              </span>
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              When courses are published under specific taxonomy tags, administrators receive a ranked list of faculty based on your tagged proficiency level (50%), years of experience (20%), and past course ratings (20%).
            </p>
          </div>
        </div>
        <Badge variant="purple" className="shrink-0">
          MoES Automated Matching
        </Badge>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-8">
        {/* Trainer Overview Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 text-center space-y-4">
            <div className="mx-auto w-24 h-24 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-500 text-white flex items-center justify-center text-3xl font-black shadow-xl shadow-cyan-500/20 border border-cyan-400/30">
              {profileData?.user.name.charAt(0) || 'F'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{profileData?.user.name}</h2>
              <p className="text-xs text-slate-400">{profileData?.user.email}</p>
            </div>
            <div className="pt-2 border-t border-slate-700/60 flex flex-wrap justify-center gap-1.5">
              <Badge variant="info">{yearsExperience} Yrs Experience</Badge>
              <Badge variant="purple">Faculty Member</Badge>
            </div>
          </Card>

          <Card className="md:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4 text-cyan-400" />
              Faculty Bio &amp; Experience
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="e.g. Prof. Ananya Sen"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                Years of Professional / Academic Experience
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(parseInt(e.target.value, 10) || 0)}
                className="w-full sm:w-48 px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Faculty Biography &amp; Research Focus
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors leading-relaxed"
                placeholder="Describe your subject-matter leadership, teaching experience, and specialized research areas in Earth and Ocean sciences..."
              />
            </div>
          </Card>
        </div>

        {/* Reusable Skill Tagger Component (Identical Component!) */}
        <SkillTagger
          userSkills={userSkills}
          onSkillsChange={(newSkills) => setUserSkills(newSkills)}
          title="Trainer Competency Taxonomy (Feeds Matching Engine)"
          subtitle="Tag your competencies from the standardized taxonomy. These tags are indexed by the administrative course-matching engine."
        />

        {/* Academic Qualifications Section */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Qualifications &amp; Degrees</h3>
                <p className="text-xs text-slate-400">Academic credentials and doctoral research background</p>
              </div>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addQualification}>
              <Plus className="h-3.5 w-3.5" />
              Add Degree
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
                      placeholder="Degree (e.g. Ph.D. Physical Oceanography)"
                      value={q.degree}
                      onChange={(e) => updateQualification(idx, 'degree', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Institution / University (e.g. Goa University)"
                      value={q.institution}
                      onChange={(e) => updateQualification(idx, 'institution', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <input
                      type="text"
                      placeholder="Year"
                      value={q.year || ''}
                      onChange={(e) => updateQualification(idx, 'year', e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
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

        {/* Submit Bar */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            size="lg"
            disabled={saving}
            className="shadow-xl shadow-cyan-500/25 px-8"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Faculty Profile...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Profile &amp; Competencies
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
