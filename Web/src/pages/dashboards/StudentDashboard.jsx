import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import AuthContext from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { useToast } from "../../context/ToastContext";
import JobTrendsWidget from "../../components/JobTrendsWidget";
import "../../styles/common/bento.css";
import "../../styles/student/student-dashboard.css";
import "../../styles/student/student-brand.css";
import "../../styles/notifications.css";

const IconX = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </svg>
);

const IconFileText = ({ size = 13 }) => (
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
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
    <path d="M10 9H8" />
  </svg>
);

export default function StudentDashboard() {
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const { openChatWith } = useChat();
  const toast = useToast();

  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [applicationSearch, setApplicationSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";

  useEffect(() => {
    document.body.classList.add("student-ink");
    return () => document.body.classList.remove("student-ink");
  }, []);

  const openProfileBuilder = () => {
    navigate("/profile/build");
  };

  const fetchConnectionsData = async () => {
    try {
      const token = localStorage.getItem("internmatch_token");
      if (!token) return;

      const [pendingRes, friendsRes] = await Promise.all([
        fetch(`${API_BASE}/api/connections/pending`, { headers: { "Authorization": `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/connections/friends`, { headers: { "Authorization": `Bearer ${token}` } })
      ]);

      if (pendingRes.ok) setPendingRequests(await pendingRes.json());
      if (friendsRes.ok) setFriends(await friendsRes.json());
    } catch (err) {
      console.error("Failed to fetch connections", err);
    }
  };

  const respondToRequest = async (connectionId, status) => {
    try {
      const token = localStorage.getItem("internmatch_token");
      const res = await fetch(`${API_BASE}/api/connections/respond/${connectionId}?status=${status}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        toast.show(`Request ${status === 'ACCEPTED' ? 'accepted' : 'declined'}`);
        fetchConnectionsData();
      }
    } catch (err) {
      console.error("Failed to respond to request", err);
    }
  };

  const fetchMyApplications = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("internmatch_token");
      const res = await fetch(`${API_BASE}/api/applications/my-applications`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map(app => ({
          id: app.id,
          internship: app.internshipTitle,
          company: app.company,
          location: "See Posting",
          setup: "See Posting",
          dateApplied: app.appliedAt,
          status: app.status,
          studentNote: "Application submitted via portal."
        }));
        setApplications(formatted);
      }
    } catch (err) {
      console.error("Failed to fetch applications", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyApplications();
    fetchConnectionsData();
    const interval = setInterval(() => {
      fetchConnectionsData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const normalizedSearch = applicationSearch.trim().toLowerCase();

  const filteredApplications = applications.filter((app) => {
    const matchesStatus = statusFilter === "ALL" || app.status === statusFilter;
    const matchesSearch =
      !normalizedSearch ||
      app.internship.toLowerCase().includes(normalizedSearch) ||
      app.company.toLowerCase().includes(normalizedSearch);
    return matchesStatus && matchesSearch;
  });

  const totalApplications = applications.length;
  const pendingApplications = applications.filter((app) => app.status === "PENDING").length;

  const profileFields = [
    currentUser?.name,
    currentUser?.email,
    currentUser?.program,
    currentUser?.yearLevel,
    currentUser?.skills,
    currentUser?.bio,
    currentUser?.projects,
  ];
  const profileCompletion = Math.round(
    (profileFields.filter((field) => !!String(field || "").trim()).length / profileFields.length) * 100
  );

  const openApplicationModal = (application) => {
    setSelectedApplication(application);
    setIsApplicationModalOpen(true);
  };

  const closeApplicationModal = () => {
    setSelectedApplication(null);
    setIsApplicationModalOpen(false);
  };

  const withdrawApplication = (applicationId) => {
    setApplications((prev) => prev.filter((app) => app.id !== applicationId));
    if (selectedApplication?.id === applicationId) closeApplicationModal();
    toast.show("Application withdrawn");
  };

  const readinessChecklist = [
    { id: 'info', text: 'Basic Information', done: !!(currentUser?.name && currentUser?.program && currentUser?.yearLevel) },
    { id: 'skills', text: 'Add Skills & Expertise', done: !!(currentUser?.skills?.trim()) },
    { id: 'app', text: 'First Application Sent', done: totalApplications > 0 }
  ];

  return (
    <DashboardLayout showProfileCard={false}>
      <div className="student-dashboard-root">
        <div className="student-dashboard-wrapper">
          <section className="student-hero">
            <div className="hero-aurora-bg">
              <div className="blob one"></div>
              <div className="blob two"></div>
            </div>
            <div className="hero-inner">
              <div className="hero-text">
                <span className="hero-badge">Student Portal</span>
                <h1>Welcome back, {currentUser?.name?.split(" ")[0] || "Student"}!</h1>
                <p>Your internship journey starts here. Track applications, discover opportunities, and build your career.</p>
              </div>
              <div className="hero-summary-stats">
                <div className="summary-stat-glass primary">
                  <span className="val">{totalApplications}</span>
                  <span className="lab">Total Apps</span>
                </div>
                <div className="summary-stat-glass">
                  <span className="val">{pendingApplications}</span>
                  <span className="lab">Pending</span>
                </div>
              </div>
            </div>
          </section>

          <div className="student-bento-grid">
            {/* Profile Bento */}
            <section className="bento-card profile-bento">
              <div className="bento-header">
                <div>
                  <span className="bento-label">Your Identity</span>
                  <h3>{currentUser?.name}</h3>
                </div>
                <button className="edit-btn-glass" onClick={openProfileBuilder}>Edit</button>
              </div>

              <div className="profile-details-mini">
                <div className="profile-meta-row">
                  <div className="mini-item">
                    <label>Program</label>
                    <p>{currentUser?.program || "Not set"}</p>
                  </div>
                  <div className="mini-item">
                    <label>Year</label>
                    <p>{currentUser?.yearLevel || "Not set"}</p>
                  </div>
                </div>

                {currentUser?.bio && (
                  <div className="mini-item spaced">
                    <label>Bio</label>
                    <p className="detail-text">{currentUser.bio}</p>
                  </div>
                )}

                <div className="mini-item spaced">
                  <label>Skills & Expertise</label>
                  <div className="skills-tags">
                    {(currentUser?.skills || "").split(",").map(s => s.trim()).filter(s => s).map((skill, i) => (
                      <span key={i} className="skill-tag">{skill}</span>
                    ))}
                    {!(currentUser?.skills) && <span className="no-skills-note">No skills added</span>}
                  </div>
                </div>

                {currentUser?.projects && (
                  <div className="mini-item spaced">
                    <label>Featured Projects</label>
                    <p className="detail-text">{currentUser.projects}</p>
                  </div>
                )}

                {currentUser?.resumeUrl && (
                  <div className="mini-item spaced">
                    <a
                      href={currentUser.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="skill-tag resume-link-pro"
                    >
                      <IconFileText />
                      View Professional Resume
                    </a>
                  </div>
                )}
              </div>

              <div className="completion-row">
                <div className="completion-track-wrap">
                  <div className="completion-info">
                    <span className="completion-label">Profile Completion</span>
                    <strong className="completion-value">{profileCompletion}%</strong>
                  </div>
                  <div className="completion-track">
                    <div className="completion-fill" style={{ width: `${profileCompletion}%` }} />
                  </div>
                </div>
              </div>
            </section>

            {/* Readiness / Tasks Bento */}
            <section className="bento-card readiness-bento">
              <div className="bento-header">
                <div>
                  <span className="bento-label">Checklist</span>
                  <h3>Career Readiness</h3>
                </div>
              </div>
              <div className="readiness-list">
                {readinessChecklist.map((item) => (
                  <div key={item.id} className={`readiness-item ${item.done ? 'done' : ''}`}>
                    <div className="check-circle">{item.done ? '✓' : ''}</div>
                    <span className="task-text">{item.text}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Market Intelligence Bento */}
            <section className="bento-card trends-bento">
              <JobTrendsWidget />
            </section>

            {/* Connections Bento */}
            <section className="bento-card connections-bento">
              <div className="bento-header">
                <div>
                  <span className="bento-label">Networking</span>
                  <h3>My Connections</h3>
                </div>
                <button className="edit-btn-glass" onClick={() => setIsFriendsModalOpen(true)}>View All ({friends.length})</button>
              </div>

              <div className="pending-requests-section">
                {pendingRequests.length > 0 && (
                  <div className="pending-list">
                    <span className="section-label">Pending Requests</span>
                    {pendingRequests.map(req => (
                      <div key={req.id} className="request-card-mini">
                        <div>
                          <p className="requester-name">{req.requesterName}</p>
                          <p className="requester-role">{req.requesterRole}</p>
                        </div>
                        <div className="request-actions">
                          <button className="mini-btn accept" onClick={() => respondToRequest(req.id, 'ACCEPTED')}>Accept</button>
                          <button className="mini-btn decline" onClick={() => respondToRequest(req.id, 'DECLINED')}>Decline</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="friends-preview">
                  <span className="section-label muted">Recent Connections</span>
                  <div className="friends-avatars">
                    {friends.length === 0 ? (
                      <p className="friends-empty">No connections yet. Connect with employers to grow your network!</p>
                    ) : (
                      friends.slice(0, 5).map(friend => (
                        <div key={friend.id} className="friend-avatar-circle" title={friend.name}>
                          {friend.name.charAt(0)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Applications Bento */}
            <section className="bento-card apps-bento">
              <div className="bento-header">
                <div>
                  <span className="bento-label">Track</span>
                  <h3>My Applications</h3>
                </div>
                <div className="app-filters-mini">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={applicationSearch}
                    onChange={(e) => setApplicationSearch(e.target.value)}
                  />
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="ALL">All</option>
                    <option value="PENDING">Pending</option>
                    <option value="ACCEPTED">Accepted</option>
                  </select>
                </div>
              </div>

              <div className="bento-apps-grid">
                {filteredApplications.length === 0 ? (
                  <div className="market-status-overlay">
                    <p className="insight-text">No applications found.</p>
                  </div>
                ) : (
                  filteredApplications.map((app) => (
                    <div key={app.id} className="bento-app-card" onClick={() => openApplicationModal(app)}>
                      <div className="app-header-mini">
                        <h4 className="app-title-sm">{app.internship}</h4>
                        <span className={`status-tag ${app.status.toLowerCase()}`}>{app.status}</span>
                      </div>
                      <p className="app-company-mini">{app.company}</p>
                      <div className="app-footer-mini">
                        <span className="app-date">{new Date(app.dateApplied).toLocaleDateString()}</span>
                        {["PENDING", "REJECTED"].includes(app.status) && (
                          <button className="mini-btn danger" onClick={(e) => { e.stopPropagation(); withdrawApplication(app.id); }}>Withdraw</button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Application Detail Modal */}
        {isApplicationModalOpen && selectedApplication && (
          <div className="modal-overlay">
            <div className="modal-content application-modal-pro">
              <div className="modal-aurora-glow secondary"></div>
              <div className="modal-inner-content">
                <div className="modal-header-pro">
                  <h3>Application Status</h3>
                  <button className="close-btn-glass" onClick={closeApplicationModal} aria-label="Close">
                    <IconX />
                  </button>
                </div>
                <div className="modal-body-pro">
                  <div className="app-details-grid-pro">
                    <div className="detail-card-mini">
                      <span className="label">Internship</span>
                      <p>{selectedApplication.internship}</p>
                    </div>
                    <div className="detail-card-mini">
                      <span className="label">Company</span>
                      <p>{selectedApplication.company}</p>
                    </div>
                    <div className="detail-card-mini">
                      <span className="label">Current Status</span>
                      <span className={`status-tag-v2 ${selectedApplication.status.toLowerCase()}`}>{selectedApplication.status}</span>
                    </div>
                    <div className="detail-card-mini">
                      <span className="label">Applied On</span>
                      <p>{new Date(selectedApplication.dateApplied).toLocaleDateString()}</p>
                    </div>
                    <div className="detail-card-mini full-width">
                      <span className="label">Applicant Note</span>
                      <div className="note-box-pro">
                        {selectedApplication.studentNote || "No additional notes provided."}
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer-pro">
                    <button className="btn-secondary-glass" onClick={closeApplicationModal}>Dismiss</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Friends Modal */}
        {isFriendsModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content profile-modal-pro">
              <div className="modal-aurora-glow"></div>
              <div className="modal-inner-content">
                <div className="modal-header-pro">
                  <div>
                    <span className="bento-label">Network</span>
                    <h3>Your Connections</h3>
                  </div>
                  <button className="close-btn-glass" onClick={() => setIsFriendsModalOpen(false)} aria-label="Close">
                    <IconX />
                  </button>
                </div>
                <div className="modal-body-pro">
                  <div className="friends-list-full">
                    {friends.length === 0 ? (
                      <div className="network-empty">
                        <p>No connections found.</p>
                      </div>
                    ) : (
                      friends.map(friend => (
                        <div key={friend.id} className="network-card">
                          <div className="network-avatar">{friend.name.charAt(0)}</div>
                          <div className="network-info">
                            <h4>{friend.name}</h4>
                            <p className="network-role">{friend.role}</p>
                            <p className="network-meta">{friend.companyName || friend.program}</p>
                          </div>
                          <button
                            className="btn-primary-pro network-chat-btn"
                            onClick={() => {
                              openChatWith(friend);
                              setIsFriendsModalOpen(false);
                            }}
                          >
                            Chat
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="modal-footer-pro">
                  <button className="btn-secondary-glass" onClick={() => setIsFriendsModalOpen(false)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}