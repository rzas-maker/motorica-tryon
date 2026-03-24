import { useState, useRef, useEffect } from "react";

const CATALOG = [
  // Плечо
  { id:"manifesto_elbow", name:"МАНИФЕСТО Элбоу", type:"bionic",  level:"shoulder", desc:"Бионический протез плеча с миоэлектрическим управлением", socketY:0.85 },
  { id:"indy_elbow",      name:"ИНДИ Элбоу",      type:"bionic",  level:"shoulder", desc:"Технологичный протез плеча для активного образа жизни",   socketY:0.85 },
  // Предплечье
  { id:"cybi_hand",       name:"КИБИ Хэнд",       type:"traction",level:"forearm",  desc:"Тяговый протез предплечья без электроники",               socketY:0.72 },
  { id:"indy_hand",       name:"ИНДИ Хэнд",        type:"bionic",  level:"forearm",  desc:"Бионический протез предплечья для активных пользователей",socketY:0.78 },
  { id:"manifesto_hand",  name:"МАНИФЕСТО Хэнд",  type:"bionic",  level:"forearm",  desc:"Миоэлектрический протез с точным управлением кистью",      socketY:0.78 },
  // Кисть
  { id:"manifesto_f",     name:"МАНИФЕСТО Фингерс",type:"bionic",  level:"hand",     desc:"Бионический протез пальцев с индивидуальным управлением", socketY:0.80 },
  { id:"cybi_f",          name:"КИБИ Фингерс",     type:"traction",level:"hand",     desc:"Тяговый протез кисти с подвижным запястьем",              socketY:0.72 },
];

const SURVEY_LEVELS = [
  { id:"shoulder", label:"Плечо",      sub:"Ампутация выше локтя",   emoji:"💪" },
  { id:"forearm",  label:"Предплечье", sub:"Ампутация ниже локтя",   emoji:"🦾" },
  { id:"hand",     label:"Кисть",      sub:"Ампутация пальцев/кисти",emoji:"🖐️" },
];
const TYPE_LABEL = { bionic:"Бионический", traction:"Тяговый" };

async function readFile(f) {
  return new Promise(r => {
    const fr = new FileReader();
    fr.onload = e => r({ url: e.target.result });
    fr.readAsDataURL(f);
  });
}

function Upload({ onFile, accept, label, done, doneLabel, style, small }) {
  const ref = useRef();
  return (
    <div style={style}>
      <input ref={ref} type="file" accept={accept} style={{ display:"none" }}
        onChange={async e => { const f=e.target.files?.[0]; if(f){await onFile(f);e.target.value="";} }} />
      <button type="button" onClick={() => ref.current?.click()} style={{
        display:"block", width:"100%", padding: small ? "7px 12px" : "12px 16px",
        background: done ? "#ECFDF5" : "#F0F7FF",
        border: `1.5px dashed ${done ? "#059669" : "#3b82f6"}`,
        borderRadius: 8, color: done ? "#059669" : "#1a56db",
        fontFamily:"inherit", fontWeight:600, fontSize: small ? 12 : 13,
        cursor:"pointer", textAlign:"center",
      }}>
        {done ? (doneLabel || "✓ Загружено") : label}
      </button>
    </div>
  );
}

// ── Холст примерки ────────────────────────────────────────────────────────────
function TryOnCanvas({ photoUrl, prosUrl, socketY = 0.78 }) {
  const wrapRef   = useRef();
  const photoRef  = useRef();
  const prosRef   = useRef();
  const pImg      = useRef(null);
  const prImg     = useRef(null);
  const rafRef    = useRef(null);
  const dragRef   = useRef(null);
  const pinchRef  = useRef(null);

  const [cSize, setCSize]   = useState({ w:380, h:500 });
  const [pos,   setPos]     = useState({ x:0.5, y:0.5 });
  const [scale, setScale]   = useState(0.28);
  const [scaleX,setScaleX]  = useState(1);   // множитель ширины
  const [angle, setAngle]   = useState(0);
  const [opacity,setOpacity]= useState(1);
  const [loaded, setLoaded] = useState(false);
  const [rotDrag,setRotDrag]= useState(false); // тянем ли ручку поворота

  // Загружаем фото
  useEffect(() => {
    if (!photoUrl) return;
    const img = new Image();
    img.onload = () => {
      pImg.current = img;
      const w = wrapRef.current ? Math.min(wrapRef.current.offsetWidth, 500) : 380;
      setCSize({ w, h: Math.round(w * img.naturalHeight / img.naturalWidth) });
    };
    img.src = photoUrl;
  }, [photoUrl]);

  // Загружаем протез
  useEffect(() => {
    if (!prosUrl) return;
    setLoaded(false);
    const img = new Image();
    img.onload = () => { prImg.current = img; setLoaded(true); };
    img.src = prosUrl;
  }, [prosUrl]);

  // RAF отрисовка
  useEffect(() => {
    const photo = photoRef.current, pros = prosRef.current;
    if (!photo || !pros) return;
    let raf;
    const HANDLE_R = 14; // радиус ручки поворота
    const draw = () => {
      raf = requestAnimationFrame(draw);
      photo.width = cSize.w; photo.height = cSize.h;
      const ctx = photo.getContext("2d");
      ctx.clearRect(0, 0, cSize.w, cSize.h);
      if (pImg.current) ctx.drawImage(pImg.current, 0, 0, cSize.w, cSize.h);

      pros.width = cSize.w; pros.height = cSize.h;
      const ctx2 = pros.getContext("2d");
      ctx2.clearRect(0, 0, cSize.w, cSize.h);
      const px = pos.x * cSize.w, py = pos.y * cSize.h;

      if (prImg.current && loaded) {
        const img = prImg.current;
        const dw = cSize.w * scale * scaleX;   // ширина с учётом scaleX
        const dh = img.naturalHeight / img.naturalWidth * cSize.w * scale; // высота без scaleX
        ctx2.save();
        ctx2.translate(px, py);
        ctx2.rotate(angle * Math.PI / 180);
        ctx2.globalAlpha = opacity;
        ctx2.drawImage(img, -dw / 2, -socketY * dh, dw, dh);
        ctx2.restore();

        // Ручка поворота — по оси высоты (не ширины)
        const handleDist = cSize.w * scale * 0.55;
        const hr = angle * Math.PI / 180;
        const hx = px - Math.sin(hr) * handleDist;
        const hy = py - Math.cos(hr) * handleDist;
        ctx2.beginPath();
        ctx2.arc(hx, hy, HANDLE_R, 0, 2 * Math.PI);
        ctx2.fillStyle = "rgba(26,86,219,.18)";
        ctx2.fill();
        ctx2.strokeStyle = "#1a56db";
        ctx2.lineWidth = 2;
        ctx2.stroke();
        ctx2.save();
        ctx2.translate(hx, hy);
        ctx2.strokeStyle = "#1a56db"; ctx2.lineWidth = 2;
        ctx2.beginPath(); ctx2.arc(0, 0, 5, -Math.PI*0.8, Math.PI*0.8); ctx2.stroke();
        ctx2.beginPath(); ctx2.moveTo(4, -5); ctx2.lineTo(7, -1); ctx2.lineTo(3, 2); ctx2.stroke();
        ctx2.restore();

        // Ручки ширины — слева и справа по оси протеза
        const wx = dw / 2 / cSize.w;
        const lhx = px - Math.cos(hr) * (dw/2);
        const lhy = py + Math.sin(hr) * (dw/2);  // нет, нужно перпендикулярно
        // Перпендикуляр к оси протеза = (cos(hr), -sin(hr)) направление ширины
        const perpX = Math.cos(hr), perpY = -Math.sin(hr);
        const halfW = dw / 2;
        for (const side of [-1, 1]) {
          const whx = px + side * perpX * halfW;
          const why = py + side * perpY * halfW;
          ctx2.beginPath();
          ctx2.arc(whx, why, HANDLE_R - 2, 0, 2 * Math.PI);
          ctx2.fillStyle = "rgba(5,150,105,.15)";
          ctx2.fill();
          ctx2.strokeStyle = "#059669";
          ctx2.lineWidth = 2;
          ctx2.stroke();
          // Иконка стрелок ←→
          ctx2.fillStyle = "#059669";
          ctx2.font = "bold 11px sans-serif";
          ctx2.textAlign = "center";
          ctx2.textBaseline = "middle";
          ctx2.fillText(side < 0 ? "◀" : "▶", whx, why);
        }
      }

      // Маркер центра
      ctx2.beginPath();
      ctx2.arc(px, py, 5, 0, 2 * Math.PI);
      ctx2.strokeStyle = "rgba(26,86,219,.5)";
      ctx2.lineWidth = 2;
      ctx2.stroke();
      ctx2.fillStyle = "rgba(26,86,219,.12)";
      ctx2.fill();
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [cSize, pos, scale, scaleX, angle, opacity, loaded, socketY]);

  const getHandlePositions = () => {
    const hr = angle * Math.PI / 180;
    const px = pos.x * cSize.w, py = pos.y * cSize.h;
    const handleDist = cSize.w * scale * 0.55;
    // Ручка поворота — вдоль оси вверх
    const rotHx = px - Math.sin(hr) * handleDist;
    const rotHy = py - Math.cos(hr) * handleDist;
    // Ручки ширины — перпендикулярно оси
    const perpX = Math.cos(hr), perpY = -Math.sin(hr);
    const halfW = cSize.w * scale * scaleX / 2;
    const lhx = px - perpX * halfW, lhy = py - perpY * halfW;
    const rhx = px + perpX * halfW, rhy = py + perpY * halfW;
    return { rotHx, rotHy, lhx, lhy, rhx, rhy };
  };

  const hitRotHandle = (clientX, clientY) => {
    if (!prImg.current || !loaded) return false;
    const r = getBounds();
    const mx = (clientX - r.left) * cSize.w / r.width;
    const my = (clientY - r.top) * cSize.h / r.height;
    const { rotHx, rotHy } = getHandlePositions();
    return Math.hypot(mx - rotHx, my - rotHy) < 22;
  };
  // Возвращает -1 (левая), 1 (правая) или 0 (не попал)
  const hitWidthHandle = (clientX, clientY) => {
    if (!prImg.current || !loaded) return 0;
    const r = getBounds();
    const mx = (clientX - r.left) * cSize.w / r.width;
    const my = (clientY - r.top) * cSize.h / r.height;
    const { lhx, lhy, rhx, rhy } = getHandlePositions();
    if (Math.hypot(mx - lhx, my - lhy) < 22) return -1;
    if (Math.hypot(mx - rhx, my - rhy) < 22) return 1;
    return 0;
  };

  const widthDragRef = useRef(null); // { side, startX, startScaleX }

  // Жесты
  const getBounds = () => prosRef.current.getBoundingClientRect();
  const toPct = (clientX, clientY) => {
    const r = getBounds();
    return { x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height };
  };
  const toCanvas = (clientX, clientY) => {
    const r = getBounds();
    return { x: (clientX - r.left) * cSize.w / r.width, y: (clientY - r.top) * cSize.h / r.height };
  };
  const dist = (a, b) => Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  const ang  = (a, b) => Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180 / Math.PI;

  const onTS = e => {
    e.preventDefault();
    if (e.touches.length === 2) {
      pinchRef.current = { d0: dist(e.touches[0], e.touches[1]), a0: ang(e.touches[0], e.touches[1]), s0: scale, r0: angle };
      dragRef.current = null; widthDragRef.current = null;
    } else {
      const t = e.touches[0];
      const ws = hitWidthHandle(t.clientX, t.clientY);
      if (ws !== 0) {
        const c = toCanvas(t.clientX, t.clientY);
        widthDragRef.current = { side: ws, startX: c.x, startScaleX: scaleX };
        dragRef.current = null; setRotDrag(false);
      } else if (hitRotHandle(t.clientX, t.clientY)) {
        setRotDrag(true); dragRef.current = null; widthDragRef.current = null;
      } else {
        const p = toPct(t.clientX, t.clientY);
        dragRef.current = { ...p, px0: pos.x, py0: pos.y };
        setRotDrag(false); widthDragRef.current = null;
      }
    }
  };
  const onTM = e => {
    e.preventDefault();
    if (e.touches.length === 2 && pinchRef.current) {
      setScale(Math.min(5, Math.max(0.05, pinchRef.current.s0 * dist(e.touches[0], e.touches[1]) / pinchRef.current.d0)));
      setAngle(pinchRef.current.r0 + (ang(e.touches[0], e.touches[1]) - pinchRef.current.a0));
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      if (widthDragRef.current) {
        const c = toCanvas(t.clientX, t.clientY);
        const dx = (c.x - widthDragRef.current.startX) / cSize.w;
        setScaleX(Math.min(3, Math.max(0.2, widthDragRef.current.startScaleX + dx * widthDragRef.current.side * 2)));
      } else if (rotDrag) {
        const p = toPct(t.clientX, t.clientY);
        setAngle(Math.atan2(p.x - pos.x, -(p.y - pos.y)) * 180 / Math.PI);
      } else if (dragRef.current) {
        const p = toPct(t.clientX, t.clientY);
        setPos({ x: dragRef.current.px0 + (p.x - dragRef.current.x), y: dragRef.current.py0 + (p.y - dragRef.current.y) });
      }
    }
  };
  const onTE = e => {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) { dragRef.current = null; setRotDrag(false); widthDragRef.current = null; }
  };

  const onMD = e => {
    const ws = hitWidthHandle(e.clientX, e.clientY);
    if (ws !== 0) {
      const c = toCanvas(e.clientX, e.clientY);
      widthDragRef.current = { side: ws, startX: c.x, startScaleX: scaleX };
      setRotDrag(false); dragRef.current = null;
    } else if (hitRotHandle(e.clientX, e.clientY)) {
      setRotDrag(true); widthDragRef.current = null; dragRef.current = null;
    } else {
      const p = toPct(e.clientX, e.clientY);
      dragRef.current = { ...p, px0: pos.x, py0: pos.y };
      setRotDrag(false); widthDragRef.current = null;
    }
  };
  const onMM = e => {
    if (widthDragRef.current) {
      const c = toCanvas(e.clientX, e.clientY);
      const dx = (c.x - widthDragRef.current.startX) / cSize.w;
      setScaleX(Math.min(3, Math.max(0.2, widthDragRef.current.startScaleX + dx * widthDragRef.current.side * 2)));
    } else if (rotDrag) {
      const p = toPct(e.clientX, e.clientY);
      setAngle(Math.atan2(p.x - pos.x, -(p.y - pos.y)) * 180 / Math.PI);
    } else if (dragRef.current) {
      const p = toPct(e.clientX, e.clientY);
      setPos({ x: dragRef.current.px0 + (p.x - dragRef.current.x), y: dragRef.current.py0 + (p.y - dragRef.current.y) });
    }
  };
  const onMU = () => { dragRef.current = null; setRotDrag(false); widthDragRef.current = null; };

  const save = () => {
    const out = document.createElement("canvas");
    out.width = cSize.w; out.height = cSize.h;
    const ctx = out.getContext("2d");
    ctx.drawImage(photoRef.current, 0, 0);
    ctx.drawImage(prosRef.current, 0, 0, cSize.w, cSize.h);
    const a = document.createElement("a"); a.href = out.toDataURL("image/png"); a.download = "motorica-примерка.png"; a.click();
  };

  return (
    <div ref={wrapRef} style={{ width:"100%" }}>
      {/* Холст */}
      <div style={{ position:"relative", userSelect:"none", borderRadius:12, overflow:"hidden", border:"1px solid #e5e7eb" }}>
        <canvas ref={photoRef} style={{ width:"100%", display:"block" }} />
        <canvas ref={prosRef}
          onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
          onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
          style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", touchAction:"none", cursor:"grab" }} />
        {/* Подсказка */}
        <div style={{ position:"absolute", bottom:8, left:8, right:8, background:"rgba(255,255,255,.88)", borderRadius:8, padding:"6px 12px", fontSize:11, color:"#374151", textAlign:"center", pointerEvents:"none" }}>
          {prosUrl ? "Тяните тело · 🔵 синяя ручка = поворот · 🟢 зелёные боковые = ширина" : "Выберите протез из каталога ниже"}
        </div>
      </div>

      {/* Управление */}
      {prosUrl && (
        <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:16, marginTop:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:"1px", textTransform:"uppercase", marginBottom:14 }}>Точная настройка</div>

          {/* Кнопки для ПК */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, color:"#6b7280", marginBottom:8, fontWeight:600 }}>Быстрые кнопки</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:8 }}>
              {[
                ["←",  () => setPos(p => ({ ...p, x: p.x - 0.02 })), "#f3f4f6", "#374151"],
                ["→",  () => setPos(p => ({ ...p, x: p.x + 0.02 })), "#f3f4f6", "#374151"],
                ["↑",  () => setPos(p => ({ ...p, y: p.y - 0.02 })), "#f3f4f6", "#374151"],
                ["↓",  () => setPos(p => ({ ...p, y: p.y + 0.02 })), "#f3f4f6", "#374151"],
              ].map(([l, fn, bg, c]) => (
                <button key={l} type="button" onClick={fn} style={{ padding:"10px 0", background:bg, border:"1px solid #e5e7eb", borderRadius:8, fontFamily:"inherit", fontSize:16, color:c, cursor:"pointer", fontWeight:700 }}>{l}</button>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
              {[
                ["↺ -5°",  () => setAngle(a => a - 5),                               "#EFF6FF", "#1a56db"],
                ["↻ +5°",  () => setAngle(a => a + 5),                               "#EFF6FF", "#1a56db"],
                ["◀ уже",  () => setScaleX(s => Math.max(0.2, s - 0.05)),            "#ECFDF5", "#059669"],
                ["шире ▶", () => setScaleX(s => Math.min(3,   s + 0.05)),            "#ECFDF5", "#059669"],
                ["− высота",() => setScale(s => Math.max(0.05, s - 0.02)),           "#F5F3FF", "#7c3aed"],
                ["+ высота",() => setScale(s => Math.min(5,    s + 0.02)),           "#F5F3FF", "#7c3aed"],
                ["− размер",() => { setScale(s=>Math.max(0.05,s-0.02)); setScaleX(x=>Math.max(0.2,x-0.05)); }, "#fff7ed","#d97706"],
                ["+ размер",() => { setScale(s=>Math.min(5,s+0.02));    setScaleX(x=>Math.min(3,x+0.05));  }, "#fff7ed","#d97706"],
              ].map(([l, fn, bg, c]) => (
                <button key={l} type="button" onClick={fn} style={{ padding:"8px 2px", background:bg, border:`1px solid ${c}33`, borderRadius:8, fontFamily:"inherit", fontSize:11, color:c, cursor:"pointer", fontWeight:700 }}>{l}</button>
              ))}
            </div>
          </div>

          <div style={{ height:1, background:"#f3f4f6", marginBottom:14 }} />

          {/* Ползунки */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div>
              <div style={{ fontSize:12, color:"#6b7280", marginBottom:4 }}>Высота — {Math.round(scale * 100)}%</div>
              <input type="range" min="5" max="500" value={Math.round(scale * 100)} onChange={e => setScale(+e.target.value / 100)} style={{ width:"100%", accentColor:"#1a56db" }} />
            </div>
            <div>
              <div style={{ fontSize:12, color:"#6b7280", marginBottom:4 }}>Ширина — {Math.round(scaleX * 100)}%</div>
              <input type="range" min="30" max="200" value={Math.round(scaleX * 100)} onChange={e => setScaleX(+e.target.value / 100)} style={{ width:"100%", accentColor:"#059669" }} />
            </div>
            <div>
              <div style={{ fontSize:12, color:"#6b7280", marginBottom:4 }}>Поворот — {Math.round(angle)}°</div>
              <input type="range" min="-180" max="180" value={Math.round(angle)} onChange={e => setAngle(+e.target.value)} style={{ width:"100%", accentColor:"#7c3aed" }} />
            </div>
            <div>
              <div style={{ fontSize:12, color:"#6b7280", marginBottom:4, display:"flex", justifyContent:"space-between" }}>
                <span>Прозрачность</span>
                <span style={{ fontSize:11, color: opacity < 0.5 ? "#1a56db" : "#9ca3af" }}>{opacity < 0.2 ? "Посадка" : opacity < 0.6 ? "Полупрозр." : "Полный"}</span>
              </div>
              <input type="range" min="5" max="100" value={Math.round(opacity * 100)} onChange={e => setOpacity(+e.target.value / 100)} style={{ width:"100%", accentColor:"#3b82f6" }} />
            </div>
          </div>

          {/* Сброс + сохранение */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:8 }}>
            <button type="button" onClick={() => { setPos({x:.5,y:.5}); setScale(.28); setScaleX(1); setAngle(0); setOpacity(1); }}
              style={{ padding:10, background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:8, color:"#6b7280", fontFamily:"inherit", fontSize:12, cursor:"pointer" }}>
              Сбросить
            </button>
            <button type="button" onClick={save}
              style={{ padding:10, background:"#1a56db", border:"none", borderRadius:8, color:"#fff", fontWeight:600, fontSize:13, cursor:"pointer" }}>
              Сохранить фото
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Главное приложение ────────────────────────────────────────────────────────
export default function App() {
  const [page,      setPage]     = useState("home");  // home | survey | tryon
  const [survSide,  setSurvSide] = useState(null);    // "right" | "left"
  const [survLevel, setSurvLevel]= useState(null);    // "shoulder"|"forearm"|"hand"
  const [photoUrl, setPhotoUrl]= useState(null);
  const [prosUrl,  setProsUrl] = useState(null);
  const [socketY,  setSocketY] = useState(0.78);
  const [prosAssets,setProsAssets]=useState({});
  const [selProsId, setSelProsId]  =useState(null);

  const handlePhoto = async f => { const d=await readFile(f); setPhotoUrl(d.url); };
  const handleProsFile = async (f, id) => { const d=await readFile(f); setProsAssets(m=>({...m,[id]:d.url})); };

  // Протезы по результатам опроса
  const surveyPros = CATALOG.filter(p => p.level === survLevel);

  const startTryon = () => { setPage("tryon"); };
  const resetAll   = () => { setPage("home"); setSurvSide(null); setSurvLevel(null); setPhotoUrl(null); setProsUrl(null); setSelProsId(null); };

  const SS = {
    card:    { background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:20 },
    cardSm:  { background:"#fff", border:"1px solid #e5e7eb", borderRadius:10, padding:14 },
    h1:      { fontSize:26, fontWeight:700, color:"#111827", lineHeight:1.3 },
    h2:      { fontSize:20, fontWeight:700, color:"#111827" },
    body:    { fontSize:14, color:"#4b5563", lineHeight:1.6 },
    label:   { fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:"0.8px", textTransform:"uppercase" },
    btnPrimary: { background:"#1a56db", color:"#fff", border:"none", padding:"11px 24px", borderRadius:8, fontFamily:"inherit", fontWeight:600, fontSize:14, cursor:"pointer" },
    btnOutline: { background:"#fff", color:"#1a56db", border:"1.5px solid #1a56db", padding:"10px 22px", borderRadius:8, fontFamily:"inherit", fontWeight:600, fontSize:14, cursor:"pointer" },
    btnGhost:   { background:"transparent", color:"#6b7280", border:"1px solid #e5e7eb", padding:"9px 18px", borderRadius:8, fontFamily:"inherit", fontSize:13, cursor:"pointer" },
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F9FAFB", fontFamily:"'Inter',system-ui,sans-serif", color:"#111827" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}input[type=range]{-webkit-appearance:none;height:4px;background:#E5E7EB;border-radius:2px;outline:none}input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#1a56db;cursor:pointer}.fade{animation:fi .2s ease}@keyframes fi{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}button:active{opacity:.85}`}</style>

      {/* NAV */}
      <nav style={{ background:"#fff", borderBottom:"1px solid #e5e7eb", padding:"0 20px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:960, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 }}>
          <button type="button" onClick={() => setPage("home")} style={{ display:"flex", alignItems:"center", gap:8, background:"transparent", border:"none", cursor:"pointer", padding:0 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:"#1a56db", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🦾</div>
            <span style={{ fontWeight:700, fontSize:16, color:"#111827" }}>Моторика</span>
          </button>
          {page === "home"
        ? <button type="button" onClick={() => setPage("survey")} style={SS.btnPrimary}>Примерить онлайн</button>
        : <button type="button" onClick={resetAll} style={SS.btnGhost}>← На главную</button>
      }
        </div>
      </nav>

      {/* ══════════ ГЛАВНАЯ ══════════ */}
      {page === "home" && (
        <div style={{ maxWidth:960, margin:"0 auto", padding:"32px 20px 60px" }}>

          {/* Hero */}
          <div style={{ ...SS.card, marginBottom:28, padding:"40px 32px", background:"linear-gradient(135deg,#EFF6FF,#fff)", border:"1px solid #BFDBFE" }}>
            <div style={{ display:"inline-block", background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:20, padding:"4px 14px", fontSize:12, fontWeight:600, color:"#1a56db", marginBottom:16 }}>
              Онлайн-примерка протеза
            </div>
            <h1 style={{ ...SS.h1, fontSize:30, marginBottom:12, maxWidth:520 }}>Примерьте протез на своё фото — без визита в клинику</h1>
            <p style={{ ...SS.body, maxWidth:480, marginBottom:28 }}>
              Загрузите фото, выберите модель из каталога и расположите протез на культе. Никакой регистрации и сложных технологий — просто drag&drop.
            </p>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              <button type="button" onClick={() => setPage("survey")} style={SS.btnPrimary}>Начать примерку</button>
              <button type="button" style={SS.btnOutline}>Смотреть каталог</button>
            </div>
          </div>

          {/* 3 шага */}
          <div style={{ marginBottom:28 }}>
            <p style={{ ...SS.label, marginBottom:16 }}>Как это работает — 3 шага</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12 }}>
              {[
                ["1","Загрузите фото","Сфотографируйтесь так, чтобы культя была видна полностью","#EFF6FF","#1a56db"],
                ["2","Выберите протез","Выберите модель из каталога и загрузите её PNG-изображение","#ECFDF5","#059669"],
                ["3","Подгоните вручную","Перетащите протез, задайте размер и угол ползунками","#F5F3FF","#7c3aed"],
              ].map(([n,t,d,bg,c]) => (
                <div key={n} style={{ background:bg, borderRadius:10, padding:"18px 16px", border:`1px solid ${c}22` }}>
                  <div style={{ width:30, height:30, borderRadius:8, background:c, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:14, color:"#fff", marginBottom:10 }}>{n}</div>
                  <div style={{ fontWeight:600, fontSize:14, color:"#111827", marginBottom:4 }}>{t}</div>
                  <div style={{ fontSize:12, color:"#6b7280", lineHeight:1.6 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Каталог-превью */}
          <div>
            <p style={{ ...SS.label, marginBottom:16 }}>Виды протезов</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:12 }}>
              {[
                { level:"Плечо",       type:"Бионический", icon:"💪", bg:"#EFF6FF", border:"#93C5FD", text:"#1e40af", desc:"Активное управление плечевым протезом" },
                { level:"Предплечье",  type:"Бионический", icon:"🤖", bg:"#EFF6FF", border:"#93C5FD", text:"#1e40af", desc:"6 режимов хвата, миоэлектрика" },
                { level:"Предплечье",  type:"Тяговый",     icon:"✊", bg:"#ECFDF5", border:"#6EE7B7", text:"#065f46", desc:"Надёжный механический протез" },
                { level:"Кисть",       type:"Бионический", icon:"🤖", bg:"#EFF6FF", border:"#93C5FD", text:"#1e40af", desc:"Управление каждым пальцем" },
                { level:"Кисть",       type:"Тяговый",     icon:"🤌", bg:"#ECFDF5", border:"#6EE7B7", text:"#065f46", desc:"Подвижное запястье, без батарей" },
              ].map((s,i) => (
                <div key={i} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:10, padding:16, cursor:"pointer" }} onClick={() => setPage("tryon")}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <span style={{ fontSize:24 }}>{s.icon}</span>
                    <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, background:"rgba(255,255,255,.7)", border:`1px solid ${s.border}`, color:s.text }}>{s.type}</span>
                  </div>
                  <div style={{ fontWeight:700, fontSize:14, color:s.text, marginBottom:4 }}>{s.level}</div>
                  <div style={{ fontSize:12, color:"#4b5563", lineHeight:1.5, marginBottom:10 }}>{s.desc}</div>
                  <div style={{ fontSize:12, fontWeight:600, color:s.text }}>Примерить →</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ ОПРОС ══════════ */}
      {page === "survey" && (
        <div style={{ maxWidth:560, margin:"0 auto", padding:"32px 20px 60px" }}>
          {/* Прогресс */}
          <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:28, background:"#fff", borderRadius:10, border:"1px solid #e5e7eb" }}>
            {["Сторона руки","Вид протезирования","Выбор модели"].map((s,i)=>{
              const done = (i===0&&survSide)||(i===1&&survLevel)||(i===2&&false);
              const active = (i===0&&!survSide)||(i===1&&survSide&&!survLevel)||(i===2&&survSide&&survLevel);
              return(
                <div key={i} style={{ flex:1, textAlign:"center", padding:"12px 6px", borderBottom:`2px solid ${active?"#1a56db":"transparent"}` }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                    <div style={{ width:20,height:20,borderRadius:"50%",background:done?"#1a56db":active?"#EFF6FF":"#f3f4f6",border:`2px solid ${done||active?"#1a56db":"#e5e7eb"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:done?"#fff":active?"#1a56db":"#9ca3af",flexShrink:0 }}>
                      {done?"✓":i+1}
                    </div>
                    <span style={{ fontSize:12,fontWeight:active?600:400,color:active?"#1a56db":done?"#374151":"#9ca3af" }}>{s}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Шаг 1 — Сторона */}
          {!survSide && (
            <div className="fade">
              <h2 style={{ ...SS.h2, marginBottom:6 }}>Какая рука?</h2>
              <p style={{ ...SS.body, marginBottom:24 }}>Выберите сторону, которой требуется протезирование</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                {[{id:"right",label:"Правая рука",emoji:"✋",sub:"Правосторонняя ампутация"},{id:"left",label:"Левая рука",emoji:"🤚",sub:"Левосторонняя ампутация"}].map(s=>(
                  <button key={s.id} type="button" onClick={()=>setSurvSide(s.id)}
                    style={{ background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:14, padding:"28px 16px", cursor:"pointer", textAlign:"center", fontFamily:"inherit", transition:"border-color .15s" }}
                    onMouseOver={e=>e.currentTarget.style.borderColor="#1a56db"}
                    onMouseOut={e=>e.currentTarget.style.borderColor="#e5e7eb"}>
                    <div style={{ fontSize:48, marginBottom:12 }}>{s.emoji}</div>
                    <div style={{ fontWeight:700, fontSize:16, color:"#111827", marginBottom:4 }}>{s.label}</div>
                    <div style={{ fontSize:12, color:"#6b7280" }}>{s.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Шаг 2 — Уровень */}
          {survSide && !survLevel && (
            <div className="fade">
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
                <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:8, padding:"4px 12px", fontSize:13, fontWeight:600, color:"#1a56db" }}>
                  {survSide==="right"?"✋ Правая рука":"🤚 Левая рука"}
                </div>
                <button type="button" onClick={()=>setSurvSide(null)} style={{ fontSize:12, color:"#6b7280", background:"transparent", border:"none", cursor:"pointer", textDecoration:"underline" }}>изменить</button>
              </div>
              <h2 style={{ ...SS.h2, marginBottom:6 }}>Вид протезирования</h2>
              <p style={{ ...SS.body, marginBottom:24 }}>Выберите уровень ампутации</p>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {SURVEY_LEVELS.map(l=>(
                  <button key={l.id} type="button" onClick={()=>setSurvLevel(l.id)}
                    style={{ background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:14, padding:"20px 22px", cursor:"pointer", textAlign:"left", fontFamily:"inherit", display:"flex", alignItems:"center", gap:16 }}
                    onMouseOver={e=>e.currentTarget.style.borderColor="#1a56db"}
                    onMouseOut={e=>e.currentTarget.style.borderColor="#e5e7eb"}>
                    <span style={{ fontSize:36, flexShrink:0 }}>{l.emoji}</span>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15, color:"#111827", marginBottom:3 }}>{l.label}</div>
                      <div style={{ fontSize:13, color:"#6b7280" }}>{l.sub}</div>
                    </div>
                    <span style={{ marginLeft:"auto", color:"#d1d5db", fontSize:20 }}>›</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Шаг 3 — Выбор модели */}
          {survSide && survLevel && (
            <div className="fade">
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20, flexWrap:"wrap" }}>
                <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:8, padding:"4px 12px", fontSize:13, fontWeight:600, color:"#1a56db" }}>
                  {survSide==="right"?"✋ Правая":"🤚 Левая"}
                </div>
                <div style={{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:8, padding:"4px 12px", fontSize:13, fontWeight:600, color:"#15803d" }}>
                  {SURVEY_LEVELS.find(l=>l.id===survLevel)?.emoji} {SURVEY_LEVELS.find(l=>l.id===survLevel)?.label}
                </div>
                <button type="button" onClick={()=>setSurvLevel(null)} style={{ fontSize:12, color:"#6b7280", background:"transparent", border:"none", cursor:"pointer", textDecoration:"underline" }}>изменить</button>
              </div>
              <h2 style={{ ...SS.h2, marginBottom:6 }}>Подходящие протезы</h2>
              <p style={{ ...SS.body, marginBottom:20 }}>Выберите модель для примерки</p>
              <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:24 }}>
                {surveyPros.map(p=>(
                  <div key={p.id}
                    style={{ background:"#fff", border:`1.5px solid ${selProsId===p.id?"#1a56db":"#e5e7eb"}`, borderRadius:14, overflow:"hidden", cursor:"pointer" }}
                    onClick={()=>{ setSelProsId(p.id); setSocketY(p.socketY); if(prosAssets[p.id])setProsUrl(prosAssets[p.id]); else setProsUrl(null); }}>
                    <div style={{ display:"flex", gap:14, padding:"16px 18px", alignItems:"center" }}>
                      {/* Превью */}
                      <div style={{ width:64, height:64, borderRadius:10, background:p.type==="bionic"?"#EFF6FF":"#ECFDF5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, flexShrink:0, overflow:"hidden" }}>
                        {prosAssets[p.id]
                          ? <img src={prosAssets[p.id]} alt="" style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
                          : (p.type==="bionic"?"🤖":"✊")}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                          <span style={{ fontWeight:700, fontSize:15, color:"#111827" }}>{p.name}</span>
                          <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, background:p.type==="bionic"?"#DBEAFE":"#D1FAE5", color:p.type==="bionic"?"#1e40af":"#065f46" }}>{TYPE_LABEL[p.type]}</span>
                        </div>
                        <div style={{ fontSize:13, color:"#6b7280", lineHeight:1.5 }}>{p.desc}</div>
                      </div>
                      {selProsId===p.id && <div style={{ width:22,height:22,borderRadius:"50%",background:"#1a56db",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,flexShrink:0 }}>✓</div>}
                    </div>
                    {/* Загрузка PNG */}
                    {selProsId===p.id && (
                      <div style={{ padding:"0 18px 16px", borderTop:"1px solid #f3f4f6" }}>
                        <Upload small accept="image/png,image/*"
                          onFile={async f=>{ await handleProsFile(f,p.id); const d=await readFile(f); setProsUrl(d.url); }}
                          label="📎 Загрузить PNG протеза (с прозрачным фоном)"
                          done={!!prosAssets[p.id]}
                          doneLabel="✓ PNG загружен — нажмите чтобы заменить"
                          style={{ marginTop:10 }}/>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={startTryon} disabled={!selProsId}
                style={{ ...SS.btnPrimary, width:"100%", padding:14, fontSize:15, opacity:selProsId?1:.4, cursor:selProsId?"pointer":"not-allowed" }}>
                Перейти к примерке →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════ ПРИМЕРКА ══════════ */}
      {page === "tryon" && (
        <div style={{ maxWidth:960, margin:"0 auto", padding:"24px 16px 48px" }}>
          <h2 style={{ ...SS.h2, marginBottom:4 }}>Примерка протеза</h2>
          <p style={{ ...SS.body, marginBottom:24 }}>Загрузите фото, выберите протез и подгоните положение вручную</p>

          <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1.4fr) minmax(0,1fr)", gap:20, alignItems:"start" }}>

            {/* Холст слева */}
            <div>
              {!photoUrl ? (
                <div style={{ ...SS.card, textAlign:"center", padding:48 }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>📷</div>
                  <div style={{ fontWeight:600, fontSize:16, marginBottom:8 }}>Загрузите фото пациента</div>
                  <p style={{ ...SS.body, fontSize:13, marginBottom:20, maxWidth:280, margin:"0 auto 20px" }}>
                    Культя должна быть видна полностью. Подойдёт любое фото — с телефона или фотоаппарата.
                  </p>
                  <Upload accept="image/*" onFile={handlePhoto} label="📎 Выбрать фото" done={false} />
                </div>
              ) : (
                <div>
                  <TryOnCanvas photoUrl={photoUrl} prosUrl={prosUrl} socketY={socketY} />
                  <div style={{ marginTop:10, display:"flex", gap:8 }}>
                    <Upload accept="image/*" onFile={handlePhoto} label="Заменить фото" done={true} doneLabel="Заменить фото" small style={{ flex:1 }} />
                    <button type="button" onClick={() => { setPhotoUrl(null); setProsUrl(null); setSelProsId(null); }} style={{ ...SS.btnGhost, fontSize:12, padding:"7px 14px" }}>Сбросить всё</button>
                  </div>
                </div>
              )}
            </div>

            {/* Панель справа */}
            <div>
              {/* Советы */}
              <div style={{ ...SS.cardSm, marginBottom:16, background:"#EFF6FF", border:"1px solid #BFDBFE" }}>
                <div style={{ fontWeight:600, fontSize:13, color:"#1e40af", marginBottom:8 }}>Советы для точной примерки</div>
                {[
                  "Сфотографируйтесь так, чтобы культя была видна полностью",
                  "Загрузите PNG протеза с прозрачным фоном для лучшего результата",
                  "Используйте ползунок прозрачности чтобы проверить посадку",
                  "Два пальца на экране = масштаб и поворот",
                ].map((t,i) => (
                  <div key={i} style={{ fontSize:12, color:"#1e40af", display:"flex", gap:8, marginBottom:4 }}>
                    <span style={{ flexShrink:0, fontWeight:700 }}>{i+1}.</span>{t}
                  </div>
                ))}
              </div>

              {/* Результаты опроса */}
              {survSide && survLevel && (
                <div style={{ ...SS.cardSm, marginBottom:12, background:"#F0F9FF", border:"1px solid #BAE6FD", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                  <span style={{ fontSize:12, color:"#0369a1", fontWeight:600 }}>Ваш выбор:</span>
                  <span style={{ fontSize:12, color:"#0369a1" }}>{survSide==="right"?"✋ Правая":"🤚 Левая"} рука</span>
                  <span style={{ color:"#BAE6FD" }}>·</span>
                  <span style={{ fontSize:12, color:"#0369a1" }}>{SURVEY_LEVELS.find(l=>l.id===survLevel)?.emoji} {SURVEY_LEVELS.find(l=>l.id===survLevel)?.label}</span>
                  <button type="button" onClick={()=>setPage("survey")} style={{ marginLeft:"auto", fontSize:11, color:"#0369a1", background:"transparent", border:"1px solid #BAE6FD", borderRadius:6, padding:"2px 8px", cursor:"pointer", fontFamily:"inherit" }}>Изменить</button>
                </div>
              )}

              {/* Список протезов */}
              <div style={{ ...SS.cardSm }}>
                <div style={{ ...SS.label, marginBottom:12 }}>
                  {surveyPros.length > 0 ? "Рекомендуемые протезы" : "Каталог протезов"}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {surveyPros.map(p => {
                    const asset = prosAssets[p.id];
                    const isSel = selProsId === p.id;
                    return (
                      <div key={p.id} style={{ border:`1.5px solid ${isSel?"#1a56db":"#e5e7eb"}`, borderRadius:10, overflow:"hidden", background:isSel?"#F0F7FF":"#fff" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", cursor:"pointer" }}
                          onClick={()=>{ setSelProsId(p.id); setSocketY(p.socketY); if(prosAssets[p.id])setProsUrl(prosAssets[p.id]); else setProsUrl(null); }}>
                          <div style={{ width:48,height:48,borderRadius:8,background:p.type==="bionic"?"#EFF6FF":"#ECFDF5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,overflow:"hidden" }}>
                            {asset ? <img src={asset} alt="" style={{ width:"100%",height:"100%",objectFit:"contain" }}/> : (p.type==="bionic"?"🤖":"✊")}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:600, fontSize:13, color:"#111827" }}>{p.name}</div>
                            <div style={{ fontSize:11, color:"#6b7280" }}>
                              <span style={{ color:p.type==="bionic"?"#1a56db":"#059669", fontWeight:600 }}>{TYPE_LABEL[p.type]}</span>
                              {" · "}{p.desc}
                            </div>
                          </div>
                          {isSel && <div style={{ width:20,height:20,borderRadius:"50%",background:"#1a56db",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,flexShrink:0 }}>✓</div>}
                        </div>
                        {isSel && (
                          <div style={{ padding:"0 12px 12px", borderTop:"1px solid #e5e7eb" }}>
                            <Upload small accept="image/png,image/*"
                              onFile={async f=>{ await handleProsFile(f,p.id); const d=await readFile(f); setProsUrl(d.url); }}
                              label="📎 Загрузить PNG протеза"
                              done={!!asset} doneLabel="✓ PNG загружен — заменить"
                              style={{ marginTop:10 }}/>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
