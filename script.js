"use strict";

const firebaseConfig = {
  apiKey: "AIzaSyCQj002kkZW-NcJBNYxcWdEnujY9tRqDow",
  authDomain: "loykrathong-74274.firebaseapp.com",
  databaseURL: "https://loykrathong-74274-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "loykrathong-74274",
  storageBucket: "loykrathong-74274.firebasestorage.app",
  messagingSenderId: "215445659075",
  appId: "1:215445659075:web:47c8c41294558a140df176",
  measurementId: "G-LQ5MXEY63N"
};

const ALLOWED_IMAGES = new Set(["1.png", "2.png", "3.png", "4.png", "5.png"]);
const COOLDOWN_MS = 3_000;
const VISIBLE_MS = 120_000;
const MAX_WISH_LENGTH = 100;

const btnFloat = document.getElementById("btnFloat");
const userNameInput = document.getElementById("userNameInput");
const wishInput = document.getElementById("wishInput");
const floatingArea = document.getElementById("floatingArea");
const statusMessage = document.getElementById("statusMessage");
const totalCountElement = document.getElementById("totalKrathongCount");
const formContainer = document.getElementById("formContainer");
const showFormBtn = document.getElementById("showFormBtn");
const choices = [...document.querySelectorAll("#krathongChoices img")];

let selectedKrathong = "1.png";
let currentUser = null;
let pending = false;
let lastSuccessAt = 0;
let databaseReady = false;
let krathongQuery = null;
const activeElements = new Map();

function status(text) { statusMessage.textContent = text; }

function updateButton() {
  const seconds = Math.ceil(Math.max(0, COOLDOWN_MS - (Date.now() - lastSuccessAt)) / 1000);
  btnFloat.disabled = !currentUser || !databaseReady || pending || seconds > 0;
  btnFloat.textContent = pending ? "กำลังส่งกระทง..." : seconds > 0 ? `รอ ${seconds} วินาที` : "ลอยกระทง";
}

function selectImage(choice) {
  const value = choice.dataset.src;
  if (!ALLOWED_IMAGES.has(value)) return;
  selectedKrathong = value;
  choices.forEach(c => {
    const selected = c === choice;
    c.classList.toggle("selected", selected);
    c.setAttribute("aria-pressed", String(selected));
  });
}

choices.forEach(choice => {
  choice.addEventListener("click", () => selectImage(choice));
  choice.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectImage(choice);
    }
  });
});

function removeKrathong(key) {
  const existing = activeElements.get(key);
  if (!existing) return;
  clearTimeout(existing.animationTimer);
  clearTimeout(existing.expiryTimer);
  existing.element.remove();
  activeElements.delete(key);
}

function renderKrathong(key, data) {
  if (!data || !ALLOWED_IMAGES.has(data.img) || typeof data.wish !== "string" ||
      data.wish.length < 1 || data.wish.length > MAX_WISH_LENGTH ||
      typeof data.time !== "number" || !Number.isFinite(data.time)) return;
  
  removeKrathong(key);
  const age = Date.now() - data.time;
  if (age > VISIBLE_MS || age < -60_000) return;

  const krathong = document.createElement("div");
  krathong.className = "krathong";
  
  const inner = document.createElement("div");
  inner.className = "krathong-inner";
  
  const img = document.createElement("img");
  img.src = data.img; 
  img.alt = "กระทง";
  
  const wish = document.createElement("div");
  wish.className = "wishText";
  wish.textContent = `${data.name || 'ชาวห้วยลาน'}: ${data.wish}`; 

  inner.append(img, wish);
  krathong.appendChild(inner);
  floatingArea.appendChild(krathong);

  const fromLeft = Math.random() < 0.5;
  const duration = 18_000 + Math.random() * 6_000;
  const distance = window.innerWidth + 400;

  krathong.style.bottom = `${Math.random() * (floatingArea.clientHeight - 80)}px`;
  krathong.style.left = fromLeft ? "-150px" : `${window.innerWidth + 150}px`;
  krathong.style.transition = `transform ${duration}ms linear`;

  const animationTimer = setTimeout(() => {
    krathong.style.transform = `translateX(${fromLeft ? distance : -distance}px)`;
  }, 50);

  const expiryTimer = setTimeout(() => removeKrathong(key), Math.min(duration + 100, Math.max(1000, VISIBLE_MS - age)));
  activeElements.set(key, { element: krathong, animationTimer, expiryTimer });
}

function listenForKrathongs(db) {
  krathongQuery = db.ref("krathongs").orderByChild("time").limitToLast(100);
  
  krathongQuery.on("child_added", snap => {
    renderKrathong(snap.key, snap.val());
  }, err => status(`อ่านข้อมูลไม่ได้: ${err.message}`));

  krathongQuery.on("child_changed", snap => renderKrathong(snap.key, snap.val()));
  krathongQuery.on("child_removed", snap => removeKrathong(snap.key));

  // นับจำนวนคนลอยกระทงจากข้อมูลในดาต้าเบสแบบ Real-time
  db.ref("krathongs").on("value", snapshot => {
    if (snapshot.exists()) {
      const count = snapshot.numChildren();
      totalCountElement.textContent = count.toLocaleString();
    } else {
      totalCountElement.textContent = "0";
    }
  });
}

async function floatKrathong(db) {
  if (pending || !currentUser || !databaseReady) return;
  const name = userNameInput.value.trim() || "ชาวห้วยลาน";
  const wish = wishInput.value.trim();

  if (!wish || wish.length > MAX_WISH_LENGTH) {
    status("กรุณาเขียนคำอธิษฐาน 1–100 ตัวอักษร");
    return;
  }
  if (Date.now() - lastSuccessAt < COOLDOWN_MS) {
    status("กรุณารอสักครู่ก่อนลอยกระทงอีกครั้ง");
    return;
  }

  pending = true;
  updateButton();
  try {
    const newRef = db.ref("krathongs").push();
    await newRef.set({
      name: name,
      img: selectedKrathong,
      wish: wish,
      time: firebase.database.ServerValue.TIMESTAMP
    });
    lastSuccessAt = Date.now();
    wishInput.value = "";
    userNameInput.value = "";
    status("ลอยกระทงสำเร็จ ขอคำอธิษฐานเป็นจริง 🌕");

    // ซ่อนกล่องฟอร์มเมื่อลอยเสร็จ และแสดงปุ่มลอยเพิ่ม
    formContainer.classList.add("hidden");
    showFormBtn.style.display = "block";

  } catch (err) {
    console.error("Firebase write failed:", err);
    status("ส่งกระทงไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตและลองอีกครั้ง");
  } finally {
    pending = false;
    updateButton();
  }
}

showFormBtn.addEventListener("click", () => {
  formContainer.classList.remove("hidden");
  showFormBtn.style.display = "none";
  status("");
});

async function main() {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const auth = firebase.auth();
  const db = firebase.database();
  
  db.ref(".info/connected").on("value", snap => {
    databaseReady = snap.val() === true;
    if (!databaseReady) status("กำลังเชื่อมต่อฐานข้อมูล...");
    else if (currentUser) status("พร้อมลอยกระทง 🌕");
    updateButton();
  });

  auth.onAuthStateChanged(async user => {
    if (user) {
      currentUser = user;
      status("เชื่อมต่อสำเร็จ พร้อมลอยกระทง");
      if (!krathongQuery) listenForKrathongs(db);
      updateButton();
    } else {
      currentUser = null;
      if (krathongQuery) {
        krathongQuery.off();
        krathongQuery = null;
      }
      activeElements.forEach((_, key) => removeKrathong(key));
      updateButton();
      try { await auth.signInAnonymously(); }
      catch (err) { console.error(err); status(`เข้าสู่ระบบไม่สำเร็จ: ${err.message}`); }
    }
  });

  btnFloat.addEventListener("click", () => floatKrathong(db));
  wishInput.addEventListener("keydown", event => {
    if (event.key === "Enter") floatKrathong(db);
  });
  setInterval(updateButton, 1000);
}

main().catch(err => { console.error(err); status(`เริ่มระบบไม่สำเร็จ: ${err.message}`); });

const charCount = document.getElementById("charCount");
if (charCount && wishInput) {
  const refreshCount = () => { charCount.textContent = `${wishInput.value.length}/100`; };
  wishInput.addEventListener("input", refreshCount);
  refreshCount();
}