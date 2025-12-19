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

  "home": 1400,
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
  "PersonalOverview": 2575,
  "PersonalFavourite": 1000,
  "PersonalGameweek": 2300,
  "PersonalPersonel": 2000,
  "PersonalTransfers": 1000,
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

      const key = btn.getAttribute('data-key');
      if (!key) return;

      currentVizKey = key;
      loadVizByKey(key);
      closeDrawer();

      // close drawer on mobile after a selection for clean UX
      closeDrawer();
    });
  });
}

function setActiveByKey(key) {
  // clear existing active states
  document
    .querySelectorAll('.top-nav-btn, .drawer-link')
    .forEach(el => el.classList.remove('active'));

  if (!key) return;

  // set active on all matching keys (desktop + drawer)
  document
    .querySelectorAll(`[data-key="${key}"]`)
    .forEach(el => el.classList.add('active'));
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
  updatePersonalMenuState();
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

const vizRegistry = {
  "24_25": {
    home: "https://public.tableau.com/views/FFBook-GameweekWinnersDashboard/GameweekTables?:showVizHome=no&:embed=true",

    GameweekWinners: "https://public.tableau.com/views/FFBook-GameweekWinnersDashboard/GameweekTables?:showVizHome=no&:embed=true",
    GameweekWeekWinners: "https://public.tableau.com/views/FantasyResults2024-GameweekWinnersTablesDashboard/GameweekWinnersTables?:showVizHome=no&:embed=true",
    GameweekTables: "https://public.tableau.com/views/FantasyResults2024-GameweekTablesDashboard/GameweekTables?:showVizHome=no&:embed=true",
    ChipTables: "https://public.tableau.com/views/FantasyResults2024-ChipsTablesDashboard/ChipTables?:showVizHome=no&:embed=true",
    
    TransfersOverview: "https://public.tableau.com/views/FantasyResults2024-TransferMasterDashboard/TransferStats?:showVizHome=no&:embed=true",
    TransfersFootballers: "https://public.tableau.com/views/FantasyResults2024-TransferFootballersDashboard/TransferStats?:showVizHome=no&:embed=true",
    TransfersPlayers: "https://public.tableau.com/views/FantasyResults2024-TransferPlayersDashboard/TransferStats?:showVizHome=no&:embed=true",
    TransfersChipFree: "https://public.tableau.com/views/FantasyResults2024-TransferChipFreeDashboard/TransferStats?:showVizHome=no&:embed=true",
    TransfersChip: "https://public.tableau.com/views/FantasyResults2024-TransferChipDashboard/TransferStats?:showVizHome=no&:embed=true",
    
    TransfersTimeHours: "https://public.tableau.com/views/FantasyResults2024-TransferHoursDashboard/TransferStats?:showVizHome=no&:embed=true",
    TransfersTimeDays: "https://public.tableau.com/views/FantasyResults2024-TransferDaysDashboard/TransferStats?:showVizHome=no&:embed=true",
    TransfersTimeMonths: "https://public.tableau.com/views/FantasyResults2024-TransferMonthsDashboard/TransferStats?:showVizHome=no&:embed=true",
    TransfersTimeDate: "https://public.tableau.com/views/FantasyResults2024-TransferTimeDateDashboard/TransferStats?:showVizHome=no&:embed=true",
  },

  "25_26": {
    home: "https://public.tableau.com/views/FantasyResults2025-GameweekWinnersDashboard/GameweekTables?:showVizHome=no&:embed=true",

    GameweekWinners: "https://public.tableau.com/views/FantasyResults2025-GameweekWinnersDashboard/GameweekTables?:showVizHome=no&:embed=true",
    GameweekWeekWinners: "https://public.tableau.com/views/FantasyResults2025-GameweekWinnersTablesDashboard/GameweekWinnersTables?:showVizHome=no&:embed=true",
    GameweekTables: "https://public.tableau.com/views/FantasyResults2025-GameweekTablesDashboard/GameweekTables?:showVizHome=no&:embed=true",
    ChipTables: "https://public.tableau.com/views/FantasyResults2025-ChipsTablesDashboard/ChipTables?:showVizHome=no&:embed=true",
    
    TransfersOverview: "https://public.tableau.com/views/FantasyResults2025-TransferMasterDashboard/TransferStats?:showVizHome=no&:embed=true",
    TransfersFootballers: "https://public.tableau.com/views/FantasyResults2025-TransferFootballersDashboard/TransferStats?:showVizHome=no&:embed=true",
    TransfersPlayers: "https://public.tableau.com/views/FantasyResults2025-TransferPlayersDashboard/TransferStats?:showVizHome=no&:embed=true",
    TransfersChipFree: "https://public.tableau.com/views/FantasyResults2025-TransferChipFreeDashboard/TransferStats?:showVizHome=no&:embed=true",
    TransfersChip: "https://public.tableau.com/views/FantasyResults2025-TransferChipDashboard/TransferStats?:showVizHome=no&:embed=true",
    
    TransfersTimeHours: "https://public.tableau.com/views/FantasyResults2025-TransferHoursDashboard/TransferStats?:showVizHome=no&:embed=true",
    TransfersTimeDays: "https://public.tableau.com/views/FantasyResults2025-TransferDaysDashboard/TransferStats?:showVizHome=no&:embed=true",
    TransfersTimeMonths: "https://public.tableau.com/views/FantasyResults2025-TransferMonthsDashboard/TransferStats?:showVizHome=no&:embed=true",
    TransfersTimeDate: "https://public.tableau.com/views/FantasyResults2025-TransferTimeDateDashboard/TransferStats?:showVizHome=no&:embed=true",

    // New vizzes only exist in 25/26
    PersonalOverview: "https://public.tableau.com/views/FantasyResults2025-PersonalStatsMasterDashboard/Dashboard1?:showVizHome=no&:embed=true",
    PersonalFavourite: "https://public.tableau.com/views/FantasyResults2025-PersonalStatsFavouritesDashboard/Dashboard1?:showVizHome=no&:embed=true",
    PersonalGameweek: "https://public.tableau.com/views/FantasyResults2025-PersonalStatsGameweekPerformancesDashboard/Dashboard1?:showVizHome=no&:embed=true",
    PersonalPersonel: "https://public.tableau.com/views/FantasyResults2025-PersonalStatsPersonalPerformersDashboard/Dashboard1?:showVizHome=no&:embed=true",
    PersonalTransfers: "https://public.tableau.com/views/FantasyResults2025-PersonalStatsTransfersDashboard/Dashboard1?:showVizHome=no&:embed=true"
  }
};

function updatePersonalMenuState() {
  const isEnabled = currentSeason === "25_26";

  document.querySelectorAll('[data-group="personal"]').forEach(group => {
    group.classList.toggle('disabled', !isEnabled);

    // disable all buttons inside
    group.querySelectorAll('button').forEach(btn => {
      btn.disabled = !isEnabled;
      btn.setAttribute('aria-disabled', String(!isEnabled));
    });

    // collapse drawer submenu if disabled
    const sub = group.querySelector('.drawer-sub');
    if (sub && !isEnabled) {
      sub.style.display = 'none';
    }
  });
}


let currentSeason = "24_25";
let currentVizKey = null;

function loadVizByKey(vizKey) {
  const seasonVizzes = vizRegistry[currentSeason];
  let baseUrl;
  let resolvedKey;

  if (seasonVizzes[vizKey]) {
    baseUrl = seasonVizzes[vizKey];
    resolvedKey = vizKey;
  } else {
    baseUrl = seasonVizzes.home;
    resolvedKey = "home";
  }

  currentVizKey = resolvedKey;

  // ✅ apply green highlighting
  setActiveByKey(resolvedKey);

  // render viz
  loadDashboard(baseUrl, resolvedKey);
}

const seasonSelect = document.getElementById("seasonSelect");

seasonSelect.addEventListener("change", () => {
  currentSeason = seasonSelect.value;

  updatePersonalMenuState();

  if (currentVizKey) {
    loadVizByKey(currentVizKey);
  } else {
    loadVizByKey("home");
  }
});



// Load default home dashboard on page load
loadVizByKey("home");