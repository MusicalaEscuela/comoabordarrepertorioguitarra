/* =========================================================
   Musicala · Utilidades base + UX polish para guías
   - Funciona sin config externa (data-config)
   - Si agregas data-config, también levanta meta/brand/textos
   ========================================================= */

/* ---------- Helpers ---------- */
const $  = (q, el = document) => el.querySelector(q);
const $$ = (q, el = document) => [...el.querySelectorAll(q)];

const toastEl = $('#toast');
function showToast(msg){
  if(!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(showToast.tid);
  showToast.tid = setTimeout(()=> toastEl.classList.remove('show'), 1800);
}

/* ---------- Carga JSON opcional con fallback ----------
   - Si el <main id="app"> tiene data-config="ruta.json"
     intentará cargarla. Si falla, usa #APP_FALLBACK_JSON si existe. */
async function loadConfig(){
  const app = $('#app');
  const url = app?.dataset?.config;
  if(!url) return {};
  try{
    const res = await fetch(url, { cache:'no-store' });
    if(!res.ok) throw new Error('HTTP '+res.status);
    return await res.json();
  }catch(e){
    console.warn('Fallo fetch, usando fallback embebido.', e);
    const raw = $('#APP_FALLBACK_JSON')?.textContent || '{}';
    try { return JSON.parse(raw); } catch { return {}; }
  }
}

/* ---------- Meta/Brand dinámicos (opcional) ---------- */
function setMeta(meta = {}){
  if(meta.title) document.title = meta.title;

  if(meta.description){
    let m = document.querySelector('meta[name="description"]');
    if(!m){
      m = document.createElement('meta');
      m.setAttribute('name', 'description');
      document.head.appendChild(m);
    }
    m.setAttribute('content', meta.description);
  }

  if(meta.themeColor){
    let m = document.querySelector('meta[name="theme-color"]');
    if(!m){
      m = document.createElement('meta');
      m.setAttribute('name', 'theme-color');
      document.head.appendChild(m);
    }
    m.setAttribute('content', meta.themeColor);
  }
}

/* ---------- Audio CTA (si se usa en otras guías) ---------- */
function initAudio(cfg){
  const audio = $('#audio');
  const btn   = $('#btnPlay');
  const lab   = $('#ctaLabel');

  if(!audio || !btn || !lab) return;

  audio.innerHTML = '';
  if(cfg.src){
    const s = document.createElement('source');
    s.src = cfg.src; s.type = cfg.type || 'audio/mpeg';
    audio.appendChild(s);
  }else if(Array.isArray(cfg.sources)){
    cfg.sources.forEach(x=>{
      const s = document.createElement('source');
      s.src = x.src; s.type = x.type || 'audio/mpeg';
      audio.appendChild(s);
    });
  }

  const idleA   = cfg.cta_idle    || 'Empecemos';
  const idleB   = cfg.cta_alt     || '¡Haz click aquí!';
  const playing = cfg.cta_playing || 'Pausar';

  let altTimer = null;
  const startBlink = () => {
    stopBlink();
    lab.textContent = idleA;
    altTimer = setInterval(()=> lab.textContent = (lab.textContent===idleA? idleB : idleA), 1700);
  };
  const stopBlink = () => { if(altTimer){ clearInterval(altTimer); altTimer=null; } };

  startBlink();

  btn.addEventListener('click', async ()=>{
    try{
      if(audio.paused){
        await audio.play();
        btn.setAttribute('aria-pressed','true');
        lab.textContent = playing; stopBlink();
        showToast('▶ Audio reproduciéndose');
      }else{
        audio.pause();
        btn.setAttribute('aria-pressed','false');
        startBlink(); showToast('⏸ Audio en pausa');
      }
    }catch(e){
      showToast('Activa el sonido del navegador para escuchar');
      console.error(e);
    }
  });

  audio.addEventListener('ended', ()=>{
    btn.setAttribute('aria-pressed','false');
    startBlink();
  });

  window.addEventListener('pagehide', ()=>{ if(!audio.paused) audio.pause(); });
}

/* ---------- Render helpers (por si reaprovechas motor dinámico) ---------- */
function renderKeywords(list = []){
  const box = $('#keywords');
  const hint = $('#chipsHint');
  if(!box) return;
  if(!list.length){ box.hidden = true; if(hint) hint.hidden = true; return; }
  box.hidden = false; if(hint) hint.hidden = false;
  box.innerHTML = '';
  list.forEach(k=>{
    const span = document.createElement('span');
    span.className = 'keyword';
    span.textContent = k;
    box.appendChild(span);
  });
}

function renderExplain(blocks = [], title = 'Explicación detallada'){
  const host = $('#explainBlocks');
  if(!host) return;
  const ttl = $('#explainTitle'); if(ttl) ttl.textContent = title;
  host.innerHTML = '';
  blocks.forEach((b,i)=>{
    const det = document.createElement('details');
    det.className = 'ac'; if(i===0) det.open = true;
    det.innerHTML = `
      <summary>${b.heading||('Sección '+(i+1))}</summary>
      ${(b.paragraphs||[]).map(p=>`<p>${p}</p>`).join('')}
      ${b.hint ? `<p class="hint">${b.hint}</p>`:''}
    `;
    det.addEventListener('toggle', ()=>{
      if(det.open){
        $$('#explainBlocks details.ac').forEach(x=>{ if(x!==det) x.open=false; });
      }
    });
    host.appendChild(det);
  });
}

function renderTabs(tabsData){
  const tabs = $('#tabs'), panels = $('#tabPanels');
  if(!tabs || !panels || !tabsData || !tabsData.tabs || !tabsData.panels) return;
  tabs.innerHTML = ''; panels.innerHTML = '';

  tabsData.tabs.forEach((t,i)=>{
    const b = document.createElement('button');
    b.className = 'tab'; b.dataset.tab = t.key; b.textContent = t.label;
    b.setAttribute('aria-selected', i===0?'true':'false');
    tabs.appendChild(b);
  });

  tabsData.panels.forEach((p,i)=>{
    const div = document.createElement('div');
    div.id = 'panel-'+p.key; div.hidden = i!==0;
    if(Array.isArray(p.items)){
      const ul = document.createElement('ul'); ul.className='list-clean';
      p.items.forEach(item=>{ const li=document.createElement('li'); li.innerHTML=item; ul.appendChild(li); });
      div.appendChild(ul);
    }else if(p.html){ div.innerHTML = p.html; }
    panels.appendChild(div);
  });

  $$('.tab', tabs).forEach(tb=>{
    tb.addEventListener('click', ()=>{
      $$('.tab', tabs).forEach(t=>t.setAttribute('aria-selected','false'));
      tb.setAttribute('aria-selected','true');
      const key = tb.dataset.tab;
      $$('#tabPanels > div').forEach(div=> div.hidden = (div.id !== 'panel-'+key));
    });
  });
}

function renderExamples(items = []){
  const sec = $('#section-examples');
  const grid = $('#examplesGrid');
  if(!grid) return;
  if(!items.length){ if(sec) sec.hidden = true; return; }
  if(sec) sec.hidden = false; grid.innerHTML = '';
  items.forEach(ex=>{
    const art = document.createElement('article');
    art.className = 'card example-card';
    const badges = (ex.tags||[]).map(t=>`<span class="badge">${t[0].toUpperCase()+t.slice(1)}</span>`).join('');
    art.innerHTML = `${badges}<h3>${ex.title||''}</h3><p class="muted">${ex.desc||''}</p>`;
    grid.appendChild(art);
  });
}

/* list: string | {title, desc, icon} */
function renderRoutine(list = [], title='Cómo aplicarlo en tu rutina', subtitle='', tip=''){
  const sec = $('#section-routine');
  const ol  = $('#routineList');
  const h   = $('#routineTitle');
  const sub = $('#routineSubtitle');
  const tipBox = $('#routineTip');

  if(!ol) return;

  if(!list.length){ if(sec) sec.hidden = true; return; }
  if(sec) sec.hidden = false;
  if(h) h.textContent = title;
  if(subtitle){ if(sub){ sub.textContent = subtitle; sub.hidden = false; } }
  else{ if(sub) sub.hidden = true; }

  ol.innerHTML = '';
  list.forEach((it,idx)=>{
    let titleTxt, descTxt, iconTxt;
    if (typeof it === 'string'){
      titleTxt = `Paso ${idx+1}`;
      descTxt  = it;
      iconTxt  = '';
    } else {
      titleTxt = it.title || `Paso ${idx+1}`;
      descTxt  = it.desc  || it.text || '';
      iconTxt  = it.icon  || '';
    }

    const li = document.createElement('li');
    li.className='step';
    li.innerHTML = `
      <span class="badge">${idx+1}</span>
      <h4>${iconTxt ? `<span class="icon">${iconTxt}</span>` : ''}${titleTxt}</h4>
      <p>${descTxt}</p>
    `;
    ol.appendChild(li);
  });

  if(tipBox){
    if(tip){ tipBox.hidden = false; tipBox.querySelector('p').innerHTML = `<b>Consejo:</b> ${tip}`; }
    else{ tipBox.hidden = true; }
  }
}

function renderFooter(legal = {}){
  const year = legal.year || new Date().getFullYear();
  const email = legal.email || 'imusicala@gmail.com';
  const y = $('#copyYear'); if (y) y.textContent = year;
  const a = $('#copyEmail'); if (a){ a.href = `mailto:${email}`; a.textContent = email; }
}

/* ---------- UX Polish global (si no usas renders dinámicos) ---------- */

// 1) Acordeón: cerrar otros <details.ac> al abrir uno
document.addEventListener('toggle', (e) => {
  const el = e.target;
  if (el.tagName === 'DETAILS' && el.classList.contains('ac') && el.open) {
    document.querySelectorAll('details.ac[open]').forEach(d => {
      if (d !== el) d.open = false;
    });
  }
});

// 2) Scroll suave para anclas internas
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  const target = document.querySelector(id);
  if (target) {
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

// 3) Footer auto (año y correo) si no hay config
(() => {
  const y = $('#copyYear');
  if (y && !y.textContent) y.textContent = new Date().getFullYear();
  const mail = $('#copyEmail');
  if (mail && !mail.textContent) {
    mail.textContent = 'imusicala@gmail.com';
    mail.href = 'mailto:imusicala@gmail.com';
  }
})();

// 4) Toast global rápido
window.flash = (msg) => showToast(msg);

/* ====== Lite YouTube loader (video ligero) ====== */
(function initLiteYouTube(){
  const btns = document.querySelectorAll('.lite-video[data-yt]');
  if(!btns.length) return;

  btns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-yt');
      if(!id) return;

      // Usamos nocookie y autoplay; rel=0 y modestbranding para limpio
      const src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
      const iframe = document.createElement('iframe');
      iframe.className = 'lite-iframe';
      iframe.setAttribute('title','Video YouTube — Musicala');
      iframe.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.setAttribute('allowfullscreen','');
      iframe.setAttribute('loading','lazy');
      iframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
      iframe.src = src;

      btn.replaceChildren(iframe);
      if (window.flash) window.flash('▶ Reproduciendo video');
    }, { once:true });
  });
})();

