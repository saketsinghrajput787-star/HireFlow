import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import {
  uploadStudentResume,
  getResumeDownloadUrl,
  deleteStudentResumeFile,
} from '../../services/storage';
import { CandidateProfile, EducationItem, ExperienceItem } from '../../types';
import { SkillsInput } from '../../components/SkillsInput';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Alert } from '../../components/Alert';
import {
  User,
  GraduationCap,
  Briefcase,
  FileText,
  Upload,
  Download,
  Trash2,
  Plus,
  Save,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  Loader2,
} from 'lucide-react';

export const StudentProfilePage: React.FC = () => {
  const { profile: authUser, session, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Resume state
  const [uploadingResume, setUploadingResume] = useState<boolean>(false);
  const [downloadingResume, setDownloadingResume] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredRole, setPreferredRole] = useState('');
  const [preferredLocation, setPreferredLocation] = useState('');
  const [graduationYear, setGraduationYear] = useState<number | ''>('');
  const [skills, setSkills] = useState<string[]>([]);
  const [educationList, setEducationList] = useState<EducationItem[]>([]);
  const [experienceList, setExperienceList] = useState<ExperienceItem[]>([]);

  // Load profile on mount
  useEffect(() => {
    let mounted = true;
    if (session?.access_token) {
      setLoading(true);
      api
        .getStudentProfile(session.access_token)
        .then((data) => {
          if (mounted) {
            setProfile(data);
            setFullName(data.full_name || '');
            setHeadline(data.headline || '');
            setPhone(data.phone || '');
            setPreferredRole(data.preferred_role || '');
            setPreferredLocation(data.preferred_location || '');
            setGraduationYear(data.graduation_year || '');
            setSkills(data.skills || []);
            setEducationList(data.education || []);
            setExperienceList(data.experience || []);
          }
        })
        .catch((err) => {
          if (mounted) {
            console.error('Failed to load candidate profile:', err);
            setAlert({ type: 'error', message: err.message || 'Unable to load profile data.' });
          }
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    }
    return () => {
      mounted = false;
    };
  }, [session]);

  // Handle Form Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    setSaving(true);
    setAlert(null);
    try {
      const payload: Partial<CandidateProfile> = {
        full_name: fullName.trim(),
        headline: headline.trim(),
        phone: phone.trim(),
        preferred_role: preferredRole.trim(),
        preferred_location: preferredLocation.trim(),
        graduation_year: graduationYear ? Number(graduationYear) : undefined,
        skills,
        education: educationList,
        experience: experienceList,
      };

      const updated = await api.updateStudentProfile(session.access_token, payload);
      setProfile(updated);
      await refreshProfile();
      setAlert({ type: 'success', message: 'Profile details saved successfully!' });
    } catch (err: any) {
      console.error('Profile save error:', err);
      setAlert({ type: 'error', message: err.message || 'Failed to save changes.' });
    } finally {
      setSaving(false);
    }
  };

  // Education Helpers
  const addEducation = () => {
    setEducationList([
      ...educationList,
      { institution: '', degree: '', field_of_study: '', start_year: undefined, end_year: undefined },
    ]);
  };

  const updateEducation = (index: number, field: keyof EducationItem, value: any) => {
    const updated = [...educationList];
    updated[index] = { ...updated[index], [field]: value };
    setEducationList(updated);
  };

  const removeEducation = (index: number) => {
    setEducationList(educationList.filter((_, idx) => idx !== index));
  };

  // Experience Helpers
  const addExperience = () => {
    setExperienceList([
      ...experienceList,
      { title: '', company: '', location: '', start_date: '', end_date: '', current: false, description: '' },
    ]);
  };

  const updateExperience = (index: number, field: keyof ExperienceItem, value: any) => {
    const updated = [...experienceList];
    updated[index] = { ...updated[index], [field]: value };
    setExperienceList(updated);
  };

  const removeExperience = (index: number) => {
    setExperienceList(experienceList.filter((_, idx) => idx !== index));
  };

  // Resume Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser?.id || !session?.access_token) return;

    setUploadingResume(true);
    setAlert(null);

    try {
      // 1. Upload to Supabase Storage bucket 'resumes'
      const objectPath = await uploadStudentResume(file, authUser.id);

      // 2. Persist object path in candidate_profiles table
      const updated = await api.recordResumeMetadata(session.access_token, objectPath);
      setProfile(updated);
      await refreshProfile();

      setAlert({
        type: 'success',
        message: `Resume "${file.name}" uploaded successfully to your secure private vault.`,
      });
    } catch (err: any) {
      console.error('Resume upload error:', err);
      setAlert({ type: 'error', message: err.message || 'Failed to upload resume.' });
    } finally {
      setUploadingResume(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Resume Download via Signed URL
  const handleDownloadResume = async () => {
    if (!profile?.resume_path) return;
    setDownloadingResume(true);
    try {
      const signedUrl = await getResumeDownloadUrl(profile.resume_path);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Unable to retrieve resume download link.' });
    } finally {
      setDownloadingResume(false);
    }
  };

  // Resume Removal
  const handleRemoveResume = async () => {
    if (!profile?.resume_path || !session?.access_token) return;
    if (!window.confirm('Are you sure you want to remove your stored resume?')) return;

    setSaving(true);
    setAlert(null);
    try {
      await deleteStudentResumeFile(profile.resume_path);
      const updated = await api.removeResumeMetadata(session.access_token);
      setProfile(updated);
      await refreshProfile();
      setAlert({ type: 'success', message: 'Resume removed from your profile.' });
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to remove resume.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" message="Loading your profile builder..." className="py-20" />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Page Title & Completeness Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Candidate Profile</h1>
          <p className="text-sm text-slate-600 mt-1">
            Build your professional identity to connect with recruiters and apply to opportunities.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500 uppercase">Completeness</span>
            <p className="text-sm font-bold text-indigo-600">{profile?.completion_percentage || 0}%</p>
          </div>
          <div className="w-16 bg-slate-100 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${profile?.completion_percentage || 0}%` }}
            />
          </div>
        </div>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          title={alert.type === 'error' ? 'Notice' : 'Success'}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Main Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-8">
        {/* Section 1: Personal Details */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Personal & Contact Details</h2>
              <p className="text-xs text-slate-500">Your core contact information shown to recruiters</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="full-name" className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Full Name *
              </label>
              <input
                id="full-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
              />
            </div>

            <div>
              <label htmlFor="email-display" className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Account Email (Verified)
              </label>
              <div className="relative">
                <input
                  id="email-display"
                  type="email"
                  disabled
                  value={authUser?.email || ''}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed pl-9"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label htmlFor="headline" className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Professional Headline
              </label>
              <input
                id="headline"
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Computer Science Senior | Aspiring Full Stack Engineer"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Phone Number
              </label>
              <div className="relative">
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white pl-9"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label htmlFor="preferred-role" className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Target Role
              </label>
              <input
                id="preferred-role"
                type="text"
                value={preferredRole}
                onChange={(e) => setPreferredRole(e.target.value)}
                placeholder="e.g. Software Engineer, Frontend Developer"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
              />
            </div>

            <div>
              <label htmlFor="preferred-location" className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Preferred Location
              </label>
              <div className="relative">
                <input
                  id="preferred-location"
                  type="text"
                  value={preferredLocation}
                  onChange={(e) => setPreferredLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA or Remote"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white pl-9"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Verified Resume Vault */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Private Resume Vault</h2>
              <p className="text-xs text-slate-500">Stored in encrypted Supabase private storage (PDF only, max 5MB)</p>
            </div>
          </div>

          {profile?.resume_path ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  PDF
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Current Resume Attached</p>
                  <p className="text-xs text-slate-500">
                    Uploaded {profile.resume_updated_at ? new Date(profile.resume_updated_at).toLocaleDateString() : 'Active'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadResume}
                  disabled={downloadingResume}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors shadow-sm"
                >
                  {downloadingResume ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Download
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingResume}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors shadow-sm"
                >
                  {uploadingResume ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Replace
                </button>

                <button
                  type="button"
                  onClick={handleRemoveResume}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Remove resume"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-indigo-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">Upload your PDF resume</p>
              <p className="text-xs text-slate-500 mt-1">
                PDF format only &bull; Up to 5.0 MB &bull; Protected by strict ownership RLS
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingResume}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {uploadingResume ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading to Vault...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" /> Select PDF File
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Skills */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Technical & Professional Skills</h2>
              <p className="text-xs text-slate-500">Skills are indexed for recruiter matching and search</p>
            </div>
          </div>

          <SkillsInput skills={skills} onChange={setSkills} />
        </div>

        {/* Section 4: Education */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Education</h2>
                <p className="text-xs text-slate-500">Degrees, university details, and graduation year</p>
              </div>
            </div>
            <button
              type="button"
              onClick={addEducation}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Degree
            </button>
          </div>

          <div>
            <label htmlFor="grad-year" className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Primary Graduation Year
            </label>
            <input
              id="grad-year"
              type="number"
              min="1990"
              max="2040"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value ? Number(e.target.value) : '')}
              placeholder="e.g. 2026"
              className="w-full sm:w-48 px-3 py-2 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
            />
          </div>

          {educationList.length > 0 ? (
            <div className="space-y-4">
              {educationList.map((edu, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative">
                  <button
                    type="button"
                    onClick={() => removeEducation(idx)}
                    className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 p-1"
                    title="Remove degree"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Institution</label>
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={(e) => updateEducation(idx, 'institution', e.target.value)}
                        placeholder="e.g. University of California, Berkeley"
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Degree</label>
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                        placeholder="e.g. Bachelor of Science"
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Major / Field</label>
                      <input
                        type="text"
                        value={edu.field_of_study}
                        onChange={(e) => updateEducation(idx, 'field_of_study', e.target.value)}
                        placeholder="e.g. Computer Science"
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Graduation Year</label>
                      <input
                        type="number"
                        value={edu.end_year || ''}
                        onChange={(e) => updateEducation(idx, 'end_year', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="e.g. 2026"
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No degrees added yet. Click &ldquo;Add Degree&rdquo; above.</p>
          )}
        </div>

        {/* Section 5: Experience */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Work & Internship Experience</h2>
                <p className="text-xs text-slate-500">Prior positions, projects, and practical contributions</p>
              </div>
            </div>
            <button
              type="button"
              onClick={addExperience}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Experience
            </button>
          </div>

          {experienceList.length > 0 ? (
            <div className="space-y-4">
              {experienceList.map((exp, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative">
                  <button
                    type="button"
                    onClick={() => removeExperience(idx)}
                    className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 p-1"
                    title="Remove experience"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Role Title</label>
                      <input
                        type="text"
                        value={exp.title}
                        onChange={(e) => updateExperience(idx, 'title', e.target.value)}
                        placeholder="e.g. Software Engineering Intern"
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Company</label>
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => updateExperience(idx, 'company', e.target.value)}
                        placeholder="e.g. Acme Labs"
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
                      <input
                        type="text"
                        value={exp.start_date || ''}
                        onChange={(e) => updateExperience(idx, 'start_date', e.target.value)}
                        placeholder="e.g. Jun 2024"
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
                      <input
                        type="text"
                        value={exp.end_date || ''}
                        onChange={(e) => updateExperience(idx, 'end_date', e.target.value)}
                        placeholder="e.g. Aug 2024 (or Present)"
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={exp.description || ''}
                        onChange={(e) => updateExperience(idx, 'description', e.target.value)}
                        placeholder="Summary of responsibilities and achievements..."
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No experience added yet. Click &ldquo;Add Experience&rdquo; above.</p>
          )}
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Profile
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
