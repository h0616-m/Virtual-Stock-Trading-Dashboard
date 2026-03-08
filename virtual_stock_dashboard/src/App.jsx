import { useState, useEffect, useRef } from "react";
import {
  PriceAlertForm,
  PriceAlertList,
  AlertToastStack,
  usePriceAlerts,
} from "./PriceAlert.jsx";

// ─── Data ────────────────────────────────────────────────────────────────────
const STOCKS = [
  { symbol: "AAPL", name: "Apple Inc.",       price: 189.84, change: 1.25,  sector: "Technology" },
  { symbol: "TSLA", name: "Tesla Inc.",        price: 242.60, change: -2.07, sector: "Automotive" },
  { symbol: "GOOGL", name: "Alphabet Inc.",   price: 175.98, change: 1.07,  sector: "Technology" },
  { symbol: "AMZN", name: "Amazon.com",       price: 198.12, change: 1.77,  sector: "Commerce"   },
  { symbol: "MSFT", name: "Microsoft Corp.",  price: 415.32, change: 1.02,  sector: "Technology" },
  { symbol: "NVDA", name: "NVIDIA Corp.",     price: 875.40, change: 2.59,  sector: "Chips"      },
  { symbol: "META", name: "Meta Platforms",   price: 528.75, change: -1.55, sector: "Social"     },
  { symbol: "NFLX", name: "Netflix Inc.",     price: 634.20, change: 1.86,  sector: "Media"      },
  { symbol: "AMD",  name: "Advanced Micro",   price: 178.90, change: -1.76, sector: "Chips"      },
  { symbol: "SPOT", name: "Spotify Tech.",    price: 312.44, change: 2.22,  sector: "Media"      },
  { symbol: "UBER", name: "Uber Tech.",       price: 78.34,  change: 0.88,  sector: "Transport"  },
  { symbol: "PYPL", name: "PayPal Holdings",  price: 65.12,  change: -0.43, sector: "Fintech"    },
];

