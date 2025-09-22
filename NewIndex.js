// Initialize Firebase (compat)
firebase.initializeApp({
  apiKey: "AIzaSyDAvpu7L-TS3q2AQioixMpBRuRYWo4tU38",
  authDomain: "fntd-checklist.firebaseapp.com",
  projectId: "fntd-checklist",
  storageBucket: "fntd-checklist.firebasestorage.app",
  messagingSenderId: "316986853631",
  appId: "1:316986853631:web:abe7fc2be5d9c6922524ca"
});

const auth = firebase.auth();
const db = firebase.firestore();

// Before new system: const images = document.querySelectorAll('.checkable');
const checkAllButton = document.getElementById('checkAllButton');
const checkAllButtonMobile = document.getElementById('checkAllButtonMobile');
const resetButton = document.getElementById('resetButton');
const aboutToggle = document.getElementById('about-toggle');
const aboutContent = document.getElementById('about-content');

const signInBtn = document.getElementById('signInBtn'); // Create in your HTML
const signOutBtn = document.getElementById('signOutBtn'); // Create in your HTML
const userStatus = document.getElementById('userStatus'); // Element to show user email/status

let currentUser = null;

// Set up the Website with New Grid Interface
const prefixMap = {
  uncommonUnits: "u",
  rareUnits: "r",
  epicUnits: "e",
  mythicUnits: "m",
  secretUnits: "s",
  nightmareUnits: "n",
  apexUnits: "a",
  forgottenUnits: "f"
};

// -------------------- Load Units --------------------
async function loadUnits() {
  const response = await fetch("./data/units.json");
  const unitsJSON = await response.json();

  const allUnitGroups = [
    { containerId: "ureUnits", groups: ["uncommonUnits", "rareUnits", "epicUnits"] },
    { containerId: "msUnits", groups: ["mythicUnits", "secretUnits"] },
    { containerId: "nafUnits", groups: ["nightmareUnits", "apexUnits", "forgottenUnits"] }
  ];

  allUnitGroups.forEach(groupInfo => {
    const container = document.getElementById(groupInfo.containerId);
    if (!container) return;

    groupInfo.groups.forEach(jsonGroupName => {
      const units = unitsJSON[jsonGroupName];
      if (!units) return;

      const prefix = prefixMap[jsonGroupName] || "";

      units.forEach(unit => {
        const uniqueId = prefix + unit.id;

        const wrapper = document.createElement("div");
        wrapper.className = `image-wrapper ${unit.class}`;

        wrapper.innerHTML = `
          <img loading="lazy"
               src="./images/units/${unit.class.split(" ")[0]}/${unit.id}.webp"
               class="checkable"
               data-id="${uniqueId}"
               data-rarity="${unit.class}">
          <svg class="tick" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17l-5-5" stroke="black" stroke-width="5" fill="none"
                    stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M20 6L9 17l-5-5" stroke="limegreen" stroke-width="3" fill="none"
                    stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;

        container.appendChild(wrapper);
      });
    });
  });

  setupAllImages(); // after images exist
}

// -------------------- Load Shiny Units --------------------
async function loadShinyUnits() {
  const response = await fetch("./data/units.json");
  const unitsJSON = await response.json();

  const allShinyGroups = [
    { containerId: "sureUnits", groups: ["uncommonUnits", "rareUnits", "epicUnits"] },
    { containerId: "smsUnits", groups: ["mythicUnits", "secretUnits"] },
    { containerId: "snafUnits", groups: ["nightmareUnits", "apexUnits", "forgottenUnits"] }
  ];

  allShinyGroups.forEach(groupInfo => {
    const container = document.getElementById(groupInfo.containerId);
    if (!container) return;

    groupInfo.groups.forEach(jsonGroupName => {
      const units = unitsJSON[jsonGroupName];
      if (!units) return;

      const prefix = "s" + (prefixMap[jsonGroupName] || ""); // add shiny 's' in front

      units.forEach(unit => {
        const uniqueId = prefix + unit.id;

        const wrapper = document.createElement("div");
        wrapper.className = `image-wrapper ${unit.class} shiny`;

        wrapper.innerHTML = `
          <img loading="lazy"
               src="./images/units/${unit.class.split(" ")[0]}/${unit.id}.webp"
               class="checkable"
               data-id="${uniqueId}"
               data-rarity="${unit.class}">
          <div class="sparkle"></div>
          <svg class="tick" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17l-5-5" stroke="black" stroke-width="5" fill="none"
                    stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M20 6L9 17l-5-5" stroke="limegreen" stroke-width="3" fill="none"
                    stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;

        container.appendChild(wrapper);
      });
    });
  });

  setupAllImages();
}

// -------------------- Setup Images & Progress --------------------
function setupAllImages() {
  const images = document.querySelectorAll('.checkable');

  // 1️⃣ Apply saved state
  applyChecklistState(getLocalChecklistState());

  // 2️⃣ Click handlers
  setupImageClickHandlers();
  setupQuestCheckboxHandlers();

  
  // 3️⃣ Buttons
  setupButtons();

  

  // 4️⃣ Update progress bar
  updateProgressCounter();

  // 5️⃣ Easter egg
  setupEasterEgg();
}


// --- Authentication ---

signInBtn.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .catch(error => {
      console.error('Sign-in error:', error);
      alert('Sign-in failed: ' + error.message);
    });
});

signOutBtn.addEventListener('click', () => {
  auth.signOut();
});

// Listen for auth state changes
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user.uid;
    userStatus.textContent = `Signed in as ${user.email}`;
    signInBtn.style.display = 'none';
    signOutBtn.style.display = 'inline-block';

    await loadAndApplyUserChecklist();
  } else {
    currentUser = null;
    userStatus.textContent = 'Not signed in';
    signInBtn.style.display = 'inline-block';
    signOutBtn.style.display = 'none';

    applyChecklistState(getLocalChecklistState()); // Just load from localStorage
  }
});

// --- Firestore checklist functions ---

async function saveChecklistToFirestore(data) {
  if (!currentUser) return;
  try {
    await db.collection('checklists').doc(currentUser).set(data);
    console.log('Checklist saved to Firestore.');
  } catch (error) {
    console.error('Error saving checklist:', error);
  }
}

async function loadChecklistFromFirestore() {
  if (!currentUser) return null;
  try {
    const doc = await db.collection('checklists').doc(currentUser).get();
    if (doc.exists) {
      console.log('Checklist loaded from Firestore.');
      return doc.data();
    }
  } catch (error) {
    console.error('Error loading checklist:', error);
  }
  return null;
}

// --- Checklist state helpers (same as before) ---

function getLocalChecklistState() {
  const images = document.querySelectorAll('.checkable');
  let state = {};
  images.forEach(img => {
    const id = img.dataset.id;
    const val = localStorage.getItem(`checked-${id}`);
    state[id] = (val === 'true');
  });

  const quests = document.querySelectorAll('.quest-list input[type="checkbox"]');
  quests.forEach(cb => {
    const id = cb.dataset.id;
    const val = localStorage.getItem(`checked-${id}`);
    state[id] = (val === 'true');
  });

  return state;
}

//progress bar try
const progressCounter = document.getElementById('progress-counter');

// --- Update desktop progress bar ---
function updateProgressCounter() {
    const images = document.querySelectorAll('.checkable'); // all tickable images
    const total = images.length;
    let checked = 0;

    images.forEach(img => {
        if (img.classList.contains('checked')) checked++;
    });

    const progressText = document.getElementById("progress-text");
    const progressFill = document.getElementById("progress-fill");
    const progressFillShiny = document.getElementById("progress-fillShiny");

    const percent = (total > 0) ? (checked / total) * 100 : 0;

    if (progressText) progressText.textContent = `${checked}/${total}`;
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressFillShiny) progressFillShiny.style.width = `${percent}%`;

    // update mobile version too
    updateProgressCounterMobile();
}

// --- Update mobile progress bar ---
function updateProgressCounterMobile() {
    const images = document.querySelectorAll('.checkable');
    const total = images.length;
    let checked = 0;

    images.forEach(img => {
        if (img.classList.contains('checked')) checked++;
    });

    const progressTextMobile = document.getElementById("progress-text-Mobile");
    const progressFillMobile = document.getElementById("progress-fill-Mobile");
    const progressFillShinyMobile = document.getElementById("progress-fillShiny-Mobile");

    const percent = (total > 0) ? (checked / total) * 100 : 0;

    if (progressTextMobile) progressTextMobile.textContent = `${checked}/${total}`;
    if (progressFillMobile) progressFillMobile.style.width = `${percent}%`;
    if (progressFillShinyMobile) progressFillShinyMobile.style.width = `${percent}%`;    
}






function applyChecklistState(state) {
  const images = document.querySelectorAll('.checkable');
  images.forEach(img => {
    const id = img.dataset.id;
    const checked = !!state[id];
    if (checked) {
      img.classList.add('checked');
      img.closest('.image-wrapper').classList.add('checked');
      localStorage.setItem(`checked-${id}`, "true");
    } else {
      img.classList.remove('checked');
      img.closest('.image-wrapper').classList.remove('checked');
      localStorage.setItem(`checked-${id}`, "false");
    }
  });

   // Handle quest checkboxes
  const quests = document.querySelectorAll('.quest-list input[type="checkbox"]');
  quests.forEach(cb => {
    const id = cb.dataset.id;
    if (id in state) {
      cb.checked = !!state[id];
      localStorage.setItem(`checked-${id}`, state[id] ? "true" : "false");
    }
  });

  updateProgressCounter();
}

// --- Load user checklist and merge with localStorage ---

async function loadAndApplyUserChecklist() {
  const firestoreState = await loadChecklistFromFirestore() || {};
  const localState = getLocalChecklistState();

  // Merge Firestore state over localStorage (Firestore wins on conflicts)
  const merged = {...localState, ...firestoreState};
  applyChecklistState(merged);

  // Save merged state back to Firestore so localStorage and Firestore sync
  await saveChecklistToFirestore(merged);
}

// --- Initialize UI and listeners ---

function setupImageClickHandlers() {
  const images = document.querySelectorAll('.checkable');
  images.forEach(img => {
    const id = img.dataset.id;
    img.addEventListener('click', async () => {
      const isChecked = img.classList.toggle('checked');
      img.closest('.image-wrapper').classList.toggle('checked');
      localStorage.setItem(`checked-${id}`, isChecked ? 'true' : 'false');

      updateProgressCounter();

      if (currentUser) {
        const updatedState = getLocalChecklistState();
        await saveChecklistToFirestore(updatedState);
      }
    });
  });
}

function setupButtons() {
  const images = document.querySelectorAll('.checkable');

  if (checkAllButton) {
    checkAllButton.addEventListener('click', () => {
        tickAllImages(); // uses confirmation
    });
}

  if (checkAllButtonMobile) {
    checkAllButtonMobile.addEventListener('click', () => {
        tickAllImages(); // uses confirmation
    });
}

  if (resetButton) {
    resetButton.addEventListener('click', () => {
        resetAllImages(); // uses confirmation
    });
}
}

// --- Other UI code unchanged ---

if (aboutToggle && aboutContent) {
  aboutToggle.addEventListener("click", () => {
    aboutContent.classList.toggle('show');
  });
}

function resetAllImages() {
    showConfirm("Are you sure you want to reset all progress? This cannot be undone.", (confirmed) => {
        if (!confirmed) return;

        const images = document.querySelectorAll('.checkable');
        images.forEach(img => {
            img.classList.remove('checked');
            img.closest('.image-wrapper').classList.remove('checked');
            localStorage.setItem(`checked-${img.dataset.id}`, "false");
        });

        updateProgressCounter();

        if (currentUser) saveChecklistToFirestore(getLocalChecklistState());
    });
}

function tickAllImages() {
    showConfirm("Are you sure you want to tick all images?", (confirmed) => {
        if (!confirmed) return;

        const images = document.querySelectorAll('.checkable');
        images.forEach(img => {
            img.classList.add('checked');
            img.closest('.image-wrapper').classList.add('checked');
            localStorage.setItem(`checked-${img.dataset.id}`, "true");
        });

        updateProgressCounter();

        if (currentUser) saveChecklistToFirestore(getLocalChecklistState());
    });
}

function showConfirm(message, callback) {
    const modal = document.getElementById("confirmModal");
    const msg = document.getElementById("confirmMessage");
    const yesBtn = document.getElementById("confirmYes");
    const noBtn = document.getElementById("confirmNo");

    msg.textContent = message;
    modal.style.display = "flex";

    function cleanUp() {
        modal.style.display = "none";
        yesBtn.removeEventListener("click", onYes);
        noBtn.removeEventListener("click", onNo);
    }

    function onYes() { cleanUp(); callback(true); }
    function onNo() { cleanUp(); callback(false); }

    yesBtn.addEventListener("click", onYes);
    noBtn.addEventListener("click", onNo);
}


document.querySelectorAll('.nav-button[data-toggle]').forEach(button => {
  button.addEventListener('click', () => {
    const targetId = button.getAttribute('data-toggle');
    const section = document.getElementById(targetId);

    document.querySelectorAll('.nav-section').forEach(s => {
      if (s !== section) s.classList.remove('show');
    });

    section.classList.toggle('show');
  });
});
const backToTopBtn = document.getElementById("backToTopBtn");
if (backToTopBtn) {
  backToTopBtn.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
}

const backToBottomBtn = document.getElementById("backToBottomBtn");
if (backToBottomBtn) {
  backToBottomBtn.onclick = () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

window.onload = function() {
  const topMobile = document.getElementById("topMobile");
  if (topMobile) {
    topMobile.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
    console.log("help");
  }

  const bottomMobile = document.getElementById("bottomMobile");
  if (bottomMobile) {
    bottomMobile.onclick = () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }
};


// Secret easter egg code should come here unchanged...
// Secret Easter Egg
document.addEventListener('DOMContentLoaded', () => {
    
    // Load the correct units
    if (document.getElementById("ureUnits")) { 
        loadUnits();
    } else if (document.getElementById("sureUnits")) { 
        loadShinyUnits();
    }

    setupQuestCheckboxes();

});


// --- Easter Egg Setup ---
function setupEasterEgg() {
    // Determine the secret image ID based on page
    const isShiny = !!document.getElementById("sureUnits");
    const secretId = isShiny ? "sn69" : "n69"; // Shiny pages prefix with "s"
    
    // Find the secret image inside the Nightmare container
    const secretImage = document.querySelector(`img.checkable[data-id="${secretId}"]`);
    const allCheckableImages = document.querySelectorAll('.checkable');
    const canvas = document.getElementById('confettiCanvas');

    if (!secretImage) {
        console.log('❌ Secret Steve Raglan image not found!');
        return;
    }

    const clickSounds = [
        new Audio('sounds/I.mp3'),
        new Audio('sounds/ALWAYS.mp3'),
        new Audio('sounds/COME.mp3'),
        new Audio('sounds/BACK.mp3'),
        new Audio('sounds/YAY.mp3')
    ];

    let clickCount = 0;
    let clickTimer = null;
    let soundQueue = [];
    let isPlaying = false;
    let confettiTriggered = false;

    function playNextInQueue() {
        if (soundQueue.length === 0) {
            isPlaying = false;
            return;
        }
        const nextSound = soundQueue.shift();
        isPlaying = true;
        nextSound.currentTime = 0;
        nextSound.play();
        nextSound.onended = () => playNextInQueue();
    }

    // Secret image click
    secretImage.addEventListener('click', (event) => {
        event.stopPropagation();

        const imageWrapper = secretImage.closest('.image-wrapper');
        const image = secretImage;

        // Wobble animation
        image.classList.remove('wobble');
        void image.offsetWidth;
        image.classList.add('wobble');

        // Queue sounds
        if (clickCount < clickSounds.length) {
            const sound = clickSounds[clickCount];
            soundQueue.push(sound);
            if (!isPlaying) playNextInQueue();
        }

        clickCount++;
        console.log(`Secret click count: ${clickCount}`);

        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
            clickCount = 0;
            soundQueue = [];
            isPlaying = false;
        }, 10000);

        // Trigger confetti and secret page
        if (clickCount >= 5 && !confettiTriggered) {
            launchConfetti();
            setTimeout(() => {
                window.open("ILoveSteveRaglanSoMuchIYKYK.html", "_self");
            }, 2000);
        }
    });

    // Clicking any other image resets sequence
    allCheckableImages.forEach(img => {
        const wrapper = img.closest('.image-wrapper');
        if (wrapper !== secretImage.closest('.image-wrapper')) {
            img.addEventListener('click', () => {
                if (clickCount > 0) {
                    clickCount = 0;
                    clearTimeout(clickTimer);
                    soundQueue = [];
                    isPlaying = false;
                    confettiTriggered = false;

                    wrapper.classList.add('wrong-click');
                    setTimeout(() => wrapper.classList.remove('wrong-click'), 500);
                }
            });
        }
    });

    function launchConfetti() {
        if (confettiTriggered) return;
        confettiTriggered = true;

        canvas.style.display = 'block';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        confetti.create(canvas, { resize: true, useWorker: true })({
            particleCount: 200,
            spread: 160,
            origin: { y: 0.6 }
        });

        setTimeout(() => {
            canvas.style.display = 'none';
        }, 3000);
    }
}
function setupQuestCheckboxes() {
  const checkboxes = document.querySelectorAll('.quest-list input[type="checkbox"]');

  // Load saved state (from localStorage, and Firestore if signed in)
  checkboxes.forEach(cb => {
    const id = cb.dataset.id;
    const saved = localStorage.getItem(`checked-${id}`);
    cb.checked = (saved === "true");

    cb.addEventListener("change", async () => {
      localStorage.setItem(`checked-${id}`, cb.checked ? "true" : "false");

      if (currentUser) {
        const updatedState = getLocalChecklistState(); // reuses your helper
        await saveChecklistToFirestore(updatedState);
      }
    });
  });
}

function setupQuestCheckboxHandlers() {
  const quests = document.querySelectorAll('.quest-list input[type="checkbox"]');

  quests.forEach(cb => {
    cb.addEventListener('change', async () => {
      const id = cb.dataset.id;
      const isChecked = cb.checked;

      // Save locally
      localStorage.setItem(`checked-${id}`, isChecked ? 'true' : 'false');

      // Update progress bar
      updateProgressCounter();

      // Save to Firestore if signed in
      if (currentUser) {
        const updatedState = getLocalChecklistState(); // includes images + quest checkboxes
        await saveChecklistToFirestore(updatedState);
      }
    });
  });
}
