// Firebase Configuration
const firebaseConfig = {
  databaseURL: "https://loykrathong-74274-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
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
const bgMusic = document.getElementById("bgMusic");
const toggleMusicBtn = document.getElementById("toggleMusicBtn");

let selectedKrathong = "1.png";

// ควบคุมเสียงเพลง
if (toggleMusicBtn && bgMusic) {
  let isPlaying = false;
  toggleMusicBtn.addEventListener("click", () => {
    if (!isPlaying) {
      bgMusic.play().then(() => {
        isPlaying = true;
        toggleMusicBtn.textContent = "🔊 ปิดเพลงเทศกาล";
      }).catch(e => console.log("Audio play blocked:", e));
    } else {
      bgMusic.pause();
      isPlaying = false;
      toggleMusicBtn.textContent = "🎵 เปิดเพลงเทศกาล";
    }
  });
}

// เปิด/ปิด ฟอร์มลอยกระทง
if (showFormBtn && formContainer) {
  showFormBtn.addEventListener("click", () => {
    formContainer.classList.toggle("hidden");
    if (!formContainer.classList.contains("hidden")) {
      formContainer.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// เลือกรูปแบบกระทง
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

// ตรวจสอบความถูกต้องของฟอร์ม
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

statusMessage.textContent = "พร้อมลอยกระทงแล้ว";
btnFloat.innerHTML = "✦ ลอยกระทงทันที";
validateForm();

// อัปเดตรายการคำอธิษฐานและยอดรวมใน Sidebar แบบ Real-time
db.ref("krathongs").on("value", snapshot => {
  const data = snapshot.val();
  wishesListContainer.innerHTML = '';

  if (!data) {
    totalCountEl.textContent = "0";
    wishesListContainer.innerHTML = '<div class="wish-item-placeholder">ยังไม่มีคำอธิษฐาน เริ่มลอยกระทงกันเลย!</div>';
    return;
  }

  const keys = Object.keys(data);
  totalCountEl.textContent = keys.length;

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
  });
});

// ป้องกัน HTML Injection
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// สร้างกระทงและควบคุมระยะใกล้-ไกล (Perspective 3D พร้อมปรับสเกลให้ใหญ่ขึ้นสมดุลกับขนาดใหม่)
db.ref("krathongs").limitToLast(25).on("child_added", (snapshot, prevChildKey) => {
  const item = snapshot.val();
  const key = snapshot.key;
  if (item) {
    const isLatest = !prevChildKey; 
    spawnRealKrathong(item, key, isLatest);
  }
});

function spawnRealKrathong(item, key, isLatest) {
  const floatingAreaEl = document.getElementById("floatingArea");
  if (!floatingAreaEl) return;

  const node = document.createElement("div");
  node.className = "krathong-item";
  
  const inner = document.createElement("div");
  inner.className = "krathong-content";

  const img = document.createElement("img");
  
  if (!item.krathong) {
    const defaultImages = ["1.png", "2.png", "3.png", "4.png", "5.png"];
    const charCode = key ? key.charCodeAt(key.length - 1) : 0;
    img.src = defaultImages[charCode % defaultImages.length];
  } else {
    img.src = item.krathong;
  }
  img.alt = "กระทง";

  const wishDiv = document.createElement("div");
  wishDiv.className = "wishText";
  wishDiv.textContent = `${item.name || 'นิรนาม'}: ${item.wish || ''}`;

  inner.append(img, wishDiv);
  node.appendChild(inner);
  floatingAreaEl.appendChild(node);

  const height = floatingAreaEl.clientHeight || 480;
  
  const bottomPos = Math.random() * (height * 0.6) + 10;
  node.style.bottom = `${bottomPos}px`;
  
  let scaleFactor = 1.25 - (bottomPos / height) * 0.55; 
  
  if (isLatest) {
    scaleFactor += 0.25; 
    node.style.filter = "drop-shadow(0 0 18px rgba(248, 216, 137, 0.95))";
  }

  inner.style.transform = `scale(${scaleFactor})`;
  node.style.zIndex = Math.round(height - bottomPos);

  const duration = 28000 + Math.random() * 9000;
  const delay = -Math.random() * duration;

  node.style.animationDuration = `${duration}ms`;
  node.style.animationDelay = `${delay}ms`;
}

// กดปุ่มส่งกระทง
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
    console.error("Firebase write error:", err);
    statusMessage.textContent = "เกิดข้อผิดพลาด กรุณาลองใหม่";
    btnFloat.removeAttribute("disabled");
  });
});