/**
 * PriceAlert.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * A fully self-contained price-alert / stopper system for Vesper.
 *
 * EXPORTS
 * ───────
 * <PriceAlertProvider prices={...} onToast={...}>   ← wrap your app (or root)
 *   usePriceAlerts()                                ← hook: { alerts, addAlert, removeAlert }
 *   <PriceAlertForm  selectedStock={...} prices={...} onToast={...} />
 *   <PriceAlertList  symbol="AAPL"       prices={...} />
 *   <AlertToastStack />                             ← renders alert toasts (fixed overlay)
 *
 * HOW TO USE (see main.jsx / App.jsx for real wiring)
 * ───────────────────────────────────────────────────
 * 1. In main.jsx, wrap <App /> with <PriceAlertProvider>.
 * 2. In App.jsx, drop <AlertToastStack /> once anywhere inside the provider.
 * 3. In HomePage (right panel), render <PriceAlertForm> and <PriceAlertList>.
 */

import { createContext, useContext, useEffect, useRef, useState } from "react";

// ─── Context ──────────────────────────────────────────────────────────────────
const AlertCtx = createContext(null);

export function usePriceAlerts() {
  const ctx = useContext(AlertCtx);
  if (!ctx) throw new Error("usePriceAlerts must be inside <PriceAlertProvider>");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
/**
 * Props
 *   prices   { [symbol: string]: number }   live price map (update every tick)
 *   onToast  (msg: string, type: string) => void   fires yellow alert toasts
 */
export function PriceAlertProvider({ prices, onToast, children }) {
  const [alerts, setAlerts]   = useState([]);
  const [toasts, setToasts]   = useState([]);
  const fired                 = useRef(new Set());

  // Check alerts every time prices tick
  useEffect(() => {
    if (!prices || alerts.length === 0) return;
    alerts.forEach(a => {
      const cur = prices[a.symbol];
      if (cur === undefined) return;
      const hit = a.condition === "above" ? cur >= a.target : cur <= a.target;
      if (hit && !fired.current.has(a.id)) {
        fired.current.add(a.id);
        const dir = a.condition === "above" ? "▲ above" : "▼ below";
        const msg = `🔔 ${a.symbol} is $${cur.toFixed(2)} — ${dir} your $${a.target.toFixed(2)} alert!`;
        // push to internal toast stack
        pushToast(msg, "alert");
        // also bubble up so parent's toast system can show it
        onToast?.(msg, "alert");
      }
    });
  }, [prices]);

  function addAlert(symbol, target, condition) {
    setAlerts(prev => [...prev, { id: Date.now() + Math.random(), symbol, target, condition }]);
  }

  function removeAlert(id) {
    setAlerts(prev => prev.filter(a => a.id !== id));
    fired.current.delete(id);
  }

  function pushToast(msg, type) {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
  }

  function removeToast(id) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  return (
    <AlertCtx.Provider value={{ alerts, addAlert, removeAlert, toasts, removeToast }}>
      {children}
    </AlertCtx.Provider>
  );
}

// ─── AlertToastStack ──────────────────────────────────────────────────────────
/**
 * Drop this once anywhere inside <PriceAlertProvider>.
 * It renders the floating alert toast overlay automatically.
 */
export function AlertToastStack() {
  const { toasts, removeToast } = usePriceAlerts();
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 10000,
      display: "flex", flexDirection: "column", gap: 8,
      pointerEvents: "none",
    }}>
      {toasts.map(t => (
        <AlertToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function AlertToastItem({ toast, onClose }) {
  useEffect(() => {
    const ms = toast.type === "alert" ? 7000 : 3000;
    const t = setTimeout(onClose, ms);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e",
      padding: "12px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500,
      boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
      display: "flex", alignItems: "flex-start", gap: 8,
      minWidth: 260, maxWidth: 360,
      pointerEvents: "all",
      animation: "pa-slide-in 0.2s ease",
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>🔔</span>
      <span style={{ flex: 1, lineHeight: 1.45 }}>{toast.msg}</span>
      <button onClick={onClose} style={{
        background: "none", border: "none", cursor: "pointer",
        color: "#92400e", opacity: 0.45, fontSize: 13, padding: 0, flexShrink: 0,
      }}>✕</button>
    </div>
  );
}

// ─── PriceAlertForm ───────────────────────────────────────────────────────────
/**
 * Renders the "Set Price Alert" form card for the currently selected stock.
 *
 * Props
 *   selectedStock  { symbol, name }
 *   prices         { [symbol]: number }
 *   onToast        (msg, type) => void   for form-level feedback (success/error)
 */
export function PriceAlertForm({ selectedStock, prices, onToast }) {
  const { addAlert, alerts } = usePriceAlerts();
  const [inputPrice, setInputPrice]   = useState("");
  const [condition,  setCondition]    = useState("above");

  const symbol   = selectedStock?.symbol ?? "";
  const curPrice = prices?.[symbol] ?? 0;

  function handleSet() {
    const target = parseFloat(inputPrice);
    if (!target || target <= 0) { onToast?.("Enter a valid target price.", "error"); return; }
    addAlert(symbol, target, condition);
    setInputPrice("");
    onToast?.(`Alert set: ${symbol} ${condition} $${target.toFixed(2)}`, "success");
  }

  const QUICK = [
    { label: "+2%",  mult: 1.02 },
    { label: "+5%",  mult: 1.05 },
    { label: "+10%", mult: 1.10 },
    { label: "−2%",  mult: 0.98 },
    { label: "−5%",  mult: 0.95 },
    { label: "−10%", mult: 0.90 },
  ];

  const activeCount = alerts.filter(a => a.symbol === symbol).length;

  return (
    <>
      {/* Inject keyframe once */}
      <style>{`
        @keyframes pa-slide-in {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          <span style={{ fontSize: 15 }}>🔔</span>
          <span style={s.headerTitle}>Price Alert — {symbol}</span>
          {activeCount > 0 && (
            <span style={s.badge}>{activeCount} active</span>
          )}
        </div>

        <div style={s.body}>
          <p style={s.desc}>
            Notify me when <strong>{symbol}</strong> goes:
          </p>

          {/* Above / Below */}
          <div style={s.condRow}>
            {["above", "below"].map(c => (
              <button key={c} onClick={() => setCondition(c)} style={{
                ...s.condBtn,
                borderColor: condition === c ? (c === "above" ? "#16a34a" : "#dc2626") : "#e5e7eb",
                background:  condition === c ? (c === "above" ? "#f0fdf4" : "#fef2f2") : "#fff",
                color:       condition === c ? (c === "above" ? "#16a34a" : "#dc2626") : "#6b7280",
              }}>
                {c === "above" ? "▲ Above" : "▼ Below"}
              </button>
            ))}
          </div>

          {/* Target price */}
          <div>
            <div style={s.label}>Target Price ($)</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="number"
                value={inputPrice}
                onChange={e => setInputPrice(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSet()}
                placeholder={`e.g. ${(curPrice * (condition === "above" ? 1.05 : 0.95)).toFixed(2)}`}
                style={s.input}
              />
              <button onClick={handleSet} style={s.setBtn}>Set Alert</button>
            </div>
          </div>

          {/* Quick % shortcuts */}
          <div>
            <div style={s.label}>Quick Set</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {QUICK.map(({ label, mult }) => (
                <button key={label} onClick={() => {
                  setInputPrice((curPrice * mult).toFixed(2));
                  setCondition(mult >= 1 ? "above" : "below");
                }} style={{
                  ...s.quickBtn,
                  color: mult >= 1 ? "#16a34a" : "#dc2626",
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── PriceAlertList ───────────────────────────────────────────────────────────
/**
 * Shows all active alerts for a given symbol.
 * Pass symbol="*" to show all alerts across every stock.
 *
 * Props
 *   symbol   string
 *   prices   { [symbol]: number }
 */
export function PriceAlertList({ symbol, prices }) {
  const { alerts, removeAlert } = usePriceAlerts();
  const visible = symbol === "*" ? alerts : alerts.filter(a => a.symbol === symbol);

  return (
    <div style={s.listCard}>
      <div style={s.listHeader}>
        <span style={s.listTitle}>Active Alerts</span>
        <span style={s.listBadge}>{visible.length} set</span>
      </div>

      {visible.length === 0 ? (
        <div style={s.listEmpty}>No alerts for this stock yet.</div>
      ) : (
        visible.map(a => {
          const cur = prices?.[a.symbol] ?? 0;
          const hit = a.condition === "above" ? cur >= a.target : cur <= a.target;
          return (
            <div key={a.id} style={{ ...s.alertRow, background: hit ? "#fffbeb" : "#fff" }}>
              <div>
                <div style={s.alertSymbol}>
                  {a.symbol}{" "}
                  <span style={{ color: a.condition === "above" ? "#16a34a" : "#dc2626", fontSize: 10 }}>
                    {a.condition === "above" ? "▲ above" : "▼ below"} ${a.target.toFixed(2)}
                  </span>
                </div>
                <div style={s.alertSub}>
                  Now: ${cur.toFixed(2)}{hit ? " · ⚡ Triggered!" : " · Watching…"}
                </div>
              </div>
              <button onClick={() => removeAlert(a.id)} style={s.removeBtn}>✕</button>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  // Form card
  card:        { border: "1px solid #fcd34d", borderRadius: 12, overflow: "hidden" },
  header:      { padding: "13px 16px", borderBottom: "1px solid #fcd34d", background: "#fffbeb", display: "flex", alignItems: "center", gap: 7 },
  headerTitle: { fontSize: 12, fontWeight: 600, color: "#92400e", textTransform: "uppercase", letterSpacing: 0.5, flex: 1 },
  badge:       { fontSize: 11, background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d", padding: "1px 8px", borderRadius: 20, fontWeight: 600 },
  body:        { padding: 16, background: "#fffbeb", display: "flex", flexDirection: "column", gap: 12 },
  desc:        { fontSize: 12, color: "#78350f", lineHeight: 1.4 },
  condRow:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  condBtn:     { padding: "8px", borderRadius: 7, border: "1px solid", fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" },
  label:       { fontSize: 10, color: "#92400e", fontWeight: 600, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 },
  input:       { flex: 1, padding: "8px 10px", border: "1px solid #fcd34d", borderRadius: 7, fontFamily: "'DM Mono', monospace", fontSize: 13, outline: "none", color: "#111", background: "#fff", width: "100%" },
  setBtn:      { padding: "8px 14px", borderRadius: 7, border: "none", background: "#d97706", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  quickBtn:    { padding: "3px 9px", borderRadius: 6, border: "1px solid #fcd34d", background: "#fff", fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontWeight: 600 },

  // Alert list
  listCard:    { border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" },
  listHeader:  { padding: "13px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" },
  listTitle:   { fontSize: 12, fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: 0.5 },
  listBadge:   { fontSize: 11, background: "#eff6ff", color: "#2563eb", padding: "2px 8px", borderRadius: 20, fontWeight: 600 },
  listEmpty:   { padding: 16, fontSize: 12, color: "#9ca3af", textAlign: "center", background: "#fff" },
  alertRow:    { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #f3f4f6" },
  alertSymbol: { fontSize: 12, fontWeight: 600, fontFamily: "'DM Mono', monospace", color: "#111" },
  alertSub:    { fontSize: 10, color: "#9ca3af", marginTop: 2 },
  removeBtn:   { background: "none", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer", color: "#9ca3af", fontSize: 11, padding: "3px 8px" },
};
