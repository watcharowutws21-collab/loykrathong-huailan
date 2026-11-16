// Firebase Configuration & Main Logic
const firebaseConfig = {
  databaseURL: "https://loykrathong-74274-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.database();

const showFormBtn = document.getElementById("showFormBtn");
const formContainer = document.getElementById("formContainer");
const choicesImg = document.querySelectorAll("#krathongChoices img");
const userNameInput = document.getElementById("userNameInput");
const wishInput = document.getElementById("wishInput");
const charCount = document.getElementById("charCount");
const btnFloat = document.getElementById("btnFloat");
const statusMessage = document.getElementById("statusMessage");
const floatingArea = document.getElementById("floatingArea");
const totalCountEl = document.getElementById("totalKrathongCount");
const wishesListContainer = document.getElementById("wishesListContainer");

let selectedKrathong = "1.png";

// Toggle form display
if (showFormBtn && formContainer) {
  showFormBtn.addEventListener("click", () => {
    formContainer.classList.toggle("hidden");
    if (!formContainer.classList.contains("hidden")) {
      formContainer.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// Choice selection
choicesImg.forEach(img => {
  img.addEventListener("click", () => {
    choicesImg.forEach(i => {
      i.classList.remove("selected");
      i.setAttribute("aria-pressed", "false");
    });
    img.classList.add("selected");
    img.setAttribute("aria-pressed", "true");
    selectedKrathong = img.getAttribute("data-src");
  });
});

// Char count & validation
function validateForm() {
  const nameVal = userNameInput.value.trim();
  const wishVal = wishInput.value.trim();
  charCount.textContent = `${wishVal.length}/100`;
  if (nameVal.length > 0 && wishVal.length > 0) {
    btnFloat.removeAttribute("disabled");
    btnFloat.innerHTML = "✦ ลอยกระทงทันที";
  } else {
    btnFloat.setAttribute("disabled", "true");
    btnFloat.innerHTML = "✦ กรุณากรอกชื่อและคำอธิษฐาน";
  }
}

userNameInput.addEventListener("input", validateForm);
wishInput.addEventListener("input", validateForm);

// Anonymous Auth & Realtime Sync
auth.signInAnonymously().then(() => {
  statusMessage.textContent = "พร้อมลอยกระทงแล้ว";
  btnFloat.innerHTML = "✦ ลอยกระทงทันที";
  validateForm();
}).catch(err => {
  console.error(err);
  statusMessage.textContent = "เชื่อมต่อล้มเหลว กรุณารีเฟรชใหม่";
});

// Fetch all krathongs in real-time
db.ref("krathongs").on("value", snapshot => {
  const data = snapshot.val();
  floatingArea.innerHTML = '<div class="river-waves"></div>';
  wishesListContainer.innerHTML = '';

  if (!data) {
    totalCountEl.textContent = "0";
    wishesListContainer.innerHTML = '<div class="wish-item-placeholder">ยังไม่มีคำอธิษฐาน เริ่มลอยกระทงกันเลย!</div>';
    return;
  }

  const keys = Object.keys(data);
  totalCountEl.textContent = keys.length;

  // Render sidebar wishes (latest first)
  const sortedKeys = keys.reverse();
  sortedKeys.forEach(key => {
    const item = data[key];
    const card = document.createElement("div");
    card.className = "wish-card-item";
    card.innerHTML = `
      <div class="wish-card-name">🪷 ${escapeHTML(item.name || 'ไม่ระบุชื่อ')}</div>
      <div class="wish-card-text">"${escapeHTML(item.wish || '')}"</div>
    `;
    wishesListContainer.appendChild(card);

    // Render floating krathong on river
    spawnRealKrathong(key, item);
  });
});

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function spawnRealKrathong(key, item) {
  const node = document.createElement("div");
  node.className = "krathong user-krathong";
  
  const inner = document.createElement("div");
  inner.className = "krathong-inner";

  const img = document.createElement("img");
  img.src = item.krathong || "1.png";
  img.alt = "กระทง";

  const wishDiv = document.createElement("div");
  wishDiv.className = "wishText";
  wishDiv.textContent = `${item.name || 'นิรนาม'}: ${item.wish || ''}`;

  inner.append(img, wishDiv);
  node.appendChild(inner);
  floatingArea.appendChild(node);

  const width = floatingArea.clientWidth || window.innerWidth;
  const height = floatingArea.clientHeight || 450;
  
  // Random vertical position
  const bottomPos = Math.random() * (height * 0.75);
  node.style.bottom = `${bottomPos}px`;
  
  // Floating animation across screen
  const duration = 24000 + Math.random() * 8000;
  node.style.left = "-200px";
  node.style.transition = `transform ${duration}ms linear`;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      node.style.transform = `translateX(${width + 400}px)`;
    });
  });

  setTimeout(() => {
    node.remove();
  }, duration + 500);
}

// Submit new krathong
btnFloat.addEventListener("click", () => {
  const nameVal = userNameInput.value.trim();
  const wishVal = wishInput.value.trim();
  if (!nameVal || !wishVal) return;

  btnFloat.setAttribute("disabled", "true");
  statusMessage.textContent = "กำลังส่งกระทงลงสู่น้ำ...";

  const newRef = db.ref("krathongs").push();
  newRef.set({
    name: nameVal,
    wish: wishVal,
    krathong: selectedKrathong,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  }).then(() => {
    statusMessage.textContent = "🪷 ลอยกระทงสำเร็จแล้ว!";
    userNameInput.value = "";
    wishInput.value = "";
    validateForm();
    formContainer.classList.add("hidden");
    setTimeout(() => { statusMessage.textContent = ""; }, 4000);
  }).catch(err => {
    console.error(err);
    statusMessage.textContent = "เกิดข้อผิดพลาด กรุณาลองใหม่";
    btnFloat.removeAttribute("disabled");
  });
});