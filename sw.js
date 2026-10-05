/* Tonka – lưu giao diện app trong máy để mở ngay, kể cả khi mạng chậm.
   Dữ liệu (chấm công, checklist…) KHÔNG lưu ở đây: luôn lấy từ máy chủ Google. */
const CACHE = 'tonka-ui-9365aa1a00';
const CORE = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icon-t-180.png?v=2', 'icon-t-192.png?v=2'];
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(CORE.map(function(u){ return new Request(u, {cache: 'reload'}); })); }).catch(function(){}).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k.indexOf('tonka-ui-') === 0 && k !== CACHE; }).map(function(k){ return caches.delete(k); })); })
    .then(function(){ return self.clients.claim(); }));
});
function notifyUpdate(){ self.clients.matchAll({type: 'window'}).then(function(cs){ cs.forEach(function(c){ c.postMessage('tonka-update'); }); }); }
self.addEventListener('fetch', function(e){
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (/script\.google(usercontent)?\.com$/.test(url.hostname)) return;   // máy chủ dữ liệu: luôn đi mạng
  const isPage = req.mode === 'navigate';
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !isFont) return;
  const key = isPage ? new Request(new URL('index.html', self.registration.scope).href) : req;
  e.respondWith(caches.open(CACHE).then(function(c){
    return c.match(key).then(function(hit){
      const oldText = isPage && hit ? hit.clone().text() : null;   // đọc bản cũ trước khi đưa ra màn hình
      const net = fetch(isPage ? new Request(key.url, {cache: 'no-cache'}) : (isFont ? req : new Request(req.url, {cache: 'no-cache'}))).then(function(res){
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          if (oldText) {
            Promise.all([oldText, res.clone().text()]).then(function(t){ return c.put(key, copy).then(function(){ if (t[0] !== t[1]) notifyUpdate(); }); });
          } else c.put(key, copy);
        }
        return res;
      }).catch(function(){ return hit; });
      return hit || net;   // có sẵn thì mở ngay, bản mới tải ngầm cho lần sau
    });
  }));
});