function Sparkline({ positive }) {
  const pts = useRef(
    Array.from({ length: 12 }, (_, i) => {
      const base = 40 + (positive ? i * 2 : -i * 1.5);
      return Math.max(5, Math.min(55, base + (Math.random() - 0.5) * 18));
    })
  ).current;
  const w = 64, h = 28;
  const min = Math.min(...pts), max = Math.max(...pts), range = max - min || 1;
  const path = pts.map((v, i) =>
    `${(i / (pts.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`
  ).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <polyline points={path} fill="none"
        stroke={positive ? "#16a34a" : "#dc2626"}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Notification ─────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 2800); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: type === "error" ? "#fef2f2" : "#f0fdf4",
      border: `1px solid ${type === "error" ? "#fca5a5" : "#86efac"}`,
      color: type === "error" ? "#991b1b" : "#166534",
      padding: "12px 18px", borderRadius: 10, fontSize: 13,
      fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
      boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <span>{type === "error" ? "✕" : "✓"}</span> {msg}
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav({ page, setPage, wallet }) {
  const tabs = [
    { id: "home",      icon: "◈", label: "Market"    },
    { id: "portfolio", icon: "◉", label: "Portfolio"  },
    { id: "account",   icon: "◎", label: "Account"   },
  ];
  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 28px", height: 56, background: "#fff",
      borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 100,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 20, color: "#2563eb" }}>◈</span>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: "#111", letterSpacing: 0.3 }}>
          Vesper
        </span>
      </div>

      <div style={{ display: "flex", gap: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setPage(t.id)} style={{
            padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: page === t.id ? "#eff6ff" : "transparent",
            color: page === t.id ? "#2563eb" : "#6b7280",
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: page === t.id ? 600 : 400,
            transition: "all 0.15s",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{
        fontSize: 13, fontFamily: "'DM Mono', monospace",
        color: "#374151", fontWeight: 500,
      }}>
        ${wallet.toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </div>
    </nav>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage({ prices, portfolio, wallet, setWallet, setPortfolio, showToast }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(STOCKS[0]);
  const [qty, setQty] = useState(1);
  const [filter, setFilter] = useState("All");
  const { alerts } = usePriceAlerts(); // ← reads from PriceAlertProvider

  const sectors = ["All", ...new Set(STOCKS.map(s => s.sector))];
  const filtered = STOCKS.filter(s => {
    const matchSearch = s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase());
    const matchSector = filter === "All" || s.sector === filter;
    return matchSearch && matchSector;
  });

  function buy() {
    const cost = prices[selected.symbol] * qty;
    if (cost > wallet) { showToast("Not enough funds.", "error"); return; }
    setWallet(w => +(w - cost).toFixed(2));
    setPortfolio(p => ({ ...p, [selected.symbol]: (p[selected.symbol] || 0) + qty }));
    showToast(`Bought ${qty} × ${selected.symbol}`);
  }
  function sell() {
    if ((portfolio[selected.symbol] || 0) < qty) { showToast("Not enough shares.", "error"); return; }
    const rev = prices[selected.symbol] * qty;
    setWallet(w => +(w + rev).toFixed(2));
    setPortfolio(p => {
      const n = { ...p };
      n[selected.symbol] -= qty;
      if (n[selected.symbol] <= 0) delete n[selected.symbol];
      return n;
    });
    showToast(`Sold ${qty} × ${selected.symbol}`);
  }

  const selPrice = prices[selected.symbol];
  const selUp = selected.change >= 0;
  const held = portfolio[selected.symbol] || 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 0, minHeight: "calc(100vh - 56px)" }}>
      {/* Left: list */}
      <div style={{ padding: "24px 28px", borderRight: "1px solid #e5e7eb" }}>
        {/* Search */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 15 }}>⌕</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search stocks…"
            style={{
              width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8,
              border: "1px solid #e5e7eb", background: "#f9fafb",
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: "none",
              color: "#111",
            }}
          />
        </div>

        {/* Sector pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {sectors.map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: "4px 12px", borderRadius: 20, border: "1px solid",
              borderColor: filter === s ? "#2563eb" : "#e5e7eb",
              background: filter === s ? "#eff6ff" : "#fff",
              color: filter === s ? "#2563eb" : "#6b7280",
              fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}>{s}</button>
          ))}
        </div>

        {/* Stock table */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
          {/* Header */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 80px 90px 80px",
            padding: "10px 16px", background: "#f9fafb",
            borderBottom: "1px solid #e5e7eb",
          }}>
            {["Stock", "", "Price", "Change"].map((h, i) => (
              <span key={i} style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</span>
            ))}
          </div>
          {filtered.map(stock => {
            const p = prices[stock.symbol];
            const up = stock.change >= 0;
            const active = selected.symbol === stock.symbol;
            const hasAlert = alerts.some(a => a.symbol === stock.symbol);
            return (
              <div key={stock.symbol} onClick={() => { setSelected(stock); setQty(1); }}
                style={{
                  display: "grid", gridTemplateColumns: "1fr 80px 90px 80px",
                  padding: "11px 16px", borderBottom: "1px solid #f3f4f6",
                  cursor: "pointer", alignItems: "center",
                  background: active ? "#eff6ff" : "#fff",
                  transition: "background 0.12s",
                }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111", fontFamily: "'DM Mono', monospace", display: "flex", alignItems: "center", gap: 4 }}>
                    {stock.symbol}
                    {hasAlert && <span title="Has active price alerts" style={{ fontSize: 10, lineHeight: 1 }}>🔔</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "'DM Sans', sans-serif", marginTop: 1 }}>{stock.name}</div>
                </div>
                <Sparkline positive={up} />
                <span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: "#111", fontWeight: 500 }}>${p.toFixed(2)}</span>
                <span style={{
                  fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 500,
                  color: up ? "#16a34a" : "#dc2626",
                }}>
                  {up ? "+" : ""}{stock.change.toFixed(2)}%
                </span>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
              No stocks found
            </div>
          )}
        </div>
      </div>

      {/* Right: trade panel */}
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Stock detail */}
        <div style={{ background: "#f9fafb", borderRadius: 12, padding: "18px 20px", border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#111" }}>{selected.symbol}</div>
              <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>{selected.name}</div>
              <span style={{
                display: "inline-block", marginTop: 6, padding: "2px 8px", borderRadius: 4,
                background: "#e0e7ff", color: "#3730a3", fontSize: 10, fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.5,
              }}>{selected.sector}</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#111" }}>${selPrice.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: selUp ? "#16a34a" : "#dc2626", fontWeight: 600, marginTop: 3 }}>
                {selUp ? "▲" : "▼"} {Math.abs(selected.change).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* Trade form */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}>Place Order</div>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14, background: "#fff" }}>
            <div>
              <label style={{ fontSize: 11, color: "#6b7280", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, display: "block", marginBottom: 6 }}>QUANTITY</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setQty(q => Math.max(1, q - 1))} style={btnSmall}>−</button>
                <input type="number" min="1" value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: 60, textAlign: "center", padding: "7px 8px", border: "1px solid #e5e7eb", borderRadius: 7, fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 600, outline: "none", color: "#111" }} />
                <button onClick={() => setQty(q => q + 1)} style={btnSmall}>+</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={statBox}>
                <span style={statLbl}>Total</span>
                <span style={statVal}>${(selPrice * qty).toFixed(2)}</span>
              </div>
              <div style={statBox}>
                <span style={statLbl}>Holding</span>
                <span style={statVal}>{held} sh</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={buy} style={{
                padding: "11px", borderRadius: 8, border: "none",
                background: "#16a34a", color: "#fff",
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                cursor: "pointer",
              }}>Buy</button>
              <button onClick={sell} style={{
                padding: "11px", borderRadius: 8, border: "none",
                background: "#dc2626", color: "#fff",
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                cursor: "pointer",
              }}>Sell</button>
            </div>

            <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "'DM Mono', monospace", textAlign: "center" }}>
              Cash: ${wallet.toFixed(2)} · Max buy: {Math.floor(wallet / selPrice)} shares
            </div>
          </div>
        </div>

        {/* ── Price Alert Component ── */}
        <PriceAlertForm selectedStock={selected} prices={prices} onToast={showToast} />
        <PriceAlertList symbol={selected.symbol} prices={prices} />

        {/* Market summary */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}>Market Summary</div>
          </div>
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, background: "#fff" }}>
            {[
              { label: "Gainers today", value: STOCKS.filter(s => s.change > 0).length },
              { label: "Losers today",  value: STOCKS.filter(s => s.change < 0).length },
              { label: "Avg change",    value: (STOCKS.reduce((a,s) => a + s.change, 0) / STOCKS.length).toFixed(2) + "%" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                <span style={{ color: "#6b7280" }}>{r.label}</span>
                <span style={{ fontWeight: 600, color: "#111", fontFamily: "'DM Mono', monospace" }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PORTFOLIO PAGE ───────────────────────────────────────────────────────────
function PortfolioPage({ prices, portfolio, wallet }) {
  const positions = Object.entries(portfolio).map(([sym, qty]) => {
    const stock = STOCKS.find(s => s.symbol === sym);
    return { sym, qty, price: prices[sym], value: prices[sym] * qty, stock };
  });
  const totalInvested = positions.reduce((a, p) => a + p.value, 0);
  const totalNet = wallet + totalInvested;
  const gainers = positions.filter(p => p.stock.change > 0);
  const losers  = positions.filter(p => p.stock.change < 0);

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 24px" }}>
      <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: "#111", marginBottom: 24 }}>Portfolio</h1>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Net Worth",    value: `$${totalNet.toFixed(2)}`,       sub: "Cash + holdings" },
          { label: "Invested",     value: `$${totalInvested.toFixed(2)}`,  sub: `${positions.length} positions` },
          { label: "Cash",         value: `$${wallet.toFixed(2)}`,         sub: "Available" },
        ].map(c => (
          <div key={c.label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#111", margin: "6px 0 2px" }}>{c.value}</div>
            <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "'DM Sans', sans-serif" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Allocation bar */}
      {totalNet > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", fontFamily: "'DM Sans', sans-serif", marginBottom: 10 }}>Allocation</div>
          <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 10 }}>
            <div style={{ width: `${(totalInvested / totalNet) * 100}%`, background: "#2563eb", transition: "width 0.5s" }} />
            <div style={{ flex: 1, background: "#e5e7eb" }} />
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: "#6b7280" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#2563eb", display: "inline-block" }} />
              Invested {((totalInvested / totalNet) * 100).toFixed(1)}%
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: "#6b7280" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#e5e7eb", display: "inline-block" }} />
              Cash {((wallet / totalNet) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Holdings table */}
      {positions.length === 0 ? (
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 15, fontFamily: "'DM Sans', sans-serif", color: "#6b7280" }}>No positions yet. Go to Market to start trading.</div>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 70px 100px 100px 80px",
            padding: "10px 16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb",
          }}>
            {["Stock", "Shares", "Price", "Value", "Change"].map(h => (
              <span key={h} style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</span>
            ))}
          </div>
          {positions.map(({ sym, qty, price, value, stock }) => (
            <div key={sym} style={{
              display: "grid", gridTemplateColumns: "1fr 70px 100px 100px 80px",
              padding: "13px 16px", borderBottom: "1px solid #f3f4f6", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#111" }}>{sym}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "'DM Sans', sans-serif" }}>{stock.name}</div>
              </div>
              <span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: "#374151" }}>{qty}</span>
              <span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: "#374151" }}>${price.toFixed(2)}</span>
              <span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "#111" }}>${value.toFixed(2)}</span>
              <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: stock.change >= 0 ? "#16a34a" : "#dc2626", fontWeight: 500 }}>
                {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Top performers */}
      {positions.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20 }}>
          {[
            { title: "Gainers", items: gainers, color: "#16a34a", bg: "#f0fdf4" },
            { title: "Losers",  items: losers,  color: "#dc2626", bg: "#fef2f2" },
          ].map(({ title, items, color, bg }) => (
            <div key={title} style={{ background: bg, border: `1px solid ${color}22`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color, fontFamily: "'DM Sans', sans-serif", marginBottom: 10 }}>{title}</div>
              {items.length === 0
                ? <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "'DM Sans', sans-serif" }}>None</div>
                : items.map(p => (
                  <div key={p.sym} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>
                    <span style={{ color: "#374151" }}>{p.sym}</span>
                    <span style={{ color, fontWeight: 600 }}>{p.stock.change > 0 ? "+" : ""}{p.stock.change.toFixed(2)}%</span>
                  </div>
                ))
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ACCOUNT PAGE ─────────────────────────────────────────────────────────────
function AccountPage({ wallet, setWallet, showToast }) {
  const [addInput, setAddInput] = useState("");
  const [withdrawInput, setWithdrawInput] = useState("");
  const [name, setName] = useState("Alex Morgan");
  const [email, setEmail] = useState("alex@vesper.app");
  const [editingProfile, setEditingProfile] = useState(false);

  function deposit() {
    const amt = parseFloat(addInput);
    if (!amt || amt <= 0) { showToast("Enter a valid amount.", "error"); return; }
    setWallet(w => +(w + amt).toFixed(2));
    setAddInput("");
    showToast(`$${amt.toFixed(2)} deposited`);
  }
  function withdraw() {
    const amt = parseFloat(withdrawInput);
    if (!amt || amt <= 0) { showToast("Enter a valid amount.", "error"); return; }
    if (amt > wallet) { showToast("Insufficient balance.", "error"); return; }
    setWallet(w => +(w - amt).toFixed(2));
    setWithdrawInput("");
    showToast(`$${amt.toFixed(2)} withdrawn`);
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 24px" }}>
      <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: "#111", marginBottom: 24 }}>Account</h1>

      {/* Profile */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}>Profile</div>
          <button onClick={() => setEditingProfile(v => !v)} style={{
            padding: "5px 12px", borderRadius: 7, border: "1px solid #e5e7eb",
            background: "#fff", fontSize: 12, cursor: "pointer", color: "#374151",
            fontFamily: "'DM Sans', sans-serif",
          }}>{editingProfile ? "Save" : "Edit"}</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%", background: "#eff6ff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, color: "#2563eb", fontWeight: 700, fontFamily: "'DM Serif Display', serif",
          }}>{name.charAt(0)}</div>
          <div>
            {editingProfile
              ? <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
              : <div style={{ fontSize: 15, fontWeight: 600, color: "#111", fontFamily: "'DM Sans', sans-serif" }}>{name}</div>
            }
            {editingProfile
              ? <input value={email} onChange={e => setEmail(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
              : <div style={{ fontSize: 13, color: "#6b7280", fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>{email}</div>
            }
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[
            { label: "Member since", value: "Mar 2025" },
            { label: "Plan",         value: "Pro" },
            { label: "Status",       value: "Active" },
          ].map(r => (
            <div key={r.label} style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{r.label}</div>
              <div style={{ fontSize: 13, color: "#111", fontFamily: "'DM Mono', monospace", fontWeight: 500, marginTop: 3 }}>{r.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Wallet */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>Wallet</div>
        <div style={{ background: "#f9fafb", borderRadius: 10, padding: "16px 20px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#6b7280", fontFamily: "'DM Sans', sans-serif" }}>Available Balance</span>
          <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#111" }}>${wallet.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Deposit */}
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>Deposit</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {[500, 1000, 5000].map(a => (
                <button key={a} onClick={() => setAddInput(String(a))} style={quickBtn}>
                  +${a.toLocaleString()}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="number" value={addInput} onChange={e => setAddInput(e.target.value)}
                placeholder="Amount" style={{ ...inputStyle, flex: 1 }}
                onKeyDown={e => e.key === "Enter" && deposit()} />
              <button onClick={deposit} style={greenBtn}>Deposit</button>
            </div>
          </div>

          {/* Withdraw */}
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>Withdraw</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {[100, 500, 1000].map(a => (
                <button key={a} onClick={() => setWithdrawInput(String(a))} style={quickBtn}>
                  ${a.toLocaleString()}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="number" value={withdrawInput} onChange={e => setWithdrawInput(e.target.value)}
                placeholder="Amount" style={{ ...inputStyle, flex: 1 }}
                onKeyDown={e => e.key === "Enter" && withdraw()} />
              <button onClick={withdraw} style={redBtn}>Withdraw</button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Settings</div>
        {[
          { label: "Email notifications", desc: "Trade confirmations and alerts" },
          { label: "Price alerts",        desc: "Get notified on big moves" },
          { label: "Two-factor auth",     desc: "Extra security for your account" },
        ].map((s, i) => (
          <ToggleRow key={i} label={s.label} desc={s.desc} defaultOn={i === 0} />
        ))}
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, defaultOn }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f3f4f6" }}>
      <div>
        <div style={{ fontSize: 13, color: "#111", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "'DM Sans', sans-serif", marginTop: 1 }}>{desc}</div>
      </div>
      <button onClick={() => setOn(v => !v)} style={{
        width: 40, height: 22, borderRadius: 11, border: "none",
        background: on ? "#2563eb" : "#d1d5db", cursor: "pointer",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", top: 3, left: on ? 21 : 3,
          width: 16, height: 16, borderRadius: "50%", background: "#fff",
          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </button>
    </div>
  );
}

// ─── Shared mini styles ───────────────────────────────────────────────────────
const inputStyle = {
  padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 7,
  fontFamily: "'DM Mono', monospace", fontSize: 13, outline: "none",
  color: "#111", width: "100%", background: "#fff",
};
const quickBtn = {
  padding: "4px 10px", borderRadius: 6, border: "1px solid #e5e7eb",
  background: "#f9fafb", color: "#374151", fontSize: 11, cursor: "pointer",
  fontFamily: "'DM Mono', monospace",
};
const greenBtn = {
  padding: "8px 14px", borderRadius: 7, border: "none",
  background: "#16a34a", color: "#fff", fontFamily: "'DM Sans', sans-serif",
  fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
};
const redBtn = {
  padding: "8px 14px", borderRadius: 7, border: "none",
  background: "#dc2626", color: "#fff", fontFamily: "'DM Sans', sans-serif",
  fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
};
const btnSmall = {
  width: 32, height: 34, borderRadius: 7, border: "1px solid #e5e7eb",
  background: "#f9fafb", color: "#374151", fontSize: 16, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
};
const statBox = {
  background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8,
  padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2,
};
const statLbl = {
  fontSize: 10, color: "#9ca3af", fontFamily: "'DM Sans', sans-serif",
  fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5,
};
const statVal = {
  fontSize: 15, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#111",
};

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App({ prices, externalAlertToast }) {
  const [page, setPage] = useState("home");
  const [wallet, setWallet] = useState(10000);
  const [portfolio, setPortfolio] = useState({});
  const [toast, setToast] = useState(null);

  // Prices now come from main.jsx (shared with PriceAlertProvider)
  // The internal ticker has been removed — prices are a prop.

  // Show alert toasts fired by PriceAlertProvider
  useEffect(() => {
    if (externalAlertToast) setToast(externalAlertToast);
  }, [externalAlertToast]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
  }

  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&family=DM+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
      `}</style>

      <Nav page={page} setPage={setPage} wallet={wallet} />

      {page === "home"      && <HomePage      prices={prices} portfolio={portfolio} wallet={wallet} setWallet={setWallet} setPortfolio={setPortfolio} showToast={showToast} />}
      {page === "portfolio" && <PortfolioPage prices={prices} portfolio={portfolio} wallet={wallet} />}
      {page === "account"   && <AccountPage   wallet={wallet} setWallet={setWallet} showToast={showToast} />}

      {/* Alert toast overlay — rendered by PriceAlert component */}
      <AlertToastStack />

      {/* Regular app toasts */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
