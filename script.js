let currentViz = null;
let currentVizUrl = null;
const loader = document.getElementById("loader");
const container = document.getElementById("vizContainer");
const scrollContainer = document.querySelector(".vizScrollContainer");
const MIN_LOADER_DURATION = 700;

// ==========================
// --- DASHBOARD HEIGHTS ---
// Add your dashboards here, key = data-key attribute, value = desired height in px
const vizHeights = {
  "GameweekWinners": 1600,
  "GameweekTables": 1800,
  "ChipTables": 1200,
  "TransferStats": 2000
};
// ==========================

function getDeviceParam() {
  return window.innerWidth <= 768 ? "&:device=phone" : "&:device=desktop";
}

function showLoader() { loader.classList.add("active"); }
function hideLoader(startTime) {
  const elapsed = Date.now() - startTime;
  const remaining = Math.max(MIN_LOADER_DURATION - elapsed, 0);
  setTimeout(() => loader.classList.remove("active"), remaining);
}

function safeDisposeViz() {
  try { if (currentViz?.dispose) currentViz.dispose(); } catch {}
  currentViz = null;
}

function loadDashboard(baseUrl, key) {
  const url = baseUrl + getDeviceParam();
  if (url === currentVizUrl) return;

  showLoader();
  const loaderStart = Date.now();
  safeDisposeViz();
  container.innerHTML = "";

  // --- Set height from predefined map ---
  const height = vizHeights[key] || window.innerHeight;
  scrollContainer.style.height = height + "px";

  // --- Create viz container ---
  const vizDiv = document.createElement("div");
  vizDiv.classList.add("vizFrame");
  container.appendChild(vizDiv);

  // --- Load Tableau viz ---
  currentViz = new tableau.Viz(vizDiv, url, {
    hideTabs: true,
    hideToolbar: true,
    width: "100%",
    height: height + "px",
  });

  // --- Poll for iframe to remove its internal scroll ---
  const waitForViz = setInterval(() => {
    const iframe = vizDiv.querySelector("iframe");
    if (iframe) {
      clearInterval(waitForViz);
      iframe.setAttribute("scrolling", "no"); // disables iframe scroll
      iframe.style.width = "100%";
      iframe.style.height = height + "px";

      vizDiv.classList.add("active");          // fade-in
      hideLoader(loaderStart);
      currentVizUrl = url;
    }
  }, 200);
}

// --- Nav buttons ---
document.querySelectorAll(".nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const key = btn.getAttribute("data-key");
    loadDashboard(btn.getAttribute("data-url"), key);
  });
});

// --- Load first dashboard ---
document.addEventListener("DOMContentLoaded", () => {
  const firstButton = document.querySelector(".nav button");
  if (firstButton) {
    firstButton.classList.add("active");
    const key = firstButton.getAttribute("data-key");
    loadDashboard(firstButton.getAttribute("data-url"), key);
  }
});

// --- Resize: reload for device switch ---
let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (currentVizUrl) {
      const activeBtn = document.querySelector(".nav button.active");
      if (activeBtn) {
        const key = activeBtn.getAttribute("data-key");
        loadDashboard(activeBtn.getAttribute("data-url"), key);
      }
    }
  }, 400);
});
