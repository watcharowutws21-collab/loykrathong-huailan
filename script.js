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

// เชื่อมต่อระบบ Firebase แบบไม่ระบุตัวตน (Anonymous Auth)
auth.signInAnonymously().then(() => {
  statusMessage.textContent = "พร้อมลอยกระทงแล้ว";
  btnFloat.innerHTML = "✦ ลอยกระทงทันที";
  validateForm();
}).catch(err => {
  console.error("Auth error:", err);
  statusMessage.textContent = "เชื่อมต่อระบบล้มเหลว กรุณารีเฟรชใหม่";
});

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

// ป้องกัน HTML Injection เพื่อความปลอดภัย
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// สร้างกระทงจริงบนแม่น้ำโดยไม่รบกวนกระทงอื่นเมื่อมีข้อมูลใหม่เข้ามา
db.ref("krathongs").limitToLast(40).on("child_added", snapshot => {
  const item = snapshot.val();
  if (item) {
    spawnRealKrathong(item);
  }
});

function spawnRealKrathong(item) {
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
  
  const floatingAreaEl = document.getElementById("floatingArea");
  if (!floatingAreaEl) return;
  floatingAreaEl.appendChild(node);

  const width = floatingAreaEl.clientWidth || window.innerWidth;
  const height = floatingAreaEl.clientHeight || 450;
  
  const bottomPos = Math.random() * (height * 0.7);
  node.style.bottom = `${bottomPos}px`;
  
  const duration = 26000 + Math.random() * 8000;
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