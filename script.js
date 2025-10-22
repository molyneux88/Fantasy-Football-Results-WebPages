let currentViz = null;
let currentVizUrl = null;
const loader = document.getElementById("loader");
const container = document.getElementById("vizContainer");
const MIN_LOADER_DURATION = 700; // ms

function getDeviceParam() {
  return window.innerWidth <= 768 ? "&:device=phone" : "&:device=desktop";
}

function showLoader() { loader.classList.add("active"); }

function hideLoader(startTime) {
  const elapsed = Date.now() - startTime;
  const remaining = Math.max(MIN_LOADER_DURATION - elapsed, 0);
  setTimeout(() => loader.classList.remove("active"), remaining);
}

function loadDashboard(baseUrl) {
  const url = baseUrl + getDeviceParam();
  if (url === currentVizUrl) return;

  showLoader();
  const loaderStart = Date.now();

  // Clear previous viz
  container.innerHTML = "";

  // Create div for Tableau viz
  const vizDiv = document.createElement("div");
  vizDiv.classList.add("vizFrame");
  container.appendChild(vizDiv);

  // Initialize Tableau viz
  currentViz = new tableau.Viz(vizDiv, url, {
    hideTabs: true,
    hideToolbar: true,
    width: "100%",
    height: "800px", // temporary height for initial rendering
    onFirstInteractive: function() {
      // Grab the iframe Tableau created
      const iframe = vizDiv.querySelector("iframe");
      if (iframe) {
        iframe.setAttribute("scrolling", "yes");  // allow scroll
        iframe.style.overflow = "auto";           // ensure scrollbars appear
      }

      // Set vizDiv height to match full Tableau viz height
      try {
        const fullHeight = currentViz.getVizHeight();
        vizDiv.style.height = fullHeight + "px";
      } catch(e) {
        console.warn("Failed to get viz height:", e);
      }

      // Fade in
      vizDiv.classList.add("active");
      hideLoader(loaderStart);
      currentVizUrl = url;
    }
  });
}

// Nav buttons click
document.querySelectorAll(".nav button").forEach(btn => {
  const baseUrl = btn.getAttribute("data-url");
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    loadDashboard(baseUrl);
  });
});

// Load first dashboard on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  const firstButton = document.querySelector(".nav button");
  firstButton.classList.add("active");
  loadDashboard(firstButton.getAttribute("data-url"));
});

// Reload dashboard on window resize to switch mobile/desktop layout
window.addEventListener("resize", () => {
  if (currentVizUrl) {
    const baseUrl = document.querySelector(".nav button.active").getAttribute("data-url");
    loadDashboard(baseUrl);
  }
});
