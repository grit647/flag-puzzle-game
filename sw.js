// Service worker ขั้นต่ำสุด — มีไว้เพื่อให้เบราว์เซอร์ยอมให้ "ติดตั้งแอป" ได้ (PWA ต้องมี SW)
// ไม่ได้ cache อะไรพิเศษ ปล่อยให้โหลดจากเน็ตตามปกติ
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', () => {
  // ปล่อยผ่าน ใช้พฤติกรรมเริ่มต้นของเบราว์เซอร์
});
