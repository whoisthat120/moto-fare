import { useState, useEffect, useRef, useCallback } from "react";

const COLORS = {
  bg: "#0D0D0D",
  surface: "#161616",
  card: "#1E1E1E",
  green: "#00C853",
  greenDim: "#00C85322",
  greenBorder: "#00C85344",
  yellow: "#FFD600",
  yellowDim: "#FFD60015",
  text: "#F5F0E8",
  muted: "#888580",
  border: "#2A2A2A",
};

const BASE_RATE = 150;
const TIME_MULTIPLIERS = { day: 1.0, peak: 1.3, night: 1.55 };
const ROUTE_MULTIPLIERS = { city: 1.0, suburb: 1.15, hill: 1.4 };
const BAG_ADDON = { none: 0, small: 100, large: 300 };

function calcFare(km, time, route, bag) {
  const raw = BASE_RATE * km * TIME_MULTIPLIERS[time] * ROUTE_MULTIPLIERS[route] + BAG_ADDON[bag];
  const mid = Math.round(raw / 50) * 50;
  const lo = Math.round(mid * 0.8 / 50) * 50;
  const hi = Math.round(mid * 1.2 / 50) * 50;
  const walk = Math.round(mid * 1.45 / 50) * 50;
  return { mid, lo, hi, walk, pkm: Math.round(mid / km) };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

const TIPS = {
  day: "Agree on the price BEFORE you board — always.",
  peak: "Peak hours 7–9am & 5–7pm. Drivers know demand is high. Hold firm.",
  night: "Night rides cost more. Walk to a busier street for more options.",
};

const ROUTES_INFO = {
  city: "Kigali CBD, Kimironko, Remera, Kacyiru",
  suburb: "Kanombe, Masaka, Rusororo, Gikondo",
  hill: "Nyamirambo hills, Kanyinya, Batsinda, Ndera",
};

function ChipGroup({ options, value, onChange, color = "green" }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: "8px 16px",
              borderRadius: 100,
              border: active
                ? `1.5px solid ${color === "yellow" ? COLORS.yellow : COLORS.green}`
                : `1px solid ${COLORS.border}`,
              background: active
                ? color === "yellow" ? COLORS.yellowDim : COLORS.greenDim
                : "transparent",
              color: active
                ? color === "yellow" ? COLORS.yellow : COLORS.green
                : COLORS.muted,
              fontSize: 13,
              fontFamily: "inherit",
              fontWeight: active ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.15s ease",
              letterSpacing: "0.02em",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const start = prev.current;
    const end = value;
    const diff = end - start;
    if (diff === 0) return;
    const steps = 18;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      const eased = start + diff * (1 - Math.pow(1 - i / steps, 3));
      setDisplay(Math.round(eased / 50) * 50);
      if (i >= steps) { setDisplay(end); prev.current = end; clearInterval(timer); }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display.toLocaleString()}</>;
}

function SearchBox({ label, placeholder, onSelect, color }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(false);
  const debounce = useRef(null);

  const search = useCallback((q) => {
    if (q.length < 3) { setResults([]); return; }
    setLoading(true);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + " Kigali Rwanda")}&format=json&limit=5&countrycodes=rw`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        setResults(data);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
  }, []);

  const handleChange = (e) => {
    setQuery(e.target.value);
    setSelected(false);
    search(e.target.value);
  };

  const handleSelect = (item) => {
    setQuery(item.display_name.split(",")[0]);
    setResults([]);
    setSelected(true);
    onSelect({ lat: parseFloat(item.lat), lon: parseFloat(item.lon), name: item.display_name.split(",")[0] });
  };

  const accent = color === "yellow" ? COLORS.yellow : COLORS.green;
  const accentBorder = color === "yellow" ? "#FFD60044" : COLORS.greenBorder;

  return (
    <div style={{ position: "relative", flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: accent, marginBottom: 6, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>
        {label}
      </div>
      <div style={{
        display: "flex", alignItems: "center",
        border: `1px solid ${focused ? accentBorder : COLORS.border}`,
        borderRadius: 10, background: COLORS.card, overflow: "hidden", transition: "border-color 0.15s",
      }}>
        <div style={{ padding: "0 12px", color: accent, fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
          {color === "green" ? "A" : "B"}
        </div>
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder={placeholder}
          style={{
            flex: 1, padding: "12px 10px 12px 0",
            background: "transparent", border: "none", outline: "none",
            color: COLORS.text, fontSize: 14, fontFamily: "inherit",
          }}
        />
        {loading && <div style={{ padding: "0 10px", color: COLORS.muted, fontSize: 12 }}>...</div>}
        {selected && <div style={{ padding: "0 12px", color: COLORS.green, fontSize: 16 }}>✓</div>}
      </div>
      {results.length > 0 && focused && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200,
          background: COLORS.card, border: `1px solid ${COLORS.border}`,
          borderRadius: 10, marginTop: 4, overflow: "hidden",
        }}>
          {results.map((r) => (
            <div
              key={r.place_id}
              onMouseDown={() => handleSelect(r)}
              style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, color: COLORS.text, borderBottom: `1px solid ${COLORS.border}` }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.surface}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ fontWeight: 500 }}>{r.display_name.split(",")[0]}</div>
              <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>
                {r.display_name.split(",").slice(1, 3).join(",")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KigaliMap({ from, to }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const lineRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.L) { setReady(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || mapInstanceRef.current) return;
    mapInstanceRef.current = window.L.map(mapRef.current, {
      center: [-1.9441, 30.0619], zoom: 13,
    });
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(mapInstanceRef.current);
  }, [ready]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (lineRef.current) { map.removeLayer(lineRef.current); lineRef.current = null; }

    const makeIcon = (bg, letter) => L.divIcon({
      className: "",
      html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:${bg};transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid #0D0D0D;"><span style="transform:rotate(45deg);color:#0D0D0D;font-weight:700;font-size:12px;font-family:sans-serif;">${letter}</span></div>`,
      iconSize: [30, 30], iconAnchor: [15, 30],
    });

    const pts = [];
    if (from) {
      markersRef.current.push(L.marker([from.lat, from.lon], { icon: makeIcon("#00C853", "A") }).addTo(map).bindPopup(from.name));
      pts.push([from.lat, from.lon]);
    }
    if (to) {
      markersRef.current.push(L.marker([to.lat, to.lon], { icon: makeIcon("#FFD600", "B") }).addTo(map).bindPopup(to.name));
      pts.push([to.lat, to.lon]);
    }
    if (pts.length === 2) {
      lineRef.current = L.polyline(pts, { color: "#00C853", weight: 3, dashArray: "6 6" }).addTo(map);
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
    } else if (pts.length === 1) {
      map.setView(pts[0], 15);
    }
  }, [from, to, ready]);

  return (
    <div ref={mapRef} style={{
      width: "100%", height: 220, borderRadius: 14,
      overflow: "hidden", border: `1px solid ${COLORS.border}`,
      background: COLORS.surface,
    }} />
  );
}

