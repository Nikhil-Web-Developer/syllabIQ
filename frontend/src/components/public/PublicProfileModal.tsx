import React, { useState, useEffect } from 'react';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { SkillTagger } from '../ui/SkillTagger';
import { profileService, PublicProfileResponse } from '../../services/profileService';
import {
  User,
  GraduationCap,
  Briefcase,
  Award,
  Calendar,
  X,
  Loader2,
  AlertCircle,
  Tag,
} from 'lucide-react';

interface PublicProfileModalProps {
  userId: string | null;
  onClose: () => void;
}

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({
  userId,
  onClose,
}) => {
  const [profileData, setProfileData] = useState<PublicProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadPublicProfile(userId);
    }
  }, [userId]);

  const loadPublicProfile = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await profileService.getPublicProfile(id);
      setProfileData(data);
    } catch (err: any) {
      console.error('Failed to load public profile', err);
      setError('Unable to load public profile details.');
    } finally {
      setLoading(false);
    }
  };

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-500 to-cyan-400 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-brand-500/20">
              {profileData?.user.name.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{profileData?.user.name || 'User Profile'}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={profileData?.user.role === 'trainer' ? 'info' : 'success'} size="sm">
                  {profileData?.user.role?.toUpperCase() || 'MEMBER'}
                </Badge>
                {profileData?.user.joinedAt && (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Member since {new Date(profileData.user.joinedAt).getFullYear()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
            <p className="text-xs text-slate-400">Loading public profile information...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-950/40 border border-red-800 text-red-300 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Bio */}
            {profileData?.profile?.bio && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Biography &amp; Background
                </h3>
                <p className="text-xs text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800 leading-relaxed">
                  {profileData.profile.bio}
                </p>
              </div>
            )}

            {/* Trainer Experience Metric if trainer */}
            {profileData?.user.role === 'trainer' && (profileData.profile as any)?.years_experience !== undefined && (
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Teaching &amp; Field Experience</span>
                <span className="text-sm font-bold text-cyan-400">
                  {(profileData.profile as any).years_experience} Years
                </span>
              </div>
            )}

            {/* Read-only Competency Tags */}
            <SkillTagger
              userSkills={profileData?.skills || []}
              onSkillsChange={() => {}}
              readOnly={true}
              title="Verified Competencies &amp; Skills"
              subtitle="Subject-matter areas tagged within the Ministry of Earth Sciences taxonomy."
            />

            {/* Academic Qualifications */}
            {profileData?.profile?.qualifications && profileData.profile.qualifications.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-blue-400" />
                  Academic Qualifications
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {profileData.profile.qualifications.map((q: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <h4 className="text-xs font-bold text-white">{q.degree}</h4>
                      <p className="text-[11px] text-slate-400">
                        {q.institution} {q.year && `(${q.year})`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interests if Trainee */}
            {profileData?.user.role === 'trainee' && (profileData.profile as any)?.interests?.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-amber-400" />
                  Research Interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(profileData.profile as any).interests.map((interest: string, idx: number) => (
                    <Badge key={idx} variant="default">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Certificates */}
            {profileData?.certificates && profileData.certificates.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-purple-400" />
                  Verifiable Credentials
                </h3>
                <div className="space-y-2">
                  {profileData.certificates.map((cert: any) => (
                    <div
                      key={cert.id}
                      className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-white">{cert.title}</h4>
                        <p className="text-[11px] text-slate-400">Issued by: {cert.issuing_body || cert.issuingBody}</p>
                      </div>
                      <Badge variant="purple" size="sm">
                        Verified
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