/* ---------- Bootstrap ---------- */
(async function main(){
  // Carga opcional de config (solo si agregas data-config en #app)
  const cfg = await loadConfig();

  // Meta/brand dinámicos
  if(cfg.meta) setMeta(cfg.meta);
  if(cfg.brand?.logo){ const img = $('#brandLogo'); if(img) img.src = cfg.brand.logo; }
  if(cfg.meta?.title){ const h = $('#pageTitle'); if(h) h.textContent = cfg.meta.title; }
  if(cfg.meta?.subtitle){ const s = $('#pageSubtitle'); if(s) s.textContent = cfg.meta.subtitle; }

  // Hero opcional por config
  if(cfg.hero){
    $('#introEyebrow') && ($('#introEyebrow').textContent = cfg.hero.eyebrow || 'Introducción');
    $('#introTitle')   && ($('#introTitle').textContent   = cfg.hero.title   || 'Título de sección');
    $('#introLead')    && ($('#introLead').textContent    = cfg.hero.lead    || '');
    if(cfg.hero.image){
      const hi = $('#heroImg');
      if(hi){ hi.src = cfg.hero.image.src || ''; hi.alt = cfg.hero.image.alt || ''; }
    }
  }

  // Renders opcionales si traes contenido por JSON
  if(Array.isArray(cfg.keywords)) renderKeywords(cfg.keywords);
  if(cfg.explain?.blocks) renderExplain(cfg.explain.blocks, cfg.explain.title || 'Explicación detallada');
  if(cfg.tabs) renderTabs(cfg.tabs);
  if(cfg.examples?.items) renderExamples(cfg.examples.items);
  if(cfg.routine){
    renderRoutine(
      cfg.routine.items || [],
      cfg.routine.title || 'Cómo aplicarlo en tu rutina',
      cfg.routine.subtitle || '',
      cfg.routine.tip || ''
    );
  }

  if(cfg.audio) initAudio(cfg.audio);
  renderFooter(cfg.legal || {});
})();
