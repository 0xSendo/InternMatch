import { useContext, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import "../styles/home.css";
import Navbar from "../components/Navbar";

function parseHashParams(hash) {
  if (!hash || !hash.startsWith("#")) return new URLSearchParams();
  return new URLSearchParams(hash.substring(1));
}

function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1];
    if (!base64) return null;
    const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

function getRoleDashboard(role) {
  if (role === "EMPLOYER") return "/dashboard/employer";
  if (role === "ADMIN") return "/dashboard/admin";
  return "/dashboard/student";
}

function DashboardMockup() {
  return (
    <div className="landing-mockup">
      <svg
        viewBox="0 0 600 470"
        role="img"
        aria-label="Preview of the InternMatch student dashboard: a profile completion bar, three applications with Pending, Interview, and Offered statuses, and a weekly summary."
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>Preview of the InternMatch student dashboard</title>
        <rect width="600" height="470" fill="#12161c" />

        <rect width="600" height="46" fill="#161b22" />
        <circle cx="26" cy="23" r="5" fill="#2a3139" />
        <circle cx="44" cy="23" r="5" fill="#2a3139" />
        <circle cx="62" cy="23" r="5" fill="#2a3139" />
        <text x="86" y="29" fill="#9aa3ad" font-family="Sora, Arial, sans-serif" font-size="13" font-weight="600" letter-spacing="0.2">InternMatch · Student Portal</text>

        <text x="32" y="86" fill="#edeae3" font-family="Sora, Arial, sans-serif" font-size="14" font-weight="700">Applications</text>
        <text x="566" y="86" text-anchor="end" fill="#9aa3ad" font-family="Arial, sans-serif" font-size="12">2 new this week</text>

        <g font-family="Arial, sans-serif">
          <rect x="28" y="102" width="544" height="74" rx="12" fill="#1a1f26" stroke="#252b33" />
          <rect x="46" y="116" width="34" height="34" rx="8" fill="#2a3139" />
          <text x="63" y="138" text-anchor="middle" fill="#ff6b4a" font-size="12" font-weight="700" font-family="Sora, Arial, sans-serif">AC</text>
          <text x="92" y="136" fill="#edeae3" font-size="14.5" font-weight="600">Software Engineering Intern</text>
          <text x="92" y="154" fill="#9aa3ad" font-size="12">ACME Corp · Remote · PHP 50,000/mo</text>
          <rect x="452" y="116" width="104" height="22" rx="11" fill="#ffffff14" stroke="#ffffff29" />
          <text x="504" y="131" text-anchor="middle" fill="#c9ced4" font-size="10.5" font-weight="600" letter-spacing="1">PENDING</text>

          <rect x="28" y="184" width="544" height="74" rx="12" fill="#1a1f26" stroke="#252b33" />
          <rect x="46" y="198" width="34" height="34" rx="8" fill="#2a3139" />
          <text x="63" y="220" text-anchor="middle" fill="#ff6b4a" font-size="12" font-weight="700" font-family="Sora, Arial, sans-serif">NX</text>
          <text x="92" y="218" fill="#edeae3" font-size="14.5" font-weight="600">Data Analyst</text>
          <text x="92" y="236" fill="#9aa3ad" font-size="12">NEXA Labs · Onsite · Makati</text>
          <rect x="452" y="198" width="104" height="22" rx="11" fill="#ffffff14" stroke="#ffffff29" />
          <text x="504" y="213" text-anchor="middle" fill="#c9ced4" font-size="10.5" font-weight="600" letter-spacing="1">INTERVIEW</text>

          <rect x="28" y="266" width="544" height="74" rx="12" fill="#1a1f26" stroke="#252b33" />
          <rect x="46" y="280" width="34" height="34" rx="8" fill="#2a3139" />
          <text x="63" y="302" text-anchor="middle" fill="#ff6b4a" font-size="12" font-weight="700" font-family="Sora, Arial, sans-serif">SA</text>
          <text x="92" y="300" fill="#edeae3" font-size="14.5" font-weight="600">UI/UX Design Intern</text>
          <text x="92" y="318" fill="#9aa3ad" font-size="12">Studio Alva · Hybrid · Quezon City</text>
          <rect x="452" y="280" width="104" height="22" rx="11" fill="#c93c13" />
          <text x="504" y="295" text-anchor="middle" fill="#ffffff" font-size="10.5" font-weight="700" letter-spacing="1">OFFERED</text>
        </g>

        <g font-family="Arial, sans-serif">
          <rect x="28" y="352" width="168" height="80" rx="12" fill="#1a1f26" stroke="#252b33" />
          <text x="44" y="386" fill="#ff6b4a" font-size="24" font-weight="700" font-family="Sora, Arial, sans-serif">3</text>
          <text x="44" y="408" fill="#9aa3ad" font-size="11.5">Active applications</text>

          <rect x="216" y="352" width="168" height="80" rx="12" fill="#1a1f26" stroke="#252b33" />
          <text x="232" y="386" fill="#edeae3" font-size="24" font-weight="700" font-family="Sora, Arial, sans-serif">2</text>
          <text x="232" y="408" fill="#9aa3ad" font-size="11.5">Interviews this week</text>

          <rect x="404" y="352" width="168" height="80" rx="12" fill="#1a1f26" stroke="#252b33" />
          <text x="420" y="386" fill="#edeae3" font-size="24" font-weight="700" font-family="Sora, Arial, sans-serif">65%</text>
          <text x="420" y="408" fill="#9aa3ad" font-size="11.5">Background match score</text>
        </g>
      </svg>
    </div>
  );
}

const studentFeatures = [
  "One profile that doubles as your application — no more re-typing the same form.",
  "See which roles you genuinely match before you apply, not after.",
  "Track every application with live statuses, not silence.",
];

const employerFeatures = [
  "Post a role once and receive a shortlist of students who already clear your requirements.",
  "Review profile, skills, and projects in a single view.",
  "Shortlist, interview, and decide without reading hundreds of resumes.",
];

function GraduationCapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
      <path d="M22 10v6" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21h18" />
      <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
      <path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10z" />
      <path d="m9 11 2 2 4-4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function DeviceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M10 17h4" />
    </svg>
  );
}

const miniFeatures = [
  { title: "Secure sign-in", description: "JWT sessions with role-based access for students, employers, and admins.", Icon: ShieldIcon },
  { title: "Live statuses", description: "Applications move from pending to accepted or withdrawn with real-time updates.", Icon: ClockIcon },
  { title: "Works on any device", description: "Web dashboard, native Android app, and in-app chat with your matches.", Icon: DeviceIcon },
];

export default function Home() {
  const { loginWithOAuth, isAuthenticated, currentUser } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      navigate(getRoleDashboard(currentUser.role), { replace: true });
    }
  }, [isAuthenticated, currentUser, navigate]);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const hashParams = useMemo(() => parseHashParams(location.hash), [location.hash]);

  const oauthToken = searchParams.get("token");
  const oauthEmail = searchParams.get("email");
  const oauthName = searchParams.get("name");
  const oauthRole = searchParams.get("role");

  const implicitAccessToken = hashParams.get("access_token");
  const implicitIdToken = hashParams.get("id_token");

  useEffect(() => {
    if (!oauthToken || !oauthEmail) return;

    const result = loginWithOAuth({
      token: oauthToken,
      email: oauthEmail,
      name: oauthName,
      role: oauthRole,
    });

    if (result.ok) {
      navigate(getRoleDashboard(result.user.role), { replace: true });
    }
  }, [oauthToken, oauthEmail, oauthName, oauthRole, loginWithOAuth, navigate]);

  useEffect(() => {
    if (!implicitAccessToken && !implicitIdToken) return;

    const idTokenPayload = implicitIdToken ? decodeJwtPayload(implicitIdToken) : null;
    const email = idTokenPayload?.email;
    const name = idTokenPayload?.name || email;

    if (!email) return;

    const result = loginWithOAuth({
      token: implicitAccessToken || implicitIdToken,
      email,
      name,
      role: "STUDENT",
    });

    if (result.ok) {
      navigate(getRoleDashboard(result.user.role), { replace: true });
    }
  }, [implicitAccessToken, implicitIdToken, loginWithOAuth, navigate]);

  return (
    <div className="home-container">
      <Navbar />

      <main className="landing-main">
        <section className="landing-hero" aria-labelledby="landing-hero-title" aria-describedby="landing-hero-subtitle">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">Internship matching platform</p>
            <h1 className="landing-title" id="landing-hero-title">
              InternMatch pairs students with{" "}
              <span className="landing-emphasis">internships</span> and employers
              with <span className="landing-emphasis">vetted talent</span>.
            </h1>
            <p className="landing-subtitle" id="landing-hero-subtitle">
              Students build one profile, mark the skills they have, and get
              matched to open roles. Employers post once and receive a shortlist
              of students who already clear their requirements.
            </p>

            <div className="landing-cta">
              <Link to="/register" className="landing-btn landing-btn--primary">
                Create your profile
              </Link>
              <a href="#features" className="landing-btn landing-btn--ghost">
                Explore features
              </a>
            </div>

            <dl className="landing-stats">
              <div className="landing-stat">
                <dt>Active students</dt>
                <dd>5,000+</dd>
              </div>
              <div className="landing-stat">
                <dt>Posting employers</dt>
                <dd>200+</dd>
              </div>
              <div className="landing-stat">
                <dt>Shortlist-to-interview match</dt>
                <dd>65%</dd>
              </div>
            </dl>
          </div>

          <DashboardMockup />
        </section>

        <section className="landing-features" id="features" aria-labelledby="landing-features-title">
          <header className="landing-section-head">
            <h2 id="landing-features-title">What it does</h2>
            <p>
              InternMatch handles the matching so students stop spamming generic
              forms and employers stop reading thousands of resumes.
            </p>
          </header>

          <div className="landing-feature-grid">
            <article className="landing-feature-card">
              <div className="landing-feature-icon" aria-hidden="true">
                <GraduationCapIcon />
              </div>
              <h3>For students</h3>
              <ul>
                {studentFeatures.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="landing-feature-card">
              <div className="landing-feature-icon" aria-hidden="true">
                <BuildingIcon />
              </div>
              <h3>For employers</h3>
              <ul>
                {employerFeatures.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>

          <ul className="landing-mini-features">
            {miniFeatures.map(({ title, description, Icon }) => (
              <li className="landing-mini" key={title}>
                <Icon />
                <span>
                  <span className="landing-mini-title">{title}</span>
                  <span className="landing-mini-description">{description}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="landing-cta-band" aria-labelledby="landing-cta-title">
          <h2 id="landing-cta-title">Start matching today</h2>
          <p>
            Students: build a profile in five minutes. Employers: post a role
            and get your shortlist tomorrow.
          </p>
          <Link to="/register" className="landing-btn landing-btn--primary">
            Get started
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <p className="landing-footer-copy">
          &copy; 2026 InternMatch. All rights reserved.
        </p>
      </footer>
    </div>
  );
}