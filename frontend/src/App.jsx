import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Send, Paperclip, Plus, Trash2, X, ChevronDown, ChevronUp,
  Zap, BookOpen, FileSearch, Eye, RefreshCw, Sparkles, CheckCircle, LogOut, User as UserIcon,
  Download
} from "lucide-react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Automatically use Render backend URL in production, fallback to localhost for dev
const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:8000" : "");

mermaid.initialize({ 
  startOnLoad: false, 
  theme: 'base', 
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
  suppressError: true,
  themeVariables: {
    primaryColor: '#1e293b',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#6366f1',
    lineColor: '#94a3b8',
    secondaryColor: '#334155',
    tertiaryColor: '#0f172a',
    mainBkg: '#1e293b',
    nodeBorder: '#6366f1',
    clusterBkg: '#0f172a',
    titleColor: '#10b981',
    edgeLabelBackground: '#0f172a',
    nodeTextColor: '#f8fafc'
  }
});

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function Mermaid({ chart }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (!chart) return;
    
    let isMounted = true;
    
    const renderDiagram = async () => {
      try {
        if (isMounted) {
          setError(null);
          setSvg("");
        }
        
        let cleanChart = chart.replace(/```mermaid/g, "").replace(/```/g, "").trim();
        cleanChart = cleanChart.replace(/\|([^|]+)\|>/g, '|$1|').replace(/\|>/g, '|');

        const lines = cleanChart.split("\n");
        const firstRealLine = lines.find(l => {
          const t = l.trim();
          return t && !t.startsWith("%%") && !t.startsWith("---");
        });

        const validTypes = /^(graph|flowchart|sequenceDiagram|pie|gantt|classDiagram|stateDiagram|erDiagram|journey|gitGraph|mindmap|timeline|block-beta|architecture|packet|kanban|zenuml)/i;
        
        if (!firstRealLine || !validTypes.test(firstRealLine.trim())) {
            cleanChart = 'graph TD\n' + cleanChart;
        }

        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
        const { svg: generatedSvg } = await mermaid.render(id, cleanChart);
        
        if (isMounted) {
          setSvg(generatedSvg);
        }
      } catch (err) {
        console.error("Mermaid Render Error:", err);
        if (isMounted) setError(true);
      }
    };

    renderDiagram();
    return () => { isMounted = false; };
  }, [chart]);

  if (error) {
    return (
      <div style={{ 
        color: "#f87171", fontSize: "11px", background: "rgba(239,68,68,0.05)", 
        padding: "10px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.15)", margin: "10px 0"
      }}>
        <div style={{ fontWeight: 600 }}>Visual rendering failed.</div>
        <pre style={{ fontSize: "10px", marginTop: "5px", opacity: 0.8, overflowX: "auto" }}>{chart}</pre>
      </div>
    );
  }

  if (!svg) return <div className="spinner" style={{ margin: "10px auto", width: 20, height: 20 }} />;

  return (
    <>
      <div 
        className="mermaid-container"
        onClick={() => setIsZoomed(true)}
        style={{ 
          margin: "12px 0", background: "rgba(30,41,59,0.7)", padding: "16px", 
          borderRadius: "10px", border: "1px solid var(--border2)", width: "100%", 
          overflowX: "auto", minHeight: "50px", cursor: "zoom-in"
        }}
      >
          <div 
              style={{ width: "100%", display: "flex", justifyContent: "center" }}
              dangerouslySetInnerHTML={{ __html: svg }} 
          />
      </div>

      <AnimatePresence>
        {isZoomed && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsZoomed(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.95)",
              backdropFilter: "blur(10px)", display: "flex", alignItems: "center", 
              justifyContent: "center", padding: "40px", cursor: "zoom-out"
            }}
          >
            <div 
              className="zoomed-mermaid"
              style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
              dangerouslySetInnerHTML={{ __html: svg }} 
            />
            <button 
              style={{ position: "absolute", top: 20, right: 20, background: "var(--bg2)", border: "1px solid var(--border2)", color: "white", padding: "8px", borderRadius: "50%", cursor: "pointer" }}
            >
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use(config => {
  const token = sessionStorage.getItem("sanctuary_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── STYLES ──────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0f172a; --bg2: #1e293b; --bg3: #0d1424; --mint: #10b981; --mint-dim: rgba(16,185,129,0.12);
    --indigo: #6366f1; --indigo-dim: rgba(99,102,241,0.14); --slate: #334155; --text: #f8fafc;
    --text2: #94a3b8; --text3: #64748b; --glass: rgba(15,23,42,0.75); --glass2: rgba(30,41,59,0.65);
    --border: rgba(148,163,184,0.1); --border2: rgba(148,163,184,0.18); --font: 'Inter', sans-serif;
    --radius: 12px; --radius-sm: 8px;
  }
  html, body { height: 100%; overflow: hidden; background: var(--bg); font-family: var(--font); color: var(--text); }
  .app { display: flex; height: 100vh; width: 100vw; overflow: hidden; }
  .sidebar { width: 240px; background: var(--glass); backdrop-filter: blur(12px); border-right: 1px solid var(--border); display: flex; flex-direction: column; }
  .sidebar-top { padding: 18px 14px; border-bottom: 1px solid var(--border); }
  .logo { display: flex; align-items: center; gap: 9px; margin-bottom: 14px; font-weight: 600; font-size: 14px; }
  .logo-mark { width: 30px; height: 30px; border-radius: 9px; background: linear-gradient(135deg, #10b981, #6366f1); display: flex; align-items: center; justify-content: center; color: white; }
  .new-btn { width: 100%; padding: 8px; background: var(--mint-dim); border: 1px solid rgba(16,185,129,0.28); border-radius: var(--radius-sm); color: var(--mint); cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 12px; transition: 0.2s; }
  .new-btn:hover { background: rgba(16,185,129,0.2); }
  .sessions-scroll { flex: 1; overflow-y: auto; padding: 8px; }
  .sess-item { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: var(--radius-sm); cursor: pointer; transition: 0.2s; margin-bottom: 2px; }
  .sess-item.active { background: var(--mint-dim); color: var(--mint); }
  .sess-name { font-size: 12px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sess-del { opacity: 0; background: none; border: none; color: var(--text3); cursor: pointer; }
  .sess-item:hover .sess-del { opacity: 1; }
  .main { flex: 1; display: flex; flex-direction: column; position: relative; }
  .topbar { padding: 12px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
  .msgs { flex: 1; overflow-y: auto; padding: 20px 40px 120px; }
  .msg-row { display: flex; gap: 12px; margin-bottom: 24px; align-items: flex-start; }
  .msg-row.user { flex-direction: row-reverse; }
  .bubble-wrap { max-width: 80%; display: flex; flex-direction: column; gap: 6px; }
  .bubble { padding: 12px 16px; border-radius: 18px; font-size: 14px; line-height: 1.5; width: fit-content; max-width: 100%; }
  .bubble.ai { background: rgba(30,41,59,0.4); border: 1px solid var(--border2); color: #e2e8f0; border-bottom-left-radius: 4px; }
  .bubble.user { background: var(--indigo-dim); border: 1px solid rgba(99,102,241,0.2); color: #f8fafc; border-bottom-right-radius: 4px; align-self: flex-end; }
  .av { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0; margin-top: 2px; }
  .av.ai { background: var(--mint-dim); color: var(--mint); border: 1px solid rgba(16,185,129,0.2); }
  .av.user { background: var(--indigo-dim); color: var(--indigo); border: 1px solid rgba(99,102,241,0.2); }
  .input-zone { position: absolute; bottom: 0; left: 0; right: 0; padding: 20px 40px; background: linear-gradient(transparent, var(--bg) 40%); }
  .input-bar { display: flex; align-items: center; gap: 10px; background: var(--glass2); backdrop-filter: blur(10px); border: 1px solid var(--border2); border-radius: 12px; padding: 6px 12px; }
  .input-bar textarea { flex: 1; background: none; border: none; outline: none; color: white; resize: none; font-family: inherit; max-height: 150px; overflow-y: auto; padding: 8px 0; line-height: 1.4; }
  .clip-btn, .send-btn { background: none; border: none; color: var(--text3); cursor: pointer; padding: 4px; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
  .send-btn { color: var(--mint); }
  .send-btn:hover { transform: scale(1.1); }
  
  .auth-container { height: 100vh; display: flex; align-items: center; justify-content: center; }
  .auth-card { background: var(--bg2); padding: 40px; border-radius: 20px; width: 380px; border: 1px solid var(--border2); }
  .auth-input { width: 100%; background: var(--bg3); border: 1px solid var(--border); padding: 12px; border-radius: 10px; color: white; margin-top: 8px; outline: none; }
  .auth-input:focus { border-color: var(--mint); }
  
  .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); }
  .modal { background: var(--bg2); padding: 24px; border-radius: 16px; width: 400px; border: 1px solid var(--border2); }
  .drop-zone { border: 2px dashed var(--border); border-radius: 12px; padding: 30px; text-align: center; cursor: pointer; margin: 16px 0; transition: 0.2s; }
  .drop-zone:hover { border-color: var(--mint); background: var(--mint-dim); }
  
  .grade-card { background: var(--bg3); padding: 16px; border-radius: 12px; margin-top: 12px; border: 1px solid var(--border); }
  .sources { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
  .src-tag { font-size: 11px; padding: 4px 8px; background: var(--indigo-dim); color: var(--indigo); border-radius: 4px; border: 1px solid rgba(99,102,241,0.2); }
  
  .overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.8); backdrop-filter: blur(8px); z-index: 200; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: var(--mint); font-weight: 500; }
  
  .typing { display: flex; gap: 4px; padding: 12px 16px; background: rgba(30,41,59,0.4); border-radius: 18px; width: fit-content; border: 1px solid var(--border2); border-bottom-left-radius: 4px; }
  .dot { width: 5px; height: 5px; background: var(--mint); border-radius: 50%; animation: bounce 1.4s infinite ease-in-out; }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce { 0%, 80%, 100% { transform: scale(0); opacity: 0.3; } 40% { transform: scale(1); opacity: 1; } }
  
  /* Toggle Switch */
  .toggle { position: relative; width: 38px; height: 21px; background: var(--slate); border-radius: 11px; cursor: pointer; transition: background 0.2s; }
  .toggle.on { background: var(--mint); }
  .toggle::after { content: ''; position: absolute; top: 3px; left: 3px; width: 15px; height: 15px; border-radius: 50%; background: white; transition: transform 0.2s; }
  .toggle.on::after { transform: translateX(17px); }
  
  /* Drawer */
  .drawer-overlay { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.4); backdrop-filter: blur(3px); }
  .drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 340px; z-index: 51; background: #111827; border-left: 1px solid var(--border2); display: flex; flex-direction: column; box-shadow: -10px 0 30px rgba(0,0,0,0.2); }
  .drawer-body { flex: 1; overflow-y: auto; padding: 20px; }
  .d-sec { margin-bottom: 24px; }
  .d-lbl { font-size: 10px; text-transform: uppercase; color: var(--text3); margin-bottom: 12px; letter-spacing: 1px; }
  .style-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--indigo-dim); color: var(--indigo); border-radius: 20px; font-size: 12px; border: 1px solid rgba(99,102,241,0.2); }
  
  .spinner { width: 30px; height: 30px; border: 3px solid rgba(16,185,129,0.1); border-top-color: var(--mint); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 20px auto; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  
  /* Prevent Mermaid from injecting huge error overlays */
  #dmermaid { display: none !important; }
  .mermaid-container svg { max-width: 100% !important; height: auto !important; }
  .zoomed-mermaid svg { max-width: 90vw !important; max-height: 90vh !important; width: auto !important; height: auto !important; }
  
  /* Force text visibility inside Mermaid SVGs */
  .mermaid-container svg text, .zoomed-mermaid svg text { fill: #f8fafc !important; font-family: 'Inter', sans-serif !important; }
  .mermaid-container svg .edgeLabel text, .zoomed-mermaid svg .edgeLabel text { fill: #f8fafc !important; }
  .mermaid-container svg .nodeLabel, .zoomed-mermaid svg .nodeLabel { color: #f8fafc !important; }
  
  .markdown-content { overflow-wrap: break-word; }
  .markdown-content h1, .markdown-content h2, .markdown-content h3 { margin: 12px 0 6px; font-size: 1.1em; color: var(--mint); }
  .markdown-content p { margin-bottom: 8px; white-space: pre-wrap; }
  .markdown-content p:last-child { margin-bottom: 0; }
  .markdown-content ul, .markdown-content ol { margin-bottom: 12px; padding-left: 20px; }
  .markdown-content li { margin-bottom: 6px; }
  .markdown-content code { background: rgba(0,0,0,0.3); padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
  .markdown-content pre { background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; overflow-x: auto; margin: 12px 0; border: 1px solid var(--border); }
  .markdown-content table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  .markdown-content th, .markdown-content td { border: 1px solid var(--border); padding: 8px; text-align: left; }
  .markdown-content th { background: rgba(16,185,129,0.05); }
  .download-btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: var(--mint); color: white; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; margin-top: 12px; transition: 0.2s; }
  .download-btn:hover { opacity: 0.9; transform: translateY(-1px); }
`;

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function InsightsDrawer({ sessionId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/profile/${sessionId}`).then(r => setProfile(r.data)).finally(() => setLoading(false));
  }, [sessionId]);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <motion.div className="drawer" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}>
        <div style={{ padding: "20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Brain size={18} color="var(--mint)" /> <span style={{ fontWeight: 600 }}>Study Insights</span></div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}><X size={18} /></button>
        </div>
        <div className="drawer-body">
          {loading ? <div className="spinner" /> : (
            <>
              <div className="d-sec">
                <div className="d-lbl">Knowledge Level</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{profile?.levels ? (Object.entries(profile.levels).find(([k,v])=>v>0)?.[0] || "Beginner") : "Beginner"}</div>
              </div>
              <div className="d-sec">
                <div className="d-lbl">Learning Style</div>
                <div className="style-pill"><Eye size={12} /> {profile?.style || "Standard"}</div>
              </div>
              <div className="d-sec">
                <div className="d-lbl">Pain Points</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {profile?.struggles?.length ? profile.struggles.map(s => <div key={s} style={{ fontSize: 11, padding: "4px 8px", background: "rgba(239,68,68,0.1)", color: "#f87171", borderRadius: 4 }}>{s}</div>) : <div style={{ fontSize: 12, color: "var(--text3)" }}>None yet</div>}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}

function CircularGauge({ score, max = 10 }) {
  const r = 18, circ = 2 * Math.PI * r, dash = (score / max) * circ;
  return (
    <div style={{ position: "relative", width: 40, height: 40 }}>
      <svg viewBox="0 0 40 40" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(16,185,129,0.1)" strokeWidth="3" />
        <circle cx="20" cy="20" r={r} fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#10b981" }}>{score}</div>
    </div>
  );
}

function UploadModal({ sessionId, onClose, setIsUploading }) {
  const [files, setFiles] = useState([]);
  const [pastPaper, setPastPaper] = useState(false);
  const fileInputRef = useRef();

  const handleUpload = async () => {
    if (!files.length) return;
    setIsUploading(true); onClose();
    try {
      const form = new FormData();
      files.forEach(f => form.append("files", f));
      form.append("session_id", sessionId);
      form.append("is_past_paper", pastPaper);
      await api.post("/upload", form);
    } catch (err) { console.error(err); }
    finally { setIsUploading(false); }
  };

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div className="modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}><Paperclip size={18} /> Upload Materials</div>
        <div className="drop-zone" onClick={() => fileInputRef.current.click()}>
          <BookOpen size={32} style={{ color: "var(--text3)", marginBottom: 12 }} />
          <div style={{ fontSize: 13 }}>Click to browse files</div>
          {files.map(f => <div key={f.name} style={{ fontSize: 11, color: "var(--mint)", marginTop: 4 }}>{f.name}</div>)}
          <input type="file" multiple ref={fileInputRef} style={{ display: "none" }} onChange={e => setFiles(Array.from(e.target.files))} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, background: "var(--bg3)", padding: "12px", borderRadius: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Past Paper Mode</div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>Treat as exam practice</div>
          </div>
          <div className={`toggle ${pastPaper ? "on" : ""}`} onClick={() => setPastPaper(!pastPaper)} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="new-btn" style={{ width: "auto", background: "none", border: "none" }} onClick={onClose}>Cancel</button>
          <button className="new-btn" style={{ width: "auto" }} onClick={handleUpload}>Upload {files.length || ""} Files</button>
        </div>
      </motion.div>
    </div>
  );
}

function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: "", email: "", password: "", repeatPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const passRules = {
    length: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    lower: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[@$!%*?&]/.test(formData.password),
    match: formData.password === formData.repeatPassword && formData.password !== ""
  };

  const isFormValid = isLogin ? (formData.username && formData.password) : (
    formData.username && formData.email && Object.values(passRules).every(v => v)
  );

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setError("");
    if (!isFormValid) return;
    
    setLoading(true);
    try {
      if (isLogin) {
        const params = new URLSearchParams();
        params.append("username", formData.username);
        params.append("password", formData.password);
        const { data } = await api.post("/login", params);
        sessionStorage.setItem("sanctuary_token", data.access_token);
        onLogin();
      } else {
        const form = new FormData();
        form.append("username", formData.username);
        form.append("email", formData.email);
        form.append("password", formData.password);
        await api.post("/signup", form);
        
        // Auto-login after successful signup
        const params = new URLSearchParams();
        params.append("username", formData.username);
        params.append("password", formData.password);
        const { data } = await api.post("/login", params);
        sessionStorage.setItem("sanctuary_token", data.access_token);
        onLogin();
      }
    } catch (err) { 
      console.error("Auth Error Details:", err.response || err);
      setError(err.response?.data?.detail || "Auth Error - Please check logs"); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ width: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="logo" style={{ justifyContent: "center" }}><div className="logo-mark"><BookOpen size={20} /></div>Study Sanctuary</div>
          <h2 style={{ fontSize: 20, marginTop: 8 }}>{isLogin ? "Welcome Back" : "Sign Up"}</h2>
        </div>
        {error && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 16, textAlign: "center", background: "rgba(239,68,68,0.1)", padding: 8, borderRadius: 8 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text3)", letterSpacing: 0.5 }}>{isLogin ? "Username or Email" : "Username"}</label>
            <input className="auth-input" type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
          </div>
          {!isLogin && <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text3)", letterSpacing: 0.5 }}>Email Address</label>
            <input className="auth-input" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
          </div>}
          <div style={{ marginBottom: 12, position: "relative" }}>
            <label style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text3)", letterSpacing: 0.5 }}>Password</label>
            <input className="auth-input" type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 10, bottom: 10, background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}>
                {showPassword ? <Eye size={16} /> : <Eye size={16} style={{ opacity: 0.5 }} />}
            </button>
          </div>
          {!isLogin && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text3)", letterSpacing: 0.5 }}>Repeat Password</label>
                <input className="auth-input" type={showPassword ? "text" : "password"} value={formData.repeatPassword} onChange={e => setFormData({...formData, repeatPassword: e.target.value})} required />
                {!passRules.match && formData.repeatPassword && <div style={{ fontSize: 10, color: "#f87171", marginTop: 4 }}>Passwords do not match</div>}
              </div>
              <div style={{ background: "var(--bg3)", padding: 12, borderRadius: 10, marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 8, fontWeight: 600 }}>PASSWORD REQUIREMENTS</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <Rule check={passRules.length} text="8+ Characters" />
                  <Rule check={passRules.upper} text="1 Uppercase" />
                  <Rule check={passRules.lower} text="1 Lowercase" />
                  <Rule check={passRules.number} text="1 Number" />
                  <Rule check={passRules.special} text="1 Special (@$!)" />
                  <Rule check={passRules.match} text="Matches" />
                </div>
              </div>
            </>
          )}
          <button 
            className="new-btn" 
            type="submit"
            disabled={!isFormValid || loading} 
            style={{ 
              padding: 12, 
              fontSize: 14, 
              fontWeight: 600, 
              opacity: (isFormValid && !loading) ? 1 : 0.5,
              justifyContent: "center"
            }}
          >
            {loading ? <RefreshCw className="spinner" size={16} /> : (isLogin ? "Login" : "Create Account")}
          </button>
        </form>
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--text3)" }}>
          {isLogin ? "No account?" : "Have an account?"} <span style={{ color: "var(--mint)", cursor: "pointer", fontWeight: 500 }} onClick={() => setIsLogin(!isLogin)}>{isLogin ? "Sign up" : "Login"}</span>
        </div>
      </div>
    </div>
  );
}

function Rule({ check, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: check ? "var(--mint)" : "var(--text3)" }}>
      {check ? <CheckCircle size={10} /> : <div style={{ width: 10, height: 10, borderRadius: "50%", border: "1px solid var(--text3)" }} />}
      {text}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!sessionStorage.getItem("sanctuary_token"));
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState(`study_${Date.now()}`);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const bottomRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  useEffect(() => {
    if (isAuthenticated) {
      api.get("/me").then(r => setUser(r.data)).catch(() => logout());
      api.get("/sessions").then(r => setSessions(r.data.sessions || [])).catch(() => {});
    }
  }, [isAuthenticated]);

  const logout = () => { sessionStorage.removeItem("sanctuary_token"); setIsAuthenticated(false); };

  const switchSession = async (id) => {
    setSessionId(id); setMessages([]);
    try { const { data } = await api.get(`/session/${id}/history`); setMessages(data); } catch (_) {}
  };

  const deleteSession = async (e, id) => {
    e.stopPropagation();
    try { await api.delete(`/session/${id}`); setSessions(s => s.filter(x => x.id !== id)); if (sessionId === id) { setSessionId(`study_${Date.now()}`); setMessages([]); } } catch (_) {}
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming) return;
    const text = input; setInput("");
    setMessages(m => [...m, { id: Date.now(), role: "user", content: text }]);
    setStreaming(true);

    if (messages.length === 0) setSessions(prev => [{ id: sessionId, name: text.slice(0, 30) }, ...prev]);

    const aiId = `ai_${Date.now()}`;
    let aiMessageAdded = false;

    try {
      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${sessionStorage.getItem("sanctuary_token")}` },
        body: JSON.stringify({ session_id: sessionId, message: text }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        if (!aiMessageAdded) {
            setMessages(m => [...m, { id: aiId, role: "ai", content: "" }]);
            aiMessageAdded = true;
        }

        buffer += decoder.decode(value);
        let parts = buffer.split("\n\n");
        buffer = parts.pop();
        for (const part of parts) {
          if (part.startsWith("data:")) {
            const data = part.slice(5).replaceAll("<BR>", "\n");
            if (data.startsWith("[METADATA]")) {
              const meta = JSON.parse(data.slice(10));
              setMessages(m => m.map(msg => msg.id === aiId ? { ...msg, ...meta } : msg));
            } else {
              setMessages(m => m.map(msg => msg.id === aiId ? { ...msg, content: msg.content + data } : msg));
            }
          }
        }
      }
    } catch (err) { console.error(err); }
    finally { setStreaming(false); }
  }, [input, sessionId, streaming, messages.length]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (!isAuthenticated) return <><style>{STYLES}</style><AuthPage onLogin={() => setIsAuthenticated(true)} /></>;

  return (
    <>
      <style>{STYLES}</style>
      <div className="app">
        <div className="sidebar">
          <div className="sidebar-top">
            <div className="logo"><div className="logo-mark"><BookOpen size={16} /></div>Study<span>Sanctuary</span></div>
            <button className="new-btn" onClick={() => { setSessionId(`study_${Date.now()}`); setMessages([]); }}><Plus size={14} /> New Session</button>
          </div>
          <div className="sessions-scroll">
            {sessions.map(s => (
              <div key={s.id} className={`sess-item ${s.id === sessionId ? "active" : ""}`} onClick={() => switchSession(s.id)}>
                <div className="sess-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: s.id === sessionId ? "var(--mint)" : "var(--text3)" }} />
                <div className="sess-name">{s.name}</div>
                <button className="sess-del" onClick={e => deleteSession(e, s.id)}><Trash2 size={11} /></button>
              </div>
            ))}
          </div>
          <div style={{ padding: 16, borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 6, color: "var(--text2)" }}><UserIcon size={12} /> {user?.username}</div>
            <button className="new-btn" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", borderColor: "rgba(239,68,68,0.2)" }} onClick={logout}><LogOut size={12} /> Sign Out</button>
          </div>
        </div>

        <div className="main">
          <div className="topbar">
            <div style={{ fontSize: 14, fontWeight: 600 }}>{sessions.find(s => s.id === sessionId)?.name || "New Study Session"}</div>
            <button className="new-btn" style={{ width: "auto", background: "none", border: "none" }} onClick={() => setShowDrawer(true)}><Brain size={18} color="var(--text3)" /></button>
          </div>

          <div className="msgs">
            {messages.length === 0 ? (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                <Sparkles size={48} color="var(--mint)" />
                <h1 style={{ marginTop: 24, fontSize: 28 }}>Welcome, <span>{user?.username}</span></h1>
                <p style={{ color: "var(--text3)", marginTop: 8, maxWidth: 400, fontSize: 14 }}>Your personal study sanctuary is ready. Upload papers or ask a question to begin.</p>
              </div>
            ) : (
              messages.map(m => (
                <div key={m.id} className={`msg-row ${m.role === "user" ? "user" : "ai"}`}>
                  <div className={`av ${m.role === "user" ? "user" : "ai"}`}>{m.role === "user" ? user?.username?.[0].toUpperCase() : "AI"}</div>
                  <div className="bubble-wrap">
                    <div className={`bubble ${m.role === "user" ? "user" : "ai"}`}>
                      <div className="markdown-content">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            pre({ children, ...props }) {
                              const isMermaid = children && children.props && children.props.className && children.props.className.includes("language-mermaid");
                              if (isMermaid) return <>{children}</>;
                              return <pre {...props}>{children}</pre>;
                            },
                            code({ className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || '');
                              const isMermaid = match && match[1] === 'mermaid';
                              const content = String(children).replace(/\n$/, '');
                              
                              if (isMermaid) {
                                return <Mermaid chart={content} />;
                              }
                              return <code className={className} {...props}>{children}</code>;
                            }
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                      {m.score != null && <div className="grade-card"><div style={{ display: "flex", gap: 12, alignItems: "center" }}><CircularGauge score={m.score} /><div style={{ fontSize: 13, fontWeight: 600 }}>Evaluation Result</div></div><div style={{ marginTop: 10, fontSize: 13, color: "var(--text2)" }}>{m.feedback}</div></div>}
                      {m.file_url && (
                        <a href={`${API_BASE}${m.file_url}`} target="_blank" rel="noreferrer" className="download-btn">
                          <Download size={16} /> Download {m.file_name || "Generated Document"}
                        </a>
                      )}
                    </div>
                    {m.sources?.length > 0 && <div className="sources">{m.sources.map((s, i) => <div key={i} className="src-tag">📄 {typeof s === 'string' ? s : s.label}</div>)}</div>}
                  </div>
                </div>
              ))
            )}
            {streaming && messages.length > 0 && messages[messages.length - 1].role === "user" && (
              <div className="msg-row ai">
                <div className="av ai">AI</div>
                <div className="typing">
                  <div className="dot" />
                  <div className="dot" />
                  <div className="dot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="input-zone">
            <div className="input-bar">
              <button className="clip-btn" onClick={() => setShowUpload(true)}><Paperclip size={18} /></button>
              <textarea ref={inputRef} placeholder="Ask your sanctuary..." rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()} />
              <button className="send-btn" onClick={sendMessage}><Send size={18} /></button>
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>{showUpload && <UploadModal sessionId={sessionId} onClose={() => setShowUpload(false)} setIsUploading={setIsUploading} />}</AnimatePresence>
      <AnimatePresence>{showDrawer && <InsightsDrawer sessionId={sessionId} onClose={() => setShowDrawer(false)} />}</AnimatePresence>
      {isUploading && <div className="overlay"><div className="spinner" /><div>Indexing Knowledge...</div></div>}
    </>
  );
}