export default function MotoCalc() {
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [km, setKm] = useState(3);
  const [time, setTime] = useState("day");
  const [route, setRoute] = useState("city");
  const [bag, setBag] = useState("none");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (from && to) {
      const dist = haversineKm(from.lat, from.lon, to.lat, to.lon);
      setKm(Math.max(1, Math.min(20, Math.round(dist))));
    }
  }, [from, to]);

  const fare = calcFare(km, time, route, bag);
  const phrase = `"Angahe?" — Ubwira uti: "Birenze cyane, ${fare.mid.toLocaleString()} francs gusa."`;

  const copyPhrase = () => {
    navigator.clipboard.writeText(phrase).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      minHeight: "100vh", background: COLORS.bg, color: COLORS.text,
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      maxWidth: 480, margin: "0 auto", padding: "0 0 60px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding: "28px 20px 20px", borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.green, boxShadow: `0 0 8px ${COLORS.green}`, animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 11, color: COLORS.green, letterSpacing: "0.12em", fontWeight: 600, textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>
            Kigali Moto Fares
          </span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 4px", lineHeight: 1.2 }}>
          Know your fare.<br /><span style={{ color: COLORS.green }}>Don't overpay.</span>
        </h1>
        <p style={{ fontSize: 13, color: COLORS.muted, margin: 0, lineHeight: 1.5 }}>
          Type a landmark or street to get the fair moto price
        </p>
      </div>

      <div style={{ padding: "0 20px" }}>

        {/* Search */}
        <div style={{ marginTop: 20, marginBottom: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <SearchBox label="From" placeholder="e.g. Kimironko Market" onSelect={setFrom} color="green" />
          <SearchBox label="To" placeholder="e.g. Kigali Convention Centre" onSelect={setTo} color="yellow" />
        </div>

        {/* Map */}
        <div style={{ marginBottom: 8 }}>
          <KigaliMap from={from} to={to} />
          <div style={{ marginTop: 8, fontSize: 13, color: COLORS.muted, textAlign: "center", fontFamily: "'DM Mono', monospace" }}>
            {from && to
              ? <span>Distance: <span style={{ color: COLORS.green, fontWeight: 600 }}>{km} km</span> (straight line)</span>
              : <span>Search both locations above to auto-calculate</span>
            }
          </div>
        </div>

        {/* Distance slider */}
        <div style={{ marginBottom: 24, marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, letterSpacing: "0.04em" }}>
              {from && to ? "Distance (adjust if needed)" : "Or set distance manually"}
            </span>
            <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.green, fontFamily: "'DM Mono', monospace", background: COLORS.greenDim, padding: "2px 10px", borderRadius: 20, border: `1px solid ${COLORS.greenBorder}` }}>
              {km} km
            </span>
          </div>
          <input type="range" min={1} max={20} value={km} step={1}
            onChange={(e) => setKm(parseInt(e.target.value))}
            style={{ width: "100%", accentColor: COLORS.green, cursor: "pointer" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: COLORS.muted, marginTop: 4, fontFamily: "'DM Mono', monospace" }}>
            <span>1 km</span><span>10 km</span><span>20 km</span>
          </div>
        </div>

        {/* Fare card */}
        <div style={{ marginBottom: 20, background: COLORS.surface, border: `1px solid ${COLORS.greenBorder}`, borderRadius: 16, padding: "20px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: COLORS.greenDim, filter: "blur(30px)" }} />
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>FAIR FARE</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 44, fontWeight: 600, color: COLORS.green, lineHeight: 1, fontFamily: "'DM Mono', monospace" }}>
              <AnimatedNumber value={fare.mid} />
            </span>
            <span style={{ fontSize: 16, color: COLORS.muted, fontWeight: 500 }}>RWF</span>
          </div>
          <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>
            Range: <span style={{ color: COLORS.text }}>{fare.lo.toLocaleString()} – {fare.hi.toLocaleString()} RWF</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16 }}>
            {[
              { label: "Per km", val: `${fare.pkm.toLocaleString()} RWF` },
              { label: "Max pay", val: `${fare.hi.toLocaleString()} RWF` },
              { label: "Walk away", val: `${fare.walk.toLocaleString()} RWF` },
            ].map((s) => (
              <div key={s.label} style={{ background: COLORS.card, borderRadius: 10, padding: "10px", border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 3, letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, fontFamily: "'DM Mono', monospace" }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Time */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 10, letterSpacing: "0.04em" }}>Time of day</div>
          <ChipGroup value={time} onChange={setTime} options={[
            { label: "Daytime", value: "day" },
            { label: "Peak hour", value: "peak" },
            { label: "Night", value: "night" },
          ]} />
          <div style={{ marginTop: 8, fontSize: 12, color: COLORS.muted, lineHeight: 1.5 }}>{TIPS[time]}</div>
        </div>

        {/* Route */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 10, letterSpacing: "0.04em" }}>Route type</div>
          <ChipGroup value={route} onChange={setRoute} options={[
            { label: "City centre", value: "city" },
            { label: "Suburb", value: "suburb" },
            { label: "Hilly / remote", value: "hill" },
          ]} />
          <div style={{ marginTop: 8, fontSize: 12, color: COLORS.muted }}>{ROUTES_INFO[route]}</div>
        </div>

        {/* Luggage */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 10, letterSpacing: "0.04em" }}>Luggage</div>
          <ChipGroup value={bag} onChange={setBag} color="yellow" options={[
            { label: "None", value: "none" },
            { label: "Small bag", value: "small" },
            { label: "Large item (+300)", value: "large" },
          ]} />
        </div>

        {/* Kinyarwanda */}
        <div style={{ background: "#111A13", border: `1px solid #1E3A22`, borderRadius: 14, padding: "16px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.green, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>
            Kinyarwanda negotiation phrase
          </div>
          <p style={{ fontSize: 15, color: COLORS.text, margin: "0 0 6px", lineHeight: 1.6, fontStyle: "italic" }}>"Angahe?"</p>
          <p style={{ fontSize: 13, color: COLORS.text, margin: "0 0 2px", lineHeight: 1.6 }}>
            Ubwira uti: <strong style={{ color: COLORS.green }}>"Birenze cyane, {fare.mid.toLocaleString()} francs gusa."</strong>
          </p>
          <p style={{ fontSize: 12, color: COLORS.muted, margin: "8px 0 12px", lineHeight: 1.5 }}>
            "How much?" → "That's too much, only {fare.mid.toLocaleString()} RWF."
          </p>
          <button onClick={copyPhrase} style={{
            width: "100%", padding: "10px", borderRadius: 10,
            border: `1px solid ${COLORS.greenBorder}`,
            background: copied ? COLORS.greenDim : "transparent",
            color: copied ? COLORS.green : COLORS.muted,
            fontSize: 13, fontFamily: "inherit", fontWeight: 500,
            cursor: "pointer", transition: "all 0.2s",
          }}>
            {copied ? "✓ Copied to clipboard" : "Copy phrase"}
          </button>
        </div>

        {/* Safety */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "16px", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>
            Safety reminders
          </div>
          {[
            "Always wear the helmet the driver offers you.",
            "Agree on the price before boarding — never after.",
            "Check the moto plate number if travelling alone at night.",
            "Licensed motos in Kigali wear orange vests.",
          ].map((tip, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < 3 ? 10 : 0, alignItems: "flex-start" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: COLORS.muted, marginTop: 6, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: COLORS.muted, lineHeight: 1.5 }}>{tip}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, color: COLORS.border, textAlign: "center", marginTop: 20, lineHeight: 1.6 }}>
          Fares are estimates based on common Kigali rates.<br />Actual prices may vary. Last updated 2025.
        </p>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        input[type=range] { -webkit-appearance: none; height: 4px; background: ${COLORS.border}; border-radius: 4px; outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: ${COLORS.green}; cursor: pointer; box-shadow: 0 0 0 4px ${COLORS.greenDim}; }
        input[type=range]::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: ${COLORS.green}; cursor: pointer; border: none; }
        * { box-sizing: border-box; }
        body { margin: 0; background: ${COLORS.bg}; }
      `}</style>
    </div>
  );
}
