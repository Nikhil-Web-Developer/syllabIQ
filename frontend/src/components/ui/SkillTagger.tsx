import React, { useState, useEffect } from 'react';
import { Badge } from './Badge';
import { Button } from './Button';
import { Skill, UserSkill, ProficiencyLevel, SkillSource } from '../../types';
import { profileService } from '../../services/profileService';
import {
  Sparkles,
  Plus,
  X,
  Search,
  Check,
  Award,
  Layers,
  Zap,
  Flame,
  Crown,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface SkillTaggerProps {
  userSkills: UserSkill[];
  onSkillsChange: (newSkills: UserSkill[]) => void;
  title?: string;
  subtitle?: string;
  readOnly?: boolean;
}

export const SkillTagger: React.FC<SkillTaggerProps> = ({
  userSkills,
  onSkillsChange,
  title = 'Competency & Skill Taxonomy',
  subtitle = 'Tag your competencies from the standardized taxonomy. This data directly powers course recommendations and matching.',
  readOnly = false,
}) => {
  const [taxonomy, setTaxonomy] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [selectedProficiency, setSelectedProficiency] = useState<ProficiencyLevel>('intermediate');
  const [selectedSource, setSelectedSource] = useState<SkillSource>('self_declared');
  const [isAdding, setIsAdding] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTaxonomy();
  }, []);

  const fetchTaxonomy = async () => {
    try {
      setLoading(true);
      const data = await profileService.getSkills();
      setTaxonomy(data);
    } catch (err: any) {
      console.error('Failed to load skill taxonomy', err);
      setError('Unable to load skills taxonomy. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', 'Domain', 'Technical', 'Management', 'Soft Skill'];

  const filteredTaxonomy = taxonomy.filter((skill) => {
    const matchesCat =
      selectedCategory === 'All' ||
      skill.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Untagged skills available for selection
  const availableSkills = filteredTaxonomy.filter(
    (skill) => !userSkills.some((us) => us.skillId === skill.id),
  );

  const handleTagSkill = async () => {
    if (!selectedSkillId) return;

    try {
      setActionLoading(true);
      setError(null);
      const res = await profileService.tagSkill(
        selectedSkillId,
        selectedProficiency,
        selectedSource,
      );

      // Look up skill metadata from taxonomy
      const skillMeta = taxonomy.find((s) => s.id === selectedSkillId);

      const newTagged: UserSkill = {
        id: res.id,
        skillId: selectedSkillId,
        name: skillMeta ? skillMeta.name : res.name || 'Skill',
        category: skillMeta ? skillMeta.category : res.category || 'General',
        proficiencyLevel: selectedProficiency,
        source: selectedSource,
      };

      const updated = [
        ...userSkills.filter((us) => us.skillId !== selectedSkillId),
        newTagged,
      ];
      onSkillsChange(updated);
      setSelectedSkillId('');
      setIsAdding(false);
    } catch (err: any) {
      console.error('Failed to tag skill', err);
      setError(err.response?.data?.message || 'Failed to tag skill. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    if (readOnly) return;
    try {
      setActionLoading(true);
      setError(null);
      await profileService.removeSkill(skillId);
      const updated = userSkills.filter((us) => us.skillId !== skillId);
      onSkillsChange(updated);
    } catch (err: any) {
      console.error('Failed to remove skill', err);
      setError(err.response?.data?.message || 'Failed to remove skill.');
    } finally {
      setActionLoading(false);
    }
  };

  const getProficiencyBadge = (level: ProficiencyLevel) => {
    switch (level) {
      case 'expert':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Crown className="h-3 w-3 text-amber-400" />
            Expert
          </span>
        );
      case 'advanced':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <Flame className="h-3 w-3 text-emerald-400" />
            Advanced
          </span>
        );
      case 'intermediate':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            <Zap className="h-3 w-3 text-cyan-400" />
            Intermediate
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-300 border border-slate-500/30">
            <Layers className="h-3 w-3 text-slate-400" />
            Beginner
          </span>
        );
    }
  };

  const getCategoryBadgeVariant = (category: string) => {
    switch (category.toLowerCase()) {
      case 'domain':
        return 'purple';
      case 'technical':
        return 'info';
      case 'management':
        return 'warning';
      case 'soft skill':
        return 'default';
      default:
        return 'info';
    }
  };

  return (
    <div className="space-y-5 rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-wide">{title}</h3>
            <span className="ml-2 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
              {userSkills.length} Tagged
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>

        {!readOnly && (
          <Button
            type="button"
            size="sm"
            variant={isAdding ? 'secondary' : 'primary'}
            onClick={() => setIsAdding(!isAdding)}
            className="shrink-0"
          >
            {isAdding ? (
              <>
                <X className="h-3.5 w-3.5" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Tag New Skill
              </>
            )}
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-xl">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Add New Skill Form Panel */}
      {isAdding && !readOnly && (
        <div className="p-5 rounded-xl bg-slate-800/90 border border-brand-500/30 shadow-inner space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-brand-300 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5" />
              Select Skill from Controlled Taxonomy
            </h4>
            <span className="text-[11px] text-slate-400">
              {availableSkills.length} skills available
            </span>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3 py-1 rounded-lg transition-all font-medium ${
                  selectedCategory === cat
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                    : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search + Skill Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search skills (e.g. Weather, Radar, Python)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <select
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500 transition-colors"
            >
              <option value="">-- Choose a skill to tag --</option>
              {availableSkills.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.category}] {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Proficiency Level Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Proficiency Level
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'beginner', label: 'Beginner', desc: 'Working knowledge' },
                  { id: 'intermediate', label: 'Intermediate', desc: 'Applied practice' },
                  { id: 'advanced', label: 'Advanced', desc: 'Deep technical proficiency' },
                  { id: 'expert', label: 'Expert', desc: 'Subject matter authority' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProficiency(p.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedProficiency === p.id
                      ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500'
                      : 'border-slate-700 bg-slate-900/60 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white capitalize">{p.label}</span>
                    {selectedProficiency === p.id && (
                      <Check className="h-3.5 w-3.5 text-brand-400" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Source Picker & Submit Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Declaration Source:</span>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value as SkillSource)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
              >
                <option value="self_declared">Self Declared</option>
                <option value="certified">Certified (Upload Proof)</option>
                <option value="assessed">Assessed via LMS</option>
              </select>
            </div>

            <Button
              type="button"
              size="sm"
              disabled={!selectedSkillId || actionLoading}
              onClick={handleTagSkill}
              className="shadow-lg shadow-brand-500/20"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Tagging...
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Confirm & Tag Skill
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Currently Tagged Skills List */}
      {userSkills.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
          <Layers className="h-8 w-8 text-slate-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-300">No skills tagged yet</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {readOnly
              ? 'This user has not listed any skills.'
              : 'Click "Tag New Skill" to select competencies from the MoES taxonomy.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {userSkills.map((us) => (
            <div
              key={us.skillId || us.id}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-colors group"
            >
              <div className="space-y-1.5 pr-2">
                <div className="flex items-center gap-2">
                  <Badge variant={getCategoryBadgeVariant(us.category) as any} size="sm">
                    {us.category}
                  </Badge>
                  <span className="text-xs text-slate-400 capitalize">
                    {us.source?.replace('_', ' ')}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white group-hover:text-brand-300 transition-colors">
                  {us.name}
                </h4>
                <div>{getProficiencyBadge(us.proficiencyLevel)}</div>
              </div>

              {!readOnly && (
                <button
                  type="button"
                  title="Remove skill"
                  onClick={() => handleRemoveSkill(us.skillId || us.id)}
                  disabled={actionLoading}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-900/50 transition-all shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
