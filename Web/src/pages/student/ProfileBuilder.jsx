import { useState, useContext, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import AuthContext from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import "../../styles/common/bento.css";
import "../../styles/student/student-dashboard.css";
import "../../styles/student/student-brand.css";
import "../../styles/student/profile-builder.css";

const Icon = ({ children, size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const IconUser = () => (
  <Icon>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Icon>
);

const IconWrench = () => (
  <Icon>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </Icon>
);

const IconFolder = () => (
  <Icon>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </Icon>
);

const IconFile = ({ size = 16 }) => (
  <Icon size={size}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </Icon>
);

const IconFileLarge = () => (
  <svg
    width="44"
    height="44"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </svg>
);

const IconUpload = () => (
  <svg
    width="44"
    height="44"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 8l5-5 5 5" />
    <path d="M12 3v12" />
  </svg>
);

export default function ProfileBuilder() {
  const { currentUser, updateProfile, uploadResume, removeResume } = useContext(AuthContext);
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("essentials");
  const [isUploading, setIsUploading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    program: "",
    yearLevel: "",
    skills: "",
    bio: "",
    projects: "",
    resumeUrl: "",
    linkedin: "",
    website: "",
  });

  useEffect(() => {
    document.body.classList.add("student-ink");
    return () => document.body.classList.remove("student-ink");
  }, []);

  // Load initial data only once or when currentUser is first available
  const [isInitialized, setIsInitialized] = useState(false);
  useEffect(() => {
    if (currentUser && !isInitialized) {
      setForm({
        name: currentUser.name || "",
        program: currentUser.program || "",
        yearLevel: currentUser.yearLevel || "",
        skills: currentUser.skills || "",
        bio: currentUser.bio || "",
        projects: currentUser.projects || "",
        resumeUrl: currentUser.resumeUrl || "",
        linkedin: currentUser.linkedin || "",
        website: currentUser.website || "",
      });
      setIsInitialized(true);
    }
  }, [currentUser, isInitialized]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.show("File too large. Max 5MB.", "error");
      return;
    }

    setIsUploading(true);
    const result = await uploadResume(file);
    setIsUploading(false);

    if (result.fileDownloadUri) {
      setForm(prev => ({ ...prev, resumeUrl: result.fileDownloadUri }));
      toast.show("Resume uploaded successfully! Please click Save Changes to finalize.", "success");
    } else {
      toast.show(result.message || "Upload failed.", "error");
    }
  };

  const handleRemoveResume = async () => {
    if (window.confirm("Are you sure you want to remove your resume? This will take effect immediately.")) {
      const res = await removeResume();
      if (res.ok) {
        setForm(prev => ({ ...prev, resumeUrl: "" }));
        toast.show("Resume removed successfully.", "success");
      } else {
        toast.show(res.message || "Failed to remove resume.", "error");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await updateProfile(form);
    if (res.ok) {
      toast.show("Profile updated successfully! Your changes are now live.", "success");
    } else {
      const msg = res.message || "Unable to save profile changes.";
      if (msg.includes("MODERATION_ERROR")) {
        toast.show(msg.replace("MODERATION_ERROR: ", ""), "warning");
      } else {
        toast.show(msg, "error");
      }
    }
  };

  const tabs = [
    { id: "essentials", label: "Essentials", IconCmp: IconUser },
    { id: "skills", label: "Skills", IconCmp: IconWrench },
    { id: "portfolio", label: "Portfolio", IconCmp: IconFolder },
    { id: "resume", label: "Resume", IconCmp: IconFile },
  ];

  return (
    <DashboardLayout title="Profile Builder">
      <div className="student-dashboard-root">
        <div className="student-dashboard-wrapper">
          <section className="student-hero">
            <div className="hero-aurora-bg">
              <div className="blob one"></div>
              <div className="blob two"></div>
            </div>
            <div className="hero-inner">
              <div className="hero-text">
                <span className="hero-badge">Professional Growth</span>
                <h1>
                  Build your <span className="gradient-text">Identity</span>
                </h1>
                <p>Complete your profile to stand out to potential employers and internship providers.</p>
              </div>
            </div>
          </section>

          <div className="bento-card pb-card">
            <div className="modal-tabs-pro pb-tabs" role="tablist">
              {tabs.map(({ id, label, IconCmp }) => (
                <button
                  key={id}
                  type="button"
                  className={`modal-tab-btn ${activeTab === id ? 'active' : ''}`}
                  onClick={() => setActiveTab(id)}
                >
                  <IconCmp />
                  {label}
                </button>
              ))}
            </div>

            <form className="pb-form" onSubmit={handleSubmit}>
              {activeTab === 'essentials' && (
                <div className="form-grid-pro">
                  <div className="input-group-pro">
                    <label>Full Name</label>
                    <input name="name" value={form.name} onChange={handleChange} required />
                  </div>
                  <div className="input-group-pro">
                    <label>Academic Program</label>
                    <input name="program" value={form.program} onChange={handleChange} placeholder="e.g. BS Information Technology" />
                  </div>
                  <div className="input-group-pro">
                    <label>Year Level</label>
                    <select name="yearLevel" value={form.yearLevel} onChange={handleChange}>
                      <option value="">Select Level</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>
                  <div className="input-group-pro">
                    <label>LinkedIn Profile URL</label>
                    <input name="linkedin" value={form.linkedin} onChange={handleChange} placeholder="https://linkedin.com/in/username" />
                  </div>
                  <div className="input-group-pro full-width">
                    <label>Personal Website / GitHub Portfolio</label>
                    <input name="website" value={form.website} onChange={handleChange} placeholder="https://yourportfolio.com or github.com/username" />
                  </div>
                </div>
              )}

              {activeTab === 'skills' && (
                <div className="input-group-pro full-width">
                  <label>Technical Skills (comma separated)</label>
                  <textarea
                    name="skills"
                    value={form.skills}
                    onChange={handleChange}
                    placeholder="e.g. React, Java, Spring Boot, Figma"
                    rows={5}
                  />
                </div>
              )}

              {activeTab === 'portfolio' && (
                <div className="form-grid-pro">
                  <div className="input-group-pro full-width">
                    <label>Professional Bio</label>
                    <textarea
                      name="bio"
                      value={form.bio}
                      onChange={handleChange}
                      placeholder="Tell employers about your goals and interests..."
                      rows={5}
                    />
                  </div>
                  <div className="input-group-pro full-width">
                    <label>Featured Projects</label>
                    <textarea
                      name="projects"
                      value={form.projects}
                      onChange={handleChange}
                      placeholder="Describe your best work or link to your portfolio..."
                      rows={5}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'resume' && (
                <div className="resume-upload-section">
                  <div className="resume-state">
                    {form.resumeUrl ? (
                      <>
                        <div className="resume-state-icon">
                          <IconFileLarge />
                        </div>
                        <p className="resume-state-title">Resume is uploaded!</p>
                        <a href={form.resumeUrl} target="_blank" rel="noopener noreferrer" className="resume-link">
                          View Current Resume
                        </a>
                      </>
                    ) : (
                      <>
                        <div className="resume-state-icon dim">
                          <IconUpload />
                        </div>
                        <p className="resume-state-empty">No resume uploaded yet.</p>
                      </>
                    )}
                  </div>

                  <div className="resume-actions">
                    <label className="btn-primary-pro pb-upload-btn">
                      {isUploading ? "Uploading..." : form.resumeUrl ? "Replace Resume" : "Upload Resume (PDF)"}
                      <input type="file" accept=".pdf" onChange={handleFileUpload} className="file-input-hidden" disabled={isUploading} />
                    </label>

                    {form.resumeUrl && (
                      <button
                        type="button"
                        className="btn-primary-pro btn-remove-resume"
                        onClick={handleRemoveResume}
                      >
                        Remove Resume
                      </button>
                    )}
                  </div>
                  <p className="resume-hint">PDF format only, max 5MB.</p>
                </div>
              )}

              <div className="pb-actions">
                <button
                  type="submit"
                  className="btn-primary-pro"
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}