# Olympic Challenge Dashboard

Dashboard แสดงผลการแข่งขันธีมกีฬาโอลิมปิก สำหรับจอขนาดใหญ่ (TV / Projector) อัตราส่วน 16:9  
สร้างด้วย **React** + Vite

## วิธีเปิดใช้งาน

```bash
# ติดตั้ง dependencies
npm install

# รันโหมดพัฒนา
npm run dev
```

จากนั้นเปิด URL ที่แสดง (เช่น `http://localhost:5173`) ในเบราว์เซอร์

- **Dashboard (จอแสดงผล)**: `http://localhost:5173/`
- **หน้า Admin (กรอกคะแนน)**: `http://localhost:5173/admin`

```bash
# Build สำหรับ production
npm run build

# ดูผลลัพธ์หลัง build
npm run preview
```

## โครงสร้างหน้าจอ

- **หัวข้อ**: Olympic Challenge Dashboard (ตรงกลาง)
- **ตัวจับเวลา**: แสดงเวลารอบการแข่งขัน (นาที:วินาที)
- **กระดานคะแนน**: แถบคะแนนรวม 4 ทีม พร้อมอันดับ
- **การ์ดทีม 4 ช่อง**: เขียว, แดง, เหลือง, น้ำเงิน แต่ละการ์ดมี:
  - ชื่อทีม
  - คะแนนขนาดใหญ่ (แบบเรืองแสง)
  - แถบความคืบหน้า (Progress Bar)
  - จำนวนเหรียญ
  - อันดับ
- **Last update**: เวลาอัปเดตคะแนนล่าสุด

## ฟีเจอร์

- อัตราส่วน 16:9 รองรับจอ TV/Projector
- ฟอนต์ใหญ่ อ่านง่ายจากระยะไกล
- สีทีมชัดเจน (เขียวสด, แดงเข้ม, เหลืองทอง, น้ำเงินเข้ม)
- เอฟเฟกต์ confetti และบรรยากาศสนาม
- อัปเดตคะแนนและอันดับแบบจำลองเรียลไทม์
- ตัวจับเวลานับถอยหลัง

## โครงสร้างโปรเจกต์ (React)

- `index.html` — entry ของ Vite
- `src/main.jsx` — จุดเข้า React
- `src/App.jsx` — หน้า Dashboard หลัก + state
- `src/index.css` — สไตล์รวม
- `src/constants.js` — ค่าคงที่ (ทีม, สี)
- `src/components/` — Header, RoundTimer, ScoreboardStrip, TeamCard, Confetti, LiveTicker
- `src/pages/DashboardPage.jsx` — หน้า Dashboard แสดงผล
- `src/pages/AdminPage.jsx` — หน้า Admin สำหรับกรอกคะแนน / เหรียญ / ตัวจับเวลา
- `src/context/ScoreContext.jsx` — state ร่วม (คะแนน, เหรียญ, เวลา) + sync ผ่าน localStorage รองรับหลายแท็บ
