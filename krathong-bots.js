/* Decorative local-only krathongs. Never writes to Firebase. */
(() => {
 "use strict";
 const area = document.getElementById("floatingArea");
 if (!area) return;
 const wishes = [
  "ขอให้มีความสุขทุกวัน 🌕","ขอให้สุขภาพแข็งแรง","ขอให้ทุกความฝันเป็นจริง",
  "ขอให้ครอบครัวอบอุ่น","ขอให้โชคดีตลอดปี","ขอให้พบเจอสิ่งดี ๆ",
  "ขอให้การเรียนก้าวหน้า","ขอให้มีรอยยิ้มเสมอ","ขอให้สมหวังดังตั้งใจ",
  "ขอให้ความทุกข์ลอยไป","ขอให้โลกสดใสขึ้นทุกวัน","ขอให้พบมิตรภาพดี ๆ",
  "ขอให้ทุกคนปลอดภัย","ขอให้มีพลังใจ","ขอให้ปีนี้เป็นปีที่ดี",
  "ขอให้รักและเมตตากัน","ขอให้มีความสุขกับครอบครัว",
  "ขอให้ทุกวันเป็นวันพิเศษ","ขอให้สิ่งดี ๆ เข้ามา","สุขสันต์วันลอยกระทง"
 ];
 const images = ["1.png","2.png","3.png","4.png","5.png"];
 const active = new Set();
 const rand=(a,b)=>a+Math.random()*(b-a);
 const choose=arr=>arr[Math.floor(Math.random()*arr.length)];
 function spawn(){
  if(document.hidden || active.size>=6) return;
  const node=document.createElement("div");
  node.className="krathong bot-krathong";
  node.setAttribute("aria-hidden","true");
  const inner=document.createElement("div");
  inner.className="krathong-inner";
  const img=document.createElement("img");
  img.src=choose(images); img.alt="";
  const wish=document.createElement("div");
  wish.className="wishText";wish.textContent=choose(wishes);
  inner.append(img,wish);node.appendChild(inner);area.appendChild(node);
  active.add(node);
  const fromLeft=Math.random()<.5;
  const duration=rand(23000,33000);
  const width=area.clientWidth;
  node.style.bottom=`${rand(5,Math.max(7,area.clientHeight*.32))}px`;
  node.style.left=fromLeft?"-180px":`${width+180}px`;
  node.style.pointerEvents="none";
  node.style.transition=`transform ${duration}ms linear`;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    node.style.transform=`translateX(${fromLeft?width+390:-(width+390)}px)`;
  }));
  setTimeout(()=>{node.remove();active.delete(node)},duration+350);
 }
 for(let i=0;i<3;i++)setTimeout(spawn,i*1800);
 function repeat(){setTimeout(()=>{spawn();repeat()},rand(8000,14000))}
 repeat();
})();