import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  User,
  GraduationCap,
  Award,
  Sparkles,
  BookOpen,
  Calendar,
  Briefcase,
  ChevronLeft,
} from 'lucide-react';
import api from '../../services/api';
import { BadgeShowcase } from '../../components/ui/BadgeShowcase';

export const PublicProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['public-user-profile', userId],
    queryFn: async () => {
      const res = await api.get(`/users/${userId}/profile`);
      return res.data;
    },
    enabled: Boolean(userId),
  });

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-500 text-sm animate-pulse">
        Loading public researcher profile...
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <Card className="max-w-xl mx-auto text-center p-8 space-y-4">
        <h3 className="text-lg font-bold text-white">Profile Not Found</h3>
        <p className="text-xs text-slate-400">The requested user profile does not exist or is private.</p>
        <Link to="/catalog">
          <Button variant="secondary" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Catalog
          </Button>
        </Link>
      </Card>
    );
  }

  const user = profile.user || profile;
  const skills = profile.skills || [];
  const badges = profile.badges || [];
  const qualifications = profile.profile?.qualifications || [];
  const experience = profile.profile?.workExperience || profile.profile?.work_experience || [];

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-6 animate-fade-in">
      <Link to="/" className="inline-flex items-center text-xs text-slate-400 hover:text-white transition-colors">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Platform Homepage
      </Link>

      {/* Header Profile Card */}
      <Card className="p-8 bg-gradient-to-r from-slate-900 via-brand-950/30 to-slate-900 border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-2xl shrink-0">
            {user.name ? user.name.slice(0, 2).toUpperCase() : 'SC'}
          </div>

          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black text-white">{user.name}</h1>
              <Badge variant={user.role === 'trainer' ? 'purple' : 'success'}>
                {user.role ? user.role.toUpperCase() : 'RESEARCHER'}
              </Badge>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {profile.profile?.bio || 'Ministry of Earth Sciences Scientific Personnel'}
            </p>
            <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Member since {new Date(user.createdAt || user.created_at || Date.now()).getFullYear()}
              </span>
              {profile.profile?.yearsExperience && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {profile.profile.yearsExperience} Years Experience
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Skills Matrix */}
      {skills.length > 0 && (
        <Card className="space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-400" />
            Verified Scientific Competencies &amp; Skills
          </h3>
          <div className="flex flex-wrap gap-2.5 pt-2">
            {skills.map((skill: any) => (
              <div
                key={skill.id}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-2"
              >
                <span className="font-semibold text-white">{skill.name || skill.skill_name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-400 border border-brand-500/20 capitalize">
                  {skill.proficiencyLevel || skill.proficiency_level || 'Intermediate'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Badges Showcase */}
      {badges.length > 0 && (
        <BadgeShowcase
          userBadges={badges}
          title="Earned Capacity Badges &amp; Distinctions"
          subtitle="Government-verified training credentials and academic excellence awards."
        />
      )}
    </div>
  );
};
