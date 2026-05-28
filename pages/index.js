import { useState, useEffect, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Head from "next/head";

const BADGE = {
  "bd-r": { bg: "#fee2e2", color: "#991b1b" },
  "bd-a": { bg: "#fef3c7", color: "#92400e" },
  "bd-g": { bg: "#dcfce7", color: "#166534" },
  "bd-b": { bg: "#dbeafe", color: "#1e40af" },
  "bd-x": { bg: "#f3f4f6", color: "#6b7280" },
};

const AVATAR = {
  "av-r": { bg: "#fee2e2", color: "#991b1b" },
  "av-a": { bg: "#fef3c7", color: "#92400e" },
  "av-g": { bg: "#dcfce7", color: "#166534" },
  "av-b": { bg: "#dbeafe", color: "#1e40af" },
  "av-x": { bg: "#f3f4f6", color: "#6b7280" },
};

const CAT_COLOR = {
  urgent: "#dc2626", followup: "#d97706", info: "#16a34a", spam: "#d1d5db",
};

export default function Home() {
  const { data: session, status } = useSession();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(null);
  const [draftDone, setDraftDone] = useState({});
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [acct, setAcct] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const gmailRes = await fetch("/api/gmail");
      if (!gmailRes.ok) throw new Error("Gmail fetch fejlede");
      const { threads } = await gmailRes.json();

      const triageRes = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threads }),
      });
      if (!triageRes.ok) throw new Error("AI triage fejlede");
      const { emails: triaged } = await triageRes.json();

      setEmails(triaged);
      setUpdatedAt(new Date().toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) fetchEmails();
  }, [session, fetchEmails]);

  const createDraft = async (email) => {
    setDraftLoading(email.id);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: email.id,
          sender: email.sender,
          subject: email.subject,
          summary: email.summary,
          acct: email.acct,
        }),
      });
      if (!res.ok) throw new Error("Draft fejlede");
      setDraftDone((d) => ({ ...d, [email.id]: true }));
    } catch (e) {
      alert("Kunne ikke oprette draft: " + e.message);
    } finally {
      setDraftLoading(null);
    }
  };

  const visible = emails
    .filter((e) => acct === "all" || e.acct === acct)
    .filter((e) => filter === "all" || e.category === filter);

  const counts = {
    total: emails.filter((e) => acct === "all" || e.acct === acct).length,
    urgent: emails.filter((e) => (acct === "all" || e.acct === acct) && e.category === "urgent").length,
    followup: emails.filter((e) => (acct === "all" || e.acct === acct) && e.category === "followup").length,
    info: emails.filter((e) => (acct === "all" || e.acct === acct) && ["info", "spam"].includes(e.category)).length,
  };

  if (status === "loading") return <div style={s.center}>Indlæser...</div>;

  if (!session) return (
    <div style={s.center}>
      <div style={s.loginBox}>
        <h1 style={s.logo}>Amaroq <span style={s.logoSub}>inbox</span></h1>
        <p style={s.loginText}>Log ind med din Google Workspace-konto for at fortsætte.</p>
        <button onClick={() => signIn("google")} style={s.loginBtn}>
          Log ind med Google
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Amaroq Inbox</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>

      <div style={s.page}>
        {/* Header */}
        <header style={s.header}>
          <div style={s.headerInner}>
            <h1 style={s.logo}>Amaroq <span style={s.logoSub}>inbox</span></h1>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {updatedAt && <span style={s.updated}>opdateret {updatedAt}</span>}
              <button onClick={fetchEmails} disabled={loading} style={s.refreshBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: loading ? "spin 1s linear infinite" : "none" }}>
                  <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                {loading ? "Henter..." : "Opdater"}
              </button>
              <button onClick={() => signOut()} style={s.signOutBtn}>Log ud</button>
            </div>
          </div>
        </header>

        <main style={s.main}>
          {error && <div style={s.error}>{error}</div>}

          {/* Stats */}
          <div style={s.statsGrid}>
            {[
              { label: "Emails", value: counts.total, color: "#1c1c1a" },
              { label: "Handling", value: counts.urgent, color: "#dc2626" },
              { label: "Opfølgning", value: counts.followup, color: "#d97706" },
              { label: "Info/spam", value: counts.info, color: "#16a34a" },
            ].map((stat) => (
              <div key={stat.label} style={s.statCard}>
                <div style={s.statLabel}>{stat.label}</div>
                <div style={{ ...s.statValue, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Account tabs */}
          <div style={s.tabRow}>
            {[["all", "Alle konti"], ["dk", "🇩🇰 .dk"], ["de", "🇩🇪 .de"]].map(([val, label]) => (
              <button key={val} onClick={() => setAcct(val)} style={acct === val ? s.tabActive : s.tab}>
                {label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div style={s.filterRow}>
            {[["all","Alle"], ["urgent","Handling"], ["followup","Opfølgning"], ["info","Info"], ["spam","Spam"]].map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)} style={filter === val ? s.pillActive : s.pill}>
                {label}
              </button>
            ))}
          </div>

          {/* Email list */}
          {loading && emails.length === 0 ? (
            <div style={s.emptyState}>Henter og analyserer emails...</div>
          ) : visible.length === 0 ? (
            <div style={s.emptyState}>Ingen emails i denne kategori</div>
          ) : (
            <div style={s.list}>
              {visible.map((email) => {
                const isOpen = expanded === email.id;
                const av = AVATAR[email.avatarClass] || AVATAR["av-x"];
                const bd = BADGE[email.badgeClass] || BADGE["bd-x"];
                const isDraftDone = draftDone[email.id];
                const isDraftLoading = draftLoading === email.id;

                return (
                  <div key={email.id} onClick={() => setExpanded(isOpen ? null : email.id)}
                    style={{ ...s.card, borderLeftColor: CAT_COLOR[email.category] || "#e0ddd6", opacity: email.category === "spam" ? 0.55 : 1 }}>
                    <div style={s.cardTop}>
                      <div style={{ ...s.avatar, background: av.bg, color: av.color }}>{email.initials}</div>
                      <div style={s.cardMeta}>
                        <div style={s.cardRow}>
                          <span style={s.cardSender}>{email.sender}</span>
                          <span style={s.cardDate}>{email.date}</span>
                        </div>
                        <div style={s.cardSubject}>{email.subject}</div>
                      </div>
                    </div>

                    {isOpen && (
                      <div style={s.cardBody}>
                        <p style={s.cardSummary}>{email.summary}</p>
                        <div style={s.actionRow}>
                          <button
                            onClick={(e) => { e.stopPropagation(); createDraft(email); }}
                            disabled={isDraftLoading || isDraftDone}
                            style={isDraftDone ? s.actionBtnDone : s.actionBtn}
                          >
                            {isDraftDone ? "✓ Draft oprettet i Gmail" : isDraftLoading ? "Opretter..." : "✏️ Opret draft-svar"}
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={s.badges}>
                      <span style={{ ...s.badge, background: bd.bg, color: bd.color }}>{email.badgeLabel}</span>
                      {email.tags?.map((t) => <span key={t} style={s.tagBadge}>{t}</span>)}
                      <span style={{ ...s.acctBadge, background: email.acct === "de" ? "#eff6ff" : "#f0fdf4", color: email.acct === "de" ? "#1e40af" : "#166534" }}>
                        {email.acct === "de" ? "🇩🇪 .de" : "🇩🇰 .dk"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #fafaf8; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </>
  );
}

const s = {
  page: { fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#fafaf8", color: "#1c1c1a" },
  center: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#fafaf8" },
  loginBox: { textAlign: "center", padding: "2rem" },
  loginText: { color: "#6b6960", fontSize: 15, marginBottom: "1.5rem", marginTop: "0.75rem" },
  loginBtn: { padding: "10px 28px", borderRadius: 10, border: "1px solid #e0ddd6", background: "#fff", fontSize: 15, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  logo: { fontFamily: "'DM Serif Display', serif", fontSize: 22, color: "#1c1c1a", letterSpacing: "-0.02em", fontWeight: 400 },
  logoSub: { fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#9a9890", fontWeight: 300, marginLeft: 6 },
  header: { borderBottom: "1px solid #e8e6e0", background: "#fff", padding: "0 24px" },
  headerInner: { maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 },
  updated: { fontSize: 12, color: "#b0aea8" },
  refreshBtn: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "6px 14px", borderRadius: 8, border: "1px solid #e0ddd6", background: "#fff", cursor: "pointer", color: "#1c1c1a", fontFamily: "'DM Sans', sans-serif" },
  signOutBtn: { fontSize: 13, padding: "6px 14px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "#9a9890", fontFamily: "'DM Sans', sans-serif" },
  main: { maxWidth: 720, margin: "0 auto", padding: "24px" },
  error: { background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 },
  statCard: { background: "#fff", border: "1px solid #eceae3", borderRadius: 10, padding: "14px 16px" },
  statLabel: { fontSize: 11, color: "#9a9890", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, fontWeight: 500 },
  statValue: { fontSize: 26, fontWeight: 300, lineHeight: 1 },
  tabRow: { display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" },
  tab: { fontSize: 13, padding: "5px 14px", borderRadius: 8, border: "1px solid #e0ddd6", background: "#fff", cursor: "pointer", color: "#6b6960", fontFamily: "'DM Sans', sans-serif" },
  tabActive: { fontSize: 13, padding: "5px 14px", borderRadius: 8, border: "1px solid #1c1c1a", background: "#1c1c1a", cursor: "pointer", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 },
  filterRow: { display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" },
  pill: { fontSize: 12, padding: "4px 12px", borderRadius: 999, border: "1px solid #e0ddd6", background: "transparent", cursor: "pointer", color: "#9a9890", fontFamily: "'DM Sans', sans-serif" },
  pillActive: { fontSize: 12, padding: "4px 12px", borderRadius: 999, border: "1px solid #1c1c1a", background: "#1c1c1a", cursor: "pointer", color: "#fff", fontFamily: "'DM Sans', sans-serif" },
  emptyState: { textAlign: "center", padding: "3rem", color: "#b0aea8", fontSize: 14 },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  card: { background: "#fff", border: "1px solid #eceae3", borderLeft: "3px solid", borderRadius: "0 10px 10px 0", padding: "14px 16px", cursor: "pointer", transition: "border-color 0.15s" },
  cardTop: { display: "flex", gap: 10, alignItems: "flex-start" },
  avatar: { width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, flexShrink: 0 },
  cardMeta: { flex: 1, minWidth: 0 },
  cardRow: { display: "flex", justifyContent: "space-between", gap: 8 },
  cardSender: { fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cardDate: { fontSize: 12, color: "#b0aea8", flexShrink: 0 },
  cardSubject: { fontSize: 13, color: "#6b6960", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 },
  cardBody: { marginTop: 12, paddingTop: 12, borderTop: "1px solid #eceae3" },
  cardSummary: { fontSize: 13, lineHeight: 1.6, color: "#3a3a38", marginBottom: 12 },
  actionRow: { display: "flex", gap: 8 },
  actionBtn: { fontSize: 12, padding: "5px 12px", borderRadius: 7, border: "1px solid #e0ddd6", background: "#fafaf8", cursor: "pointer", color: "#1c1c1a", fontFamily: "'DM Sans', sans-serif" },
  actionBtnDone: { fontSize: 12, padding: "5px 12px", borderRadius: 7, border: "1px solid #dcfce7", background: "#dcfce7", cursor: "default", color: "#166534", fontFamily: "'DM Sans', sans-serif" },
  badges: { display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" },
  badge: { fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 500 },
  tagBadge: { fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#f3f4f6", color: "#6b7280" },
  acctBadge: { fontSize: 11, padding: "2px 8px", borderRadius: 999, marginLeft: "auto" },
};
