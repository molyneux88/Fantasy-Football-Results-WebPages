/* script.js
   - hamburger drawer
   - nested submenu toggles
   - integrates with Tableau viz loader & per-viz height map
*/

let currentViz = null;
let currentVizUrl = null;
const loader = document.getElementById('loader');
const container = document.getElementById('vizContainer');
const scrollContainer = document.querySelector('.vizScrollContainer');
const drawer = document.getElementById('drawer');
const hamburger = document.getElementById('hamburger');
const drawerClose = document.getElementById('drawer-close');
const MIN_LOADER_DURATION = 700; // ms

// ==========================
// --- DASHBOARD HEIGHTS ---
// Add/adjust heights (px) for each dashboard key below.
// Keys must match the data-key attributes on buttons.
const vizHeights = {
  "GameweekWinners": 1600,
  "GameweekTables": 1800,
  "ChipTables": 1200,
  "TransfersOverview": 2000,
  // add your custom keys & heights here
};
// ==========================

function getDeviceParam() {
  return window.innerWidth <= 768 ? '&:device=phone' : '&:device=desktop';
}

function showLoader(){ loader.classList.add('active'); }
function hideLoader(startTime){
  const elapsed = Date.now() - startTime;
  const remaining = Math.max(MIN_LOADER_DURATION - elapsed, 0);
  setTimeout(()=>loader.classList.remove('active'), remaining);
}

function safeDisposeViz(){
  try { if (currentViz && typeof currentViz.dispose === 'function') currentViz.dispose(); }
  catch(e){ console.warn('dispose failed', e); }
  currentViz = null;
}

// --- OPEN / CLOSE DRAWER
hamburger.addEventListener('click', ()=>{ drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false'); });
drawerClose.addEventListener('click', ()=>{ drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); });

// close drawer if user taps backdrop (click outside inner)
drawer.addEventListener('click', (e)=>{
  if (e.target === drawer){ drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); }
});

// collapsible groups inside drawer
document.addEventListener('click', (e)=>{
  // handle drawer toggles
  const toggle = e.target.closest('.drawer-toggle');
  if (toggle){
    toggle.classList.toggle('open');
    const next = toggle.nextElementSibling;
    if (next) next.style.display = toggle.classList.contains('open') ? 'flex' : 'none';
    e.preventDefault(); return;
  }

  // small nested toggles
  const smallToggle = e.target.closest('.drawer-toggle.small');
  if (smallToggle){
    smallToggle.classList.toggle('open');
    const next = smallToggle.nextElementSibling;
    if (next) next.style.display = smallToggle.classList.contains('open') ? 'flex' : 'none';
    e.preventDefault(); return;
  }
});

// --- NAV BUTTONS (drawer + top-nav unified handler)
// handler will look for data-url on clicked element
function attachNavHandlers(){
  // all elements that can trigger a viz have data-url
  document.querySelectorAll('[data-url]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const url = btn.getAttribute('data-url');
      const key = btn.getAttribute('data-key') || null;
      if (!url || url.trim() === '') {
        // no url assigned — simply close drawer (for placeholder entries)
        drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true');
        return;
      }
      // visual active markers (top nav)
      document.querySelectorAll('.top-nav-btn, .drawer-link').forEach(el=>el.classList.remove('active'));
      btn.classList.add('active');

      // load the viz
      loadDashboard(url, key);

      // close drawer on mobile for a clean experience
      drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true');
    });
  });
}

// --- LOAD DASHBOARD (uses vizHeights mapping)
function loadDashboard(baseUrl, key){
  const url = baseUrl + getDeviceParam();
  if (url === currentVizUrl) return;
  showLoader();
  const loaderStart = Date.now();

  safeDisposeViz();
  container.innerHTML = '';

  // compute height
  const height = (key && vizHeights[key]) ? vizHeights[key] : Math.max(window.innerHeight, 900);
  // set scroll container height so outer scrollbar appears
  scrollContainer.style.height = Math.max(window.innerHeight, 400) + 'px';

  const vizDiv = document.createElement('div');
  vizDiv.className = 'vizFrame';
  vizDiv.style.minHeight = height + 'px';
  container.appendChild(vizDiv);

  // create tableau viz; height parameter helps tableau set initial size
  currentViz = new tableau.Viz(vizDiv, url, {
    hideTabs: true,
    hideToolbar: true,
    width: '100%',
    height: height + 'px'
  });

  // wait for iframe to appear, then force it to our height and hide its internal scroll
  const waitForIframe = setInterval(()=>{
    const iframe = vizDiv.querySelector('iframe');
    if (iframe){
      clearInterval(waitForIframe);
      try {
        iframe.setAttribute('scrolling', 'no');
        iframe.style.width = '100%';
        iframe.style.height = height + 'px';
        iframe.style.overflow = 'hidden';
      } catch(e){ console.warn(e); }

      // set vizDiv/viz container heights to exact height (ensures outer scroll works)
      vizDiv.style.height = height + 'px';
      container.style.height = height + 'px';
      // ensure outer scroll container can scroll (height = viewport)
      scrollContainer.style.height = Math.max(window.innerHeight, 400) + 'px';

      setTimeout(()=>{
        vizDiv.classList.add('active');
        hideLoader(loaderStart);
        currentVizUrl = url;
      }, 400);
    }
  }, 180);
}

// attach handlers on ready
document.addEventListener('DOMContentLoaded', ()=>{
  attachNavHandlers();
  // preload first viz key from first clickable with data-url
  const first = document.querySelector('[data-url]');
  if (first){ first.classList.add('active'); const key = first.getAttribute('data-key'); loadDashboard(first.getAttribute('data-url'), key); }
});

// responsive: when resizing, re-load if needed (debounced)
let resizeTimer = null;
window.addEventListener('resize', ()=>{
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(()=>{
    // if there's a current viz, reload it with the correct device param and height
    if (currentVizUrl){
      const active = document.querySelector('[data-url].active');
      if (active) {
        const key = active.getAttribute('data-key');
        loadDashboard(active.getAttribute('data-url'), key);
      }
    }
  }, 450);
});
