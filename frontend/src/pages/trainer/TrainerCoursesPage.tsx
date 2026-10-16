import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { courseService, Course, CourseResource } from '../../services/courseService';
import {
  PlusCircle,
  Users,
  HelpCircle,
  FolderGit2,
  Globe,
  Archive,
  Trash2,
  Upload,
  FileText,
  Video,
  Presentation,
  FileCode,
  ExternalLink,
  X,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

export const TrainerCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Resource Management Modal state
  const [activeCourseForResources, setActiveCourseForResources] = useState<Course | null>(null);
  const [courseResources, setCourseResources] = useState<CourseResource[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceType, setResourceType] = useState<'pdf' | 'video' | 'ppt' | 'doc' | 'link'>('pdf');
  const [resourceLinkUrl, setResourceLinkUrl] = useState('');
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setIsLoading(true);
      const data = await courseService.getCourses({ trainer: 'me' });
      setCourses(data);
    } catch (err) {
      console.error('Failed to load trainer courses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePublish = async (courseId: string) => {
    try {
      await courseService.publishCourse(courseId);
      showToast('Course published successfully! Visible in public catalog.');
      loadCourses();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to publish course');
    }
  };

  const handleArchive = async (courseId: string) => {
    try {
      await courseService.archiveCourse(courseId);
      showToast('Course archived.');
      loadCourses();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to archive course');
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      const res = await courseService.deleteCourse(courseId);
      showToast(res.message);
      loadCourses();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete course');
    }
  };

  // Resource modal handlers
  const openResourceManager = async (course: Course) => {
    setActiveCourseForResources(course);
    setResourceTitle('');
    setResourceType('pdf');
    setResourceLinkUrl('');
    setResourceFile(null);
    try {
      setIsLoadingResources(true);
      const resList = await courseService.getResources(course.id);
      setCourseResources(resList);
    } catch (err) {
      console.error('Failed to load course resources:', err);
      setCourseResources([]);
    } finally {
      setIsLoadingResources(false);
    }
  };

  const handleUploadResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourseForResources) return;

    try {
      setIsUploading(true);
      if (resourceType === 'link') {
        if (!resourceLinkUrl) {
          showToast('Please provide a link URL');
          return;
        }
        await courseService.createLinkResource(activeCourseForResources.id, {
          title: resourceTitle,
          type: 'link',
          link_url: resourceLinkUrl,
        });
      } else {
        if (!resourceFile) {
          showToast('Please select a file to upload');
          return;
        }
        const formData = new FormData();
        formData.append('title', resourceTitle);
        formData.append('type', resourceType);
        formData.append('file', resourceFile);
        await courseService.uploadResource(activeCourseForResources.id, formData);
      }

      showToast('Resource uploaded successfully with secure signed access!');
      setResourceTitle('');
      setResourceFile(null);
      setResourceLinkUrl('');
      // Reload resources
      const resList = await courseService.getResources(activeCourseForResources.id);
      setCourseResources(resList);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to upload resource');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!activeCourseForResources) return;
    try {
      await courseService.deleteResource(activeCourseForResources.id, resourceId);
      showToast('Resource removed.');
      const resList = await courseService.getResources(activeCourseForResources.id);
      setCourseResources(resList);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete resource');
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Course Management & Authoring"
        description="Manage training modules, upload curriculum resources, configure question banks, and monitor enrolled participants."
        action={
          <Link to="/trainer/courses/new">
            <Button>
              <PlusCircle className="h-4 w-4" />
              New Course
            </Button>
          </Link>
        }
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-brand-500/20 border border-brand-500/40 text-brand-200 text-sm font-medium flex items-center justify-between">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-brand-400 hover:text-white">✕</button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading your courses...</div>
      ) : courses.length === 0 ? (
        <Card className="text-center py-16">
          <FolderGit2 className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No courses authored yet</h3>
          <p className="text-xs text-slate-400 mt-1">
            Create your first specialized capacity building course module.
          </p>
          <Link to="/trainer/courses/new" className="mt-4 inline-block">
            <Button>
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Author New Course
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {courses.map((c) => (
            <Card
              key={c.id}
              className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-slate-600 transition-all"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      c.status === 'published'
                        ? 'success'
                        : c.status === 'archived'
                        ? 'default'
                        : 'warning'
                    }
                  >
                    {c.status.toUpperCase()}
                  </Badge>
                  <Badge variant="default">{c.difficulty.toUpperCase()}</Badge>
                  {c.skill_name && (
                    <span className="text-xs text-brand-400 font-medium">
                      · {c.skill_name}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-white">{c.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">{c.description}</p>
                <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                  <span>
                    Enrolled: <strong className="text-white">{c.enrollment_count || 0} trainees</strong>
                  </span>
                  <span>
                    Rating: <strong className="text-amber-400">{c.avg_rating ? c.avg_rating.toFixed(1) : '4.8'} ★</strong>
                  </span>
                  <span>
                    Created: {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Publish / Archive Toggle */}
                {c.status === 'draft' ? (
                  <Button size="sm" variant="primary" onClick={() => handlePublish(c.id)}>
                    <Globe className="h-3.5 w-3.5 mr-1" />
                    Publish
                  </Button>
                ) : c.status === 'published' ? (
                  <Button size="sm" variant="secondary" onClick={() => handleArchive(c.id)}>
                    <Archive className="h-3.5 w-3.5 mr-1" />
                    Archive
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => handlePublish(c.id)}>
                    <Globe className="h-3.5 w-3.5 mr-1" />
                    Republish
                  </Button>
                )}

                <Link to={`/trainer/courses/${c.id}/trainees`}>
                  <Button size="sm" variant="secondary">
                    <Users className="h-3.5 w-3.5 mr-1" />
                    Trainees ({c.enrollment_count || 0})
                  </Button>
                </Link>

                <Link to={`/trainer/courses/${c.id}/questions`}>
                  <Button size="sm" variant="outline">
                    <HelpCircle className="h-3.5 w-3.5 mr-1" />
                    Question Bank
                  </Button>
                </Link>

                <Button size="sm" variant="outline" onClick={() => openResourceManager(c)}>
                  <FolderGit2 className="h-3.5 w-3.5 mr-1" />
                  Resources
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(c.id)}
                  className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Resource Management Modal */}
      {activeCourseForResources && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Course Resource Library</h3>
                <p className="text-xs text-slate-400 mt-0.5">{activeCourseForResources.title}</p>
              </div>
              <button
                onClick={() => setActiveCourseForResources(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Upload New Resource Form */}
            <form onSubmit={handleUploadResource} className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                Upload New Learning Material
              </h4>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Resource Title</label>
                <input
                  type="text"
                  required
                  value={resourceTitle}
                  onChange={(e) => setResourceTitle(e.target.value)}
                  placeholder="e.g. Module 1: WRF Governing Equations & Namelist Guide"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Resource Format</label>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value as any)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:border-brand-500 focus:outline-none"
                  >
                    <option value="pdf">PDF Document (.pdf)</option>
                    <option value="video">Video Lecture (.mp4, .webm)</option>
                    <option value="ppt">Slide Presentation (.ppt, .pptx)</option>
                    <option value="doc">Technical Document (.doc, .docx)</option>
                    <option value="link">External Documentation Link</option>
                  </select>
                </div>

                {resourceType === 'link' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">External URL</label>
                    <input
                      type="url"
                      required
                      value={resourceLinkUrl}
                      onChange={(e) => setResourceLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Select File (Max 25MB)</label>
                    <input
                      type="file"
                      required
                      onChange={(e) => setResourceFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-600"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" size="sm" disabled={isUploading}>
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  <span>{isUploading ? 'Uploading & Signing...' : 'Attach Resource'}</span>
                </Button>
              </div>
            </form>

            {/* Existing Resources List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Attached Resources ({courseResources.length})
              </h4>

              {isLoadingResources ? (
                <div className="text-center py-6 text-xs text-slate-500">Loading resources...</div>
              ) : courseResources.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No resources uploaded yet for this course.
                </div>
              ) : (
                <div className="space-y-2">
                  {courseResources.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-slate-800 rounded-lg">
                          {r.type === 'video' ? (
                            <Video className="h-4 w-4 text-blue-400" />
                          ) : r.type === 'ppt' ? (
                            <Presentation className="h-4 w-4 text-amber-400" />
                          ) : r.type === 'link' ? (
                            <ExternalLink className="h-4 w-4 text-indigo-400" />
                          ) : (
                            <FileText className="h-4 w-4 text-rose-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{r.title}</p>
                          <p className="text-[10px] text-slate-400 uppercase">
                            {r.type} · {new Date(r.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {r.signed_url && (
                          <a
                            href={r.signed_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Preview</span>
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteResource(r.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
