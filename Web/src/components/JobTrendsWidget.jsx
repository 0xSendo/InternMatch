import { useEffect, useState } from "react";
import axios from "axios";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "../styles/common/market-intelligence.css";

const CHART_BARS = ["#ff6b4a", "#39c6b8", "#ffd666", "#8b5cf6", "#4f8ff7", "#f472b6"];
const NATIONAL_BARS = ["#4f8ff7", "#39c6b8", "#ffb35c"];

const TOOLTIP_NAMES = {
  postings: "Active Postings",
  applications: "Total Applications",
  employmentRate: "Employment Rate",
  applicationsPerPosting: "Applications / Posting",
  acceptanceRate: "Acceptance Rate",
};

const FALLBACK_SECTORS = [
  { sector: "Services", employmentRate: 60.1 },
  { sector: "Agriculture", employmentRate: 22.4 },
  { sector: "Industry", employmentRate: 17.5 },
];

const FALLBACK_DEMAND = [
  { category: "Business & Admin", postings: 18, applications: 15 },
  { category: "Marketing & Sales", postings: 15, applications: 32 },
  { category: "Tech & Development", postings: 12, applications: 45 },
  { category: "Design & Creative", postings: 5, applications: 28 },
];

const round1 = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v * 10) / 10 : 0;
};

const formatNum = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? v.toLocaleString() : String(n);
};

const Icon = ({ children, size = 14 }) => (
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

const IconBars = () => (
  <Icon>
    <rect x="3" y="12" width="4" height="9" rx="1" />
    <rect x="10" y="7" width="4" height="14" rx="1" />
    <rect x="17" y="3" width="4" height="18" rx="1" />
  </Icon>
);

const IconTrend = () => (
  <Icon>
    <polyline points="3 17 9 11 13 15 21 7" />
    <polyline points="15 7 21 7 21 13" />
  </Icon>
);

const IconBriefcase = () => (
  <Icon>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
  </Icon>
);

const IconGlobe = () => (
  <Icon>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </Icon>
);

const IconSpark = () => (
  <Icon size={13}>
    <path d="M12 2l2.4 6.2L21 10l-5.2 4.4 1.5 6.6L12 17l-5.3 3.9 1.5-6.6L3 10l6.6-1.8z" />
  </Icon>
);

const MiTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const first = payload[0];
  const data = first?.payload || {};
  const title =
    first.dataKey === "employmentRate"
      ? data.sector || label
      : data.category || data.month || label;

  return (
    <div className="mi-tooltip">
      <span className="mi-tooltip-title">{title}</span>
      <div className="mi-tooltip-rows">
        {payload.map((entry) => {
          const key = entry.dataKey;
          const name = TOOLTIP_NAMES[key] || entry.name || key;
          const suffix = key === "employmentRate" || key === "acceptanceRate" ? "%" : "";
          return (
            <div key={key} className="mi-tooltip-row">
              <span className="mi-tooltip-dot" style={{ background: entry.color || entry.stroke || entry.fill }} />
              <span className="mi-tooltip-name">{name}</span>
              <strong className="mi-tooltip-val">
                {formatNum(entry.value)}
                {suffix}
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const normalizeDemand = (raw) => {
  const list = Array.isArray(raw) && raw.length ? raw : FALLBACK_DEMAND;
  return list
    .filter((d) => d && d.category)
    .map((d) => {
      const postings = Number(d.postings) || 0;
      const applications = Number(d.applications) || 0;
      const appsPerPosting =
        d.applicationsPerPosting != null
          ? round1(d.applicationsPerPosting)
          : round1(postings ? applications / postings : 0);
      return {
        category: d.category,
        postings,
        applications,
        applicationsPerPosting: appsPerPosting,
        acceptanceRate: round1(d.acceptanceRate ?? 0),
      };
    });
};

export default function JobTrendsWidget() {
  const [national, setNational] = useState([]);
  const [demand, setDemand] = useState([]);
  const [overview, setOverview] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem("internmatch_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const fetchStats = async () => {
      try {
        const [nationalRes, interestRes, overviewRes] = await Promise.allSettled([
          axios.get("/api/v1/stats/job-trends", { headers }),
          axios.get("/api/v1/stats/employer-interest", { headers }),
          axios.get("/api/v1/stats/market-overview", { headers }),
        ]);
        if (cancelled) return;

        const tData =
          nationalRes.status === "fulfilled" ? nationalRes.value.data?.data || [] : [];
        const iData =
          interestRes.status === "fulfilled" ? interestRes.value.data?.data || [] : [];
        const oData = overviewRes.status === "fulfilled" ? overviewRes.value.data || {} : {};

        setNational(tData.length ? tData : FALLBACK_SECTORS);
        setDemand(normalizeDemand(iData));
        setOverview(oData);

        const ts =
          oData.lastUpdated ||
          (nationalRes.status === "fulfilled" ? nationalRes.value.data?.lastUpdated : "") ||
          new Date().toISOString();
        setLastUpdated(ts);
      } catch (err) {
        if (cancelled) return;
        console.error("Stats fetch error:", err);
        setNational(FALLBACK_SECTORS);
        setDemand(normalizeDemand([]));
        setOverview({});
        setLastUpdated(new Date().toISOString());
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, []);

  const demandByPostings = [...demand].sort((a, b) => b.postings - a.postings);
  const totalPostings =
    Number(overview.totalPostings) || demandByPostings.reduce((s, d) => s + d.postings, 0);
  const activePostings =
    Number(overview.activePostings) || demandByPostings.reduce((s, d) => s + d.postings, 0);
  const totalApplications =
    Number(overview.market?.totalApplications) ||
    demandByPostings.reduce((s, d) => s + d.applications, 0);
  const avgAppsPerPosting =
    overview.market?.avgApplicationsPerPosting != null
      ? round1(overview.market.avgApplicationsPerPosting)
      : round1(totalApplications / (totalPostings || 1));
  const overallAcceptanceRate =
    overview.market?.overallAcceptanceRate != null
      ? round1(overview.market.overallAcceptanceRate)
      : null;

  const momentum = Array.isArray(overview.postingTrend) ? overview.postingTrend : [];
  const setups = Array.isArray(overview.setupSplit) ? overview.setupSplit : [];
  const maxSetup = setups.reduce((m, s) => Math.max(m, Number(s.postings) || 0), 0);

  const topDemand = demandByPostings[0];
  const mostCompetitive = [...demand].sort(
    (a, b) => b.applicationsPerPosting - a.applicationsPerPosting
  )[0];
  const bestAcceptance = [...demand]
    .filter((d) => d.acceptanceRate > 0)
    .sort((a, b) => b.acceptanceRate - a.acceptanceRate)[0];

  const kpis = [
    { label: "Total Postings", value: formatNum(totalPostings), sub: "" },
    { label: "Active Postings", value: formatNum(activePostings), sub: "" },
    {
      label: "Applications / Posting",
      value: formatNum(avgAppsPerPosting),
      sub: overallAcceptanceRate != null ? `${overallAcceptanceRate}% acceptance` : "",
    },
  ];

  const year = lastUpdated ? new Date(lastUpdated).getFullYear() : new Date().getFullYear();

  const callouts = [];
  if (topDemand) {
    callouts.push(
      <span key="demand">
        <strong className="mi-strong">{topDemand.category}</strong> leads demand with{" "}
        {topDemand.postings} openings and {round1(topDemand.applicationsPerPosting)} applications
        per posting.
      </span>
    );
  }
  if (mostCompetitive && mostCompetitive !== topDemand) {
    callouts.push(
      <span key="competitive">
        <strong className="mi-strong">{mostCompetitive.category}</strong> is the most competitive
        field to target.
      </span>
    );
  }
  if (bestAcceptance && bestAcceptance.acceptanceRate > 0) {
    callouts.push(
      <span key="acceptance">
        <strong className="mi-strong">{bestAcceptance.category}</strong> shows the highest
        acceptance rate at {bestAcceptance.acceptanceRate}%.
      </span>
    );
  }

  return (
    <div className="mi-widget">
      <div className="mi-header">
        <div>
          <span className="bento-label">Market Intelligence</span>
          <h3 className="mi-title">Strategic Market Insights</h3>
          <p className="mi-sub">
            PH Sector Trends <span className="mi-sep">•</span> <strong>Internal Demand</strong>
          </p>
        </div>
        <span className="mi-year">{year} DATA</span>
      </div>

      {loading ? (
        <div className="mi-loading">Analyzing trends...</div>
      ) : (
        <>
          <div className="mi-kpis">
            {kpis.map((k) => (
              <div key={k.label} className="mi-kpi">
                <span className="mi-kpi-label">{k.label}</span>
                <span className="mi-kpi-value">{k.value}</span>
                {k.sub ? <span className="mi-kpi-sub">{k.sub}</span> : null}
              </div>
            ))}
          </div>

          <div className="mi-grid">
            {/* Demand by field */}
            <section className="mi-panel">
              <div className="mi-panel-head">
                <span className="mi-icon-chip">
                  <IconBars />
                </span>
                <div>
                  <h4>Demand by Field</h4>
                  <p className="mi-panel-sub">Openings and competition per category</p>
                </div>
              </div>
              <div className="mi-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={demandByPostings}
                    layout="vertical"
                    margin={{ top: 4, right: 34, left: 4, bottom: 4 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="category"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={112}
                      tick={{ fontSize: 10, fontWeight: 700, fill: "var(--text)" }}
                    />
                    <Tooltip content={<MiTooltip />} cursor={{ fill: "rgba(255, 255, 255, 0.04)" }} />
                    <Bar dataKey="postings" name="Active Postings" radius={[0, 6, 6, 0]} barSize={12}>
                      {demandByPostings.map((d, i) => (
                        <Cell key={`dm-${i}`} fill={CHART_BARS[i % CHART_BARS.length]} />
                      ))}
                      <LabelList
                        dataKey="postings"
                        position="right"
                        style={{ fontSize: 10, fill: "var(--muted)", fontWeight: 700 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Posting momentum */}
            <section className="mi-panel">
              <div className="mi-panel-head">
                <span className="mi-icon-chip">
                  <IconTrend />
                </span>
                <div>
                  <h4>Posting Momentum</h4>
                  <p className="mi-panel-sub">Monthly postings vs applications</p>
                </div>
              </div>
              {momentum.length ? (
                <div className="mi-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={momentum} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="miGradPostings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ff6b4a" stopOpacity={0.32} />
                          <stop offset="95%" stopColor="#ff6b4a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        dy={6}
                        tick={{ fontSize: 10, fill: "var(--text)", opacity: 0.8 }}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--text)", opacity: 0.7 }} />
                      <Tooltip content={<MiTooltip />} cursor={{ stroke: "rgba(255, 255, 255, 0.15)" }} />
                      <Area
                        type="monotone"
                        dataKey="postings"
                        name="Active Postings"
                        stroke="#ff6b4a"
                        strokeWidth={2}
                        fill="url(#miGradPostings)"
                      />
                      <Area
                        type="monotone"
                        dataKey="applications"
                        name="Total Applications"
                        stroke="#4f8ff7"
                        strokeWidth={2}
                        fill="transparent"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mi-empty">Posting momentum not available yet.</p>
              )}
            </section>

            {/* Work setup split */}
            <section className="mi-panel">
              <div className="mi-panel-head">
                <span className="mi-icon-chip">
                  <IconBriefcase />
                </span>
                <div>
                  <h4>Work Setup Split</h4>
                  <p className="mi-panel-sub">Remote, hybrid and onsite openings</p>
                </div>
              </div>
              {setups.length ? (
                <div className="mi-setup-list">
                  {setups.map((s) => {
                    const n = Number(s.postings) || 0;
                    const pct = maxSetup ? Math.max(4, Math.round((n / maxSetup) * 100)) : 0;
                    return (
                      <div key={s.setup || s.location} className="mi-setup-row">
                        <div className="mi-setup-head">
                          <span>{s.setup}</span>
                          <strong>{n}</strong>
                        </div>
                        <div className="mi-setup-track">
                          <span className="mi-setup-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mi-empty">Setup mix not available yet.</p>
              )}
            </section>
          </div>

          {/* National employment context */}
          <section className="mi-panel mi-panel-national">
            <div className="mi-panel-head">
              <span className="mi-icon-chip">
                <IconGlobe />
              </span>
              <div>
                <h4>National Employment Context</h4>
                <p className="mi-panel-sub">PH sector distribution from World Bank Indicators</p>
              </div>
            </div>
            <div className="mi-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={national} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis
                    dataKey="sector"
                    axisLine={false}
                    tickLine={false}
                    dy={8}
                    tick={{ fontSize: 10, fill: "var(--text)", opacity: 0.8, fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "var(--text)", opacity: 0.7 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<MiTooltip />} cursor={{ fill: "rgba(255, 255, 255, 0.04)" }} />
                  <Bar dataKey="employmentRate" name="Employment Rate" radius={[6, 6, 0, 0]} barSize={40}>
                    {national.map((e, i) => (
                      <Cell key={`nt-${i}`} fill={NATIONAL_BARS[i % NATIONAL_BARS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {callouts.length > 0 && (
            <div className="mi-callout">
              <span className="mi-callout-icon">
                <IconSpark />
              </span>
              <p className="mi-callout-text">{callouts}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}