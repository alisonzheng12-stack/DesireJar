// sw.js — Service Worker for 慾望抵抗存錢罐 PWA
const CACHE = 'desire-jar-v1';
const SHELL = [
  './index.html',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap'
];

// 安裝：快取 app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// 啟用：清除舊快取
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch 策略
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Firebase / Firestore / Auth — 永遠走網路，不快取
  if (
    url.includes('firebaseapp.com') ||
    url.includes('firestore.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com/firebasejs')
  ) {
    return; // 讓瀏覽器直接處理，不攔截
  }

  // Google Fonts CSS — 網路優先，失敗走快取
  if (url.includes('fonts.googleapis.com')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // App shell (index.html 及其他本地資源) — 快取優先，背景更新
  if (e.request.mode === 'navigate' || url.startsWith(self.location.origin)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const network = fetch(e.request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        });
        return cached || network;
      })
    );
  }
});
