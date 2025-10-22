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
  container.innerHTML = "";

  const vizDiv = document.createElement("div");
  vizDiv.className = "vizFrame";
  container.appendChild(vizDiv);

  // Create Tableau viz
  currentViz = new tableau.Viz(vizDiv, url, {
    hideTabs: true,
    hideToolbar: true,
    width: "100%",
    height: "800px",
    onFirstInteractive: function() {
      const iframe = vizDiv.querySelector("iframe");

      if (iframe) {
        iframe.setAttribute("scrolling", "yes");
        iframe.style.overflow = "auto";
        iframe.style.width = "100%";
        iframe.style.maxWidth = "100%";

        // Adjust height dynamically
        try {
          const vizHeight = currentViz.getVizHeight();
          vizDiv.style.height = vizHeight + "px";
          iframe.style.height = vizHeight + "px";
        } catch (err) {
          console.warn("Couldn't get viz height:", err);
          vizDiv.style.height = "900px";
          iframe.style.height = "900px";
        }
      }

      vizDiv.classList.add("active");
      hideLoader(loaderStart);
      currentVizUrl = url;
    }
  });
}

// Nav button logic
document.querySelectorAll(".nav button").forEach(btn => {
  const baseUrl = btn.getAttribute("data-url");
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    loadDashboard(baseUrl);
  });
});

// Initial load
document.addEventListener("DOMContentLoaded", () => {
  const firstButton = document.querySelector(".nav button");
  firstButton.classList.add("active");
  loadDashboard(firstButton.getAttribute("data-url"));
});

// Reload when resizing (switch between desktop/phone)
window.addEventListener("resize", () => {
  if (currentVizUrl) {
    const baseUrl = document.querySelector(".nav button.active").getAttribute("data-url");
    loadDashboard(baseUrl);
  }
});
