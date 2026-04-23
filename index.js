const tabsT = document.querySelectorAll(".tabT");
const tabsB = document.querySelectorAll(".tabB");
const whiteT = document.querySelectorAll(".white-top");
const whiteB = document.querySelectorAll(".white-bottom");
const container = document.querySelector(".tab-container");
const contents = document.querySelectorAll(".tabT-content");
let isShinyMode = false;


window.addEventListener("DOMContentLoaded", () => {
  const firstBottomTab = document.querySelector('.tabB[data-tabB="Seasons"]');
  if (firstBottomTab) firstBottomTab.click();
});



//------------------------------


// standalone-units-loader.js
// Drop this into a fresh JS file. Place <script src="standalone-units-loader.js"></script> near </body>.

// -------------------- CONFIG --------------------
const dataPath = "data/units.json"; // your single JSON file
const imgFolderPrefix = "images/units2"; // base folder
const imgExt = ".png"; // change to .webp if you prefer

// prefixMap for unique data-id (keeps compatibility with previous approach)
const prefixMap = {
  hero: "h",
  uncommon: "u",
  rare: "r",
  epic: "e",
  mythic: "m",
  secret: "s",
  exclusive: "x",
  nightmare: "n",
  apex: "a",
  forgotten: "f"
};

// display order for rarities (pets handled separately)
const rarityOrder = [
  "hero",
  "uncommon",
  "rare",
  "epic",
  "mythic",
  "secret",
  "exclusive",
  "nightmare",
  "apex",
  "forgotten"
];

// -------------------- BOOT --------------------
document.addEventListener("DOMContentLoaded", () => {
  init();
});

async function init() {
  try {
    const res = await fetch(dataPath);
    if (!res.ok) throw new Error(`Failed to fetch ${dataPath}: ${res.status}`);
    const allData = await res.json();

    // For each top-level key -> season/event
    for (const seasonNameRaw of Object.keys(allData)) {
      const seasonData = allData[seasonNameRaw];
      const units = Array.isArray(seasonData.units) ? seasonData.units : [];

      // find or create container
      const container = findOrCreateContainerForSeason(seasonNameRaw);

      // render
      renderSeasonInto(container, seasonNameRaw, units);
    }

    // After rendering all seasons, apply saved state and attach handlers
    setupAllImages();

    const activeTopTab = document.querySelector(".tabT.active");
    if (activeTopTab) activeTopTab.click();

  } catch (err) {
    console.error("Error initializing units loader:", err);
  }
}

// -------------------- FIND/CREATE CONTAINER --------------------
function findOrCreateContainerForSeason(seasonName) {
  // Attempt a few likely ID patterns (case-insensitive)
  const tryIds = [
    `${seasonName}Units`,
    `${seasonName}units`,
    `${seasonName.toLowerCase()}Units`,
    `${seasonName.toLowerCase()}units`,
    `${seasonName.replace(/\s+/g, "")}Units`,
    `${seasonName.replace(/\s+/g, "").toLowerCase()}Units`,
    // Common short pattern like "s1Units" for "Season1"
    (() => {
      const m = seasonName.match(/Season\s*?(\d+)/i);
      return m ? `s${m[1]}Units` : null;
    })()
  ].filter(Boolean);

  for (const id of tryIds) {
    const el = document.getElementById(id);
    if (el) return el;
  }

  // Try find by data-season attribute
  const byData = document.querySelector(`[data-season="${seasonName}"], [data-season="${seasonName.toLowerCase()}"]`);
  if (byData) return byData;

  // Not found — create a container. Prefer an existing #seasonsContainer, else append to body
  const parent = document.getElementById("seasonsContainer") || document.body;

  // Create a wrapper section (matches your earlier structure: .tabT-content)
  const wrapper = document.createElement("div");
  // generate a safe id
  const safeId = `${seasonName.replace(/\s+/g, "")}Units`;
  wrapper.className = "tabT-content";
  wrapper.id = safeId;

  // inner grid container
  const inner = document.createElement("div");
  inner.className = "image-grid";
  inner.id = safeId; // same id used for ease (but keep unique)
  // if that exact id exists, use generated unique id
  if (document.getElementById(inner.id)) {
    inner.id = safeId + "-" + Math.random().toString(36).slice(2, 7);
  }

  // add a heading so you can see the created section
  const heading = document.createElement("h3");
  heading.textContent = seasonName;
  wrapper.appendChild(heading);
  wrapper.appendChild(inner);

  parent.appendChild(wrapper);
  return inner;
}

// -------------------- RENDER SEASON --------------------
function renderSeasonInto(container, seasonName, units) {
  container.innerHTML = "";

  const seasonFolder = isShinyMode ? `${seasonName}S` : seasonName;

  const filteredUnits = isShinyMode
  ? units.filter(u => u.type !== "pet" && (u.rarity || "").toLowerCase() !== "hero")
  : units;

const nonPets = filteredUnits.filter(u => u.type !== "pet");
const petUnits = filteredUnits.filter(u => u.type === "pet");

  const sortedNonPets = nonPets.slice().sort((a, b) => {
    const ia = Math.max(0, rarityOrder.indexOf((a.rarity || "").toLowerCase()));
    const ib = Math.max(0, rarityOrder.indexOf((b.rarity || "").toLowerCase()));
    return ia - ib;
  });

  const sortedPets = petUnits.slice().sort((a, b) => {
    const ia = Math.max(0, rarityOrder.indexOf((a.rarity || "").toLowerCase()));
    const ib = Math.max(0, rarityOrder.indexOf((b.rarity || "").toLowerCase()));
    return ia - ib;
  });

  const finalList = sortedNonPets.concat(sortedPets);

  finalList.forEach((unit, idx) => {
    const rarity = (unit.rarity || "uncommon").toLowerCase();

    if (
      idx > 0 &&
      finalList[idx - 1].rarity?.toLowerCase() === "hero" &&
      rarity !== "hero"
    ) {
      const breakLine = document.createElement("div");
      breakLine.style.gridColumn = "1 / -1";
      breakLine.style.height = "20px";
      container.appendChild(breakLine);
    }

    const isEvolution = unit.evolution === true;
    const isPet = unit.type === "pet";

    if (
      idx > 0 &&
      finalList[idx - 1].type !== "pet" &&
      isPet
    ) {
      const breakLine = document.createElement("div");
      breakLine.style.gridColumn = "1 / -1";
      breakLine.style.height = "20px";
      container.appendChild(breakLine);
    }

    const id = String(unit.id);

    const modeKey = isShinyMode ? "shiny" : "normal";
    const uniqueDataId = `${seasonName}-${modeKey}-${rarity}-${id}`;

    const wrapper = document.createElement("div");
    wrapper.className = `image-wrapper ${rarity}${isEvolution ? " evolution" : ""}${isPet ? " pet" : ""}`;

    const safeSeason = encodeURIComponent(seasonFolder);
    const safeRarity = encodeURIComponent(rarity);
    const safeId = encodeURIComponent(id);

    const src = `${imgFolderPrefix}/${safeSeason}/${safeRarity}/${safeId}${imgExt}`;

    wrapper.innerHTML = `
      <img loading="lazy"
           src="${src}"
           class="checkable"
           data-id="${uniqueDataId}"
           data-rarity="${rarity}"
           data-season="${seasonName}">
      <svg class="tick" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" stroke="black" stroke-width="5" fill="none"
                stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M20 6L9 17l-5-5" stroke="limegreen" stroke-width="3" fill="none"
                stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    container.appendChild(wrapper);
  });
}

// -------------------- IMAGE SETUP & CHECKLIST STATE --------------------
function setupAllImages() {
  // apply saved localStorage state
  applyChecklistState(getLocalChecklistState());

  // attach click handlers (delegation better for large lists)
  document.querySelectorAll('.image-wrapper .checkable').forEach(img => {
    // ensure we don't double-bind
    img.removeEventListener('click', onImageClick);
    img.addEventListener('click', onImageClick);
  });

  // update visual progress
  updateProgressCounter();
}

function onImageClick(e) {
  const img = e.currentTarget;
  const wrapper = img.closest('.image-wrapper');
  const id = img.dataset.id || img.dataset.id === "" ? img.dataset.id : img.getAttribute('data-id');

  // toggle classes
  const nowChecked = img.classList.toggle('checked');
  if (wrapper) wrapper.classList.toggle('checked');

  // persist
  localStorage.setItem(`checked-${id}`, nowChecked ? "true" : "false");

  // update progress visuals
  updateProgressCounter();
}

// read saved state for all current .checkable images
function getLocalChecklistState() {
  const images = document.querySelectorAll('.checkable');
  const state = {};
  images.forEach(img => {
    const id = img.dataset.id;
    const val = localStorage.getItem(`checked-${id}`);
    state[id] = (val === "true");
  });
  return state;
}

// apply a state object (assumes keys are data-id)
function applyChecklistState(state) {
  document.querySelectorAll('.checkable').forEach(img => {
    const id = img.dataset.id;
    const checked = !!state[id];
    if (checked) {
      img.classList.add('checked');
      const wrapper = img.closest('.image-wrapper');
      if (wrapper) wrapper.classList.add('checked');
      localStorage.setItem(`checked-${id}`, "true");
    } else {
      img.classList.remove('checked');
      const wrapper = img.closest('.image-wrapper');
      if (wrapper) wrapper.classList.remove('checked');
      localStorage.setItem(`checked-${id}`, "false");
    }
  });
}

// -------------------- PROGRESS COUNTER --------------------
function updateProgressCounter() {
  const images = document.querySelectorAll('.checkable');
  const total = images.length;
  let checked = 0;
  images.forEach(img => { if (img.classList.contains('checked')) checked++; });

  const progressText = document.getElementById("progress-text");
  if (progressText) progressText.textContent = `${checked}/${total}`;

  const progressFill = document.getElementById("progress-fill");
  if (progressFill) {
    const percent = total === 0 ? 0 : (checked / total) * 100;
    progressFill.style.width = `${percent}%`;
  }
}

// Expose a simple API in case you want to call later
window.UNITLOADER = {
  renderSeasonInto,
  renderAll: init,
  getState: getLocalChecklistState,
  applyState: applyChecklistState
};





//---------------------------------

//top tabs
tabsT.forEach((tabT, i) => {
  tabT.addEventListener("click", () => 
    {
    // reset all tabsT
    tabsT.forEach((t, idx) => {
      const wasActive = t.classList.contains("active");
      const isClickedTab = t === tabT;

      if (isClickedTab) return;

      const color = t.dataset.color.startsWith("#") ? t.dataset.color : "#" + t.dataset.color;
      t.style.background = color;
      t.style.removeProperty("--tabT-bg");

      if (t.dataset.short) {
        t.innerHTML = `<span>${t.dataset.short}</span>`;
      }

      if (wasActive) {
        // freeze old active tab at its tall state first
        whiteT[idx].style.transition = "none";
        whiteT[idx].style.height = "78px";
        whiteT[idx].style.transform = "translateY(0)";
        whiteT[idx].offsetHeight;

        t.classList.remove("active");

        // now animate it down
        whiteT[idx].style.transition = "height 0.5s ease, transform 0.5s ease";
        whiteT[idx].style.height = "50px";
        whiteT[idx].style.transform = "translateY(28px)";
      } 
      else {
        t.classList.remove("active");
        whiteT[idx].style.transition = "height 0.5s ease, transform 0.5s ease";
        whiteT[idx].style.height = "50px";
        whiteT[idx].style.transform = "translateY(28px)";
      }
    });

    // activate clicked tab
    // activate clicked tab
    tabT.classList.add("active");

  const color = tabT.dataset.color.startsWith("#") ? tabT.dataset.color : "#" + tabT.dataset.color;
  tabT.style.background = color;
  tabT.style.setProperty("--tabT-bg", color);

  // snap active white border immediately
  whiteT[i].style.transition = "none";
  whiteT[i].style.height = "78px";
  whiteT[i].style.transform = "translateY(0)";
  whiteT[i].offsetHeight;
  whiteT[i].style.transition = "height 0.5s ease, transform 0.5s ease";

  container.style.background = color;
  const activeBottom = document.querySelector(".tabB.active");
  if (activeBottom) {
    activeBottom.style.background = color;
    activeBottom.style.setProperty("--tabB-bg", color);
  }

  if (tabT.dataset.full) {
    tabT.innerHTML = `<span>${tabT.dataset.full}</span>`;
  }

  contents.forEach(c => c.classList.remove("active"));
  const content = document.getElementById(tabT.dataset.tab);
  if (content) content.classList.add("active");
  });

  // hover effect
  tabT.addEventListener("mouseenter", () => 
    {
    if (!tabT.classList.contains("active")) 
    {
      whiteT[i].style.height = "78px";
      whiteT[i].style.transform = "translateY(0)";
    }
  });

  tabT.addEventListener("mouseleave", () => 
    {
    if (!tabT.classList.contains("active")) 
    {
      whiteT[i].style.height = "50px";
      whiteT[i].style.transform = "translateY(28px)";
    }
  });
});

// initialize container and active tab
const activeTab = document.querySelector(".tabT.active");
if (activeTab) 
  {
  const color = activeTab.dataset.color.startsWith("#") ? activeTab.dataset.color : "#" + activeTab.dataset.color;
  container.style.background = color;
  activeTab.style.background = color;
  activeTab.style.setProperty("--tabT-bg", color);

  if (activeTab.dataset.full) 
  {
    activeTab.innerHTML = `<span>${activeTab.dataset.full}</span>`;
  }

  tabsT.forEach((t, idx) => {
    if (!t.classList.contains("active")) 
    {
      whiteT[idx].style.height = "50px";
      whiteT[idx].style.transform = "translateY(28px)";
      whiteT[idx].style.transition = "height 0.2s, transform 0.2s";
    } 
    else 
    {
      whiteT[idx].style.height = "78px";
      whiteT[idx].style.transform = "translateY(0)";
    }
  });
}



// ==================
// SOUND EFFECT
// ==================
const clickSound = new Audio('./sounds/hover-sound.mp3');

tabsT.forEach(tabT => {
  tabT.addEventListener('click', () => {
    if (!tabT.classList.contains("active")) {
      clickSound.currentTime = 0;
      clickSound.play();
    }
  });
});



// select the Seasons and Events buttons
const seasonsTop = document.querySelector(".tab-top.seasons");
const eventsTop = document.querySelector(".tab-top.events");

const seasonsButton = document.querySelector(".tabB[data-tabB='Seasons']");
const eventsButton = document.querySelector(".tabB[data-tabB='Events']");

if (eventsButton) {
  eventsButton.addEventListener("click", () => {
    seasonsTop.style.display = "none";
    eventsTop.style.display = "flex";
    document.querySelector('.tab-top.events .tabT[data-tab="Ha"]')?.click();
  });
}

if (seasonsButton) {
  seasonsButton.addEventListener("click", () => {
    eventsTop.style.display = "none";
    seasonsTop.style.display = "flex";
    document.querySelector('.tab-top.seasons .tabT[data-tab="s1"]')?.click();
  });
}






//tryiong to change for lower buttons
tabsB.forEach((tabB, i) => 
{
  tabB.addEventListener("click", () => 
    {
    // reset all tabsB
    tabsB.forEach((t, idx) => {
      t.classList.remove("active");

      whiteB[idx].style.height = "50px";
      whiteB[idx].style.transform = "translateY(0px)";
      whiteB[idx].style.transition = "height 0.2s, transform 0.2s";
      
    });

    // activate clicked tab
    tabB.classList.add("active");
    clickSound.currentTime = 0;
    clickSound.play();

    //const color = tabB.dataset.color.startsWith("#") ? tabB.dataset.color : "#" + tabB.dataset.color;
    //tabB.style.background = color;
    //tabB.style.setProperty("--tabB-bg", color);

    whiteB[i].style.height = "78px";
    whiteB[i].style.transform = "translateY(0)";

    //container.style.background = color;

    contents.forEach(c => c.classList.remove("active"));
    const content = document.getElementById(tabB.dataset.tab);
    if (content) content.classList.add("active");

          // If the clicked bottom tab is the Seasons tab, activate the first top tab again
      if (tabB.dataset.tabb === "Seasons") 
      {
        const firstTopTab = document.querySelector('[data-tab="s1"]');
        if (firstTopTab) firstTopTab.click();
        
        tabsB.forEach((t, idx) => 
        {
          if (t !== tabB)  // only affect the non-active tab
          {
            if (t.dataset.tabb === "Seasons") t.style.background = "#e5b52a";
            else if (t.dataset.tabb === "Events") t.style.background = "#dd8b2b";
          }
        });
      }
      else if (tabB.dataset.tabb === "Events") 
      {
        const secondTopTab = document.querySelector('[data-tab="Ha"]');
        if (secondTopTab) secondTopTab.click();
        
        tabsB.forEach((t, idx) => 
        {
          if (t !== tabB)  // only affect the non-active tab
          {
            if (t.dataset.tabb === "Seasons") t.style.background = "#e5b52a";
            else if (t.dataset.tabb === "Events") t.style.background = "#dd8b2b";
          }
        });
      }
  });

  // hover effect
  tabB.addEventListener("mouseenter", () => 
  {
    if (!tabB.classList.contains("active")) 
    {
      whiteB[i].style.height = "78px";
      whiteB[i].style.transform = "translateY(-28)";
    }
  });

  tabB.addEventListener("mouseleave", () => 
  {
    if (!tabB.classList.contains("active")) 
    {
      whiteB[i].style.height = "50px";
      whiteB[i].style.transform = "translateY(0)";
    }
  });
});

// initialize container and active tab
const activeTabB = document.querySelector(".tabB.active");
if (activeTab) 
{
  tabsB.forEach((t, idx) => 
  {
    if (!t.classList.contains("active")) 
    {
      whiteB[idx].style.height = "50px";
      whiteB[idx].style.transform = "translateY(0px)";
      whiteB[idx].style.transition = "height 0.2s, transform 0.2s";
    } 
    else 
    {
      whiteB[idx].style.height = "78px";
      whiteB[idx].style.transform = "translateY(0)";
    }
  });
}



//--------------------------------------------------------------------Side Buttons-----------------------------------------------------------------


const eventBox = document.querySelector(".event-box");
const eventImg = eventBox.querySelector("img");

eventBox.addEventListener("click", () => {
  const isEventsVisible = eventsTop.style.display === "flex";

  if (isEventsVisible) {
    // 👉 GO BACK TO SEASONS
    eventsTop.style.display = "none";
    seasonsTop.style.display = "flex";

    document.querySelector('.tab-top.seasons .tabT[data-tab="s1"]')?.click();

    // change image back to event
    eventImg.src = "images/event.gif";

  } else {
    // 👉 GO TO EVENTS
    seasonsTop.style.display = "none";
    eventsTop.style.display = "flex";

    document.querySelector('.tab-top.events .tabT[data-tab="Ha"]')?.click();

    // change image to season
    eventImg.src = "images/season.gif";
  }
});


const shinyBox = document.querySelector(".shiny-box");
const mainContainer = document.querySelector(".tab-container");

shinyBox?.addEventListener("click", () => {
  isShinyMode = !isShinyMode;

  mainContainer.classList.toggle("shiny-mode", isShinyMode);

  init();
});


const clearAllButton = document.getElementById("clearAllButton");

clearAllButton?.addEventListener("click", () => {
  const firstWarning = confirm("Clear all checkmarks?");
  if (!firstWarning) return;

  const secondWarning = confirm("Are you sure?");
  if (!secondWarning) return;

  // remove only checklist data
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith("checked-")) {
      localStorage.removeItem(key);
    }
  });

  // untick everything currently on screen
  document.querySelectorAll(".checkable").forEach(img => {
    img.classList.remove("checked");
    const wrapper = img.closest(".image-wrapper");
    if (wrapper) wrapper.classList.remove("checked");
  });

  updateProgressCounter();
});


const navButtons = document.querySelectorAll(".nav-button[data-toggle]");
const navSections = document.querySelectorAll(".nav-section");
const modalOverlay = document.getElementById("modalOverlay");

function closeAllNavSections() {
  navSections.forEach(section => section.classList.remove("show"));
  modalOverlay?.classList.remove("show");
}

navButtons.forEach(button => {
  button.addEventListener("click", () => {
    const targetId = button.dataset.toggle;
    const targetSection = document.getElementById(targetId);
    if (!targetSection) return;

    const wasOpen = targetSection.classList.contains("show");

    closeAllNavSections();

    if (!wasOpen) {
      targetSection.classList.add("show");
      modalOverlay?.classList.add("show");
    }
  });
});

modalOverlay?.addEventListener("click", closeAllNavSections);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeAllNavSections();
  }
});