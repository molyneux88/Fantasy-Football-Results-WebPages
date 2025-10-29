/* script.js (updated)
   - robust drawer toggle
   - submenu toggles
   - unified click handler for elements with data-url
   - active highlighting (syncs by data-key)
   - closes drawer after selection on mobile
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

// Small map of heights (optional)
const vizHeights = {
  "GameweekWinners": 1750,
  "GameweekWeekWinners": 1700,
  "GameweekTables": 1000,
  "ChipTables": 2000,
  "TransfersOverview": 2500,
  "TransfersFootballers": 6000,
  "TransfersPlayers": 2800,
  "TransfersChipFree": 1900,
  "TransfersChip": 1000,
  "TransfersTimeHours": 1300,
  "TransfersTimeDays": 1500,
  "TransfersTimeMonths": 1500,
  "TransfersTimeDate": 6000,
};

// utils
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

// --------------------
// Drawer open/close (toggle now)
function openDrawer(){
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden','false');
}
function closeDrawer(){
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden','true');
}
function toggleDrawer(){
  drawer.classList.toggle('open');
  drawer.setAttribute('aria-hidden', drawer.classList.contains('open') ? 'false' : 'true');
}

hamburger.addEventListener('click', (e)=>{ e.stopPropagation(); toggleDrawer(); });
drawerClose.addEventListener('click', ()=>{ closeDrawer(); });

// close drawer when clicking outside inner area
drawer.addEventListener('click', (e)=>{
  if (e.target === drawer) closeDrawer();
});

// --------------------
// drawer submenu toggles (works for drawer-toggle class)
document.addEventListener('click', (e)=>{
  const toggle = e.target.closest('.drawer-toggle');
  if (toggle){
    e.preventDefault();
    e.stopPropagation();
    toggle.classList.toggle('open');
    const next = toggle.nextElementSibling;
    if (next) next.style.display = toggle.classList.contains('open') ? 'flex' : 'none';
    return;
  }

  const smallToggle = e.target.closest('.drawer-toggle.small');
  if (smallToggle){
    e.preventDefault();
    e.stopPropagation();
    smallToggle.classList.toggle('open');
    const next = smallToggle.nextElementSibling;
    if (next) next.style.display = smallToggle.classList.contains('open') ? 'flex' : 'none';
    return;
  }
});

// --------------------
// Attach nav handlers for any element that has a data-url attribute
function attachNavHandlers(){
  document.querySelectorAll('[data-url]').forEach(btn=>{
    // ensure we don't double-attach
    if (btn.__navBound) return;
    btn.__navBound = true;

    btn.addEventListener('click', (e)=>{
      e.stopPropagation();

      const url = btn.getAttribute('data-url') || '';
      const key = btn.getAttribute('data-key') || null;

      // remove active state from everything
    document.querySelectorAll('.top-nav-btn, .drawer-link').forEach(el=>el.classList.remove('active'));

    // set active on all elements that share the same data-key
    if (key) {
        document.querySelectorAll(`[data-key="${key}"]`).forEach(el=>el.classList.add('active'));
    } else {
        btn.classList.add('active');
    }

      // if no URL (placeholder), just close drawer and return
      if (!url || url.trim() === '') {
        closeDrawer();
        return;
      }

      // load the viz
      loadDashboard(url, key);

      // close drawer on mobile after a selection for clean UX
      closeDrawer();
    });
  });
}

// --------------------
// Load a Tableau viz (keeps the same height map approach)
function loadDashboard(baseUrl, key){
  const url = baseUrl + getDeviceParam();
  if (url === currentVizUrl) {
    console.log('same viz, skip reload');
    return;
  }

  showLoader();
  const loaderStart = Date.now();

  safeDisposeViz();
  container.innerHTML = '';

  // compute height from vizHeights (fallback to viewport)
  const height = (key && vizHeights[key]) ? vizHeights[key] : Math.max(window.innerHeight, 900);

  // set scroll container height so outer scrollbar appears
  // use viewport height so page can scroll if viz is taller
  scrollContainer.style.height = Math.max(window.innerHeight, 400) + 'px';

  const vizDiv = document.createElement('div');
  vizDiv.className = 'vizFrame';
  vizDiv.style.minHeight = height + 'px';
  container.appendChild(vizDiv);

  // create Tableau viz
  currentViz = new tableau.Viz(vizDiv, url, {
    hideTabs: true,
    hideToolbar: true,
    width: '100%',
    height: height + 'px'
  });

  // wait for iframe then force attributes
  const waitForIframe = setInterval(()=>{
    const iframe = vizDiv.querySelector('iframe');
    if (iframe){
      clearInterval(waitForIframe);
      try {
        iframe.setAttribute('scrolling', 'no'); // disable internal scroll
        iframe.style.width = '100%';
        iframe.style.height = height + 'px';
        iframe.style.overflow = 'hidden';
      } catch(e){ console.warn('iframe styling failed', e); }

      // ensure container heights match so outer scroll works
      vizDiv.style.height = height + 'px';
      container.style.height = height + 'px';
      scrollContainer.style.height = Math.max(window.innerHeight, 400) + 'px';

      setTimeout(()=>{
        vizDiv.classList.add('active');
        hideLoader(loaderStart);
        currentVizUrl = url;
      }, 300);
    }
  }, 160);
}

// --------------------
// Init on DOM ready
document.addEventListener('DOMContentLoaded', ()=>{
  attachNavHandlers();

  // auto-load first data-url element (prefer top-nav if present)
  const firstTop = document.querySelector('.top-nav-btn[data-url]');
  const firstDrawer = document.querySelector('.drawer-link[data-url]');
  const first = firstTop || firstDrawer || document.querySelector('[data-url]');
  if (first){
    // set active for same-key elements
    const key = first.getAttribute('data-key') || null;
    if (key) document.querySelectorAll(`[data-key="${key}"]`).forEach(el=>el.classList.add('active'));
    else first.classList.add('active');

    loadDashboard(first.getAttribute('data-url'), key);
  }
});

// --------------------
// Responsive reload on resize (debounced)
let resizeTimer = null;
window.addEventListener('resize', ()=>{
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(()=>{
    if (currentVizUrl){
      // reload active one so Tableau can switch phone/desktop layout correctly
      const active = document.querySelector('[data-url].active');
      if (active) {
        const key = active.getAttribute('data-key') || null;
        loadDashboard(active.getAttribute('data-url'), key);
      }
    }
  }, 400);
});
