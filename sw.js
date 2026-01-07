const CACHE_NAME = 'skywatch-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css'
];

// ইনস্টল এবং ক্যাশ করা
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// নোটিফিকেশন শো করার লজিক
self.addEventListener('showWeatherNotification', (event) => {
  const { temp, feelsLike, address } = event.data;
  
  const options = {
    body: `অনুভূত হচ্ছে: ${feelsLike}°C | ${address}`,
    icon: 'logo.png', // আপনার লোগো ফাইল
    badge: 'logo.png',
    tag: 'live-weather', // একই ট্যাগ থাকলে নোটিফিকেশন ওভাররাইট হবে
    ongoing: true,      // অ্যান্ড্রয়েডে এটি স্লাইড করে রিমুভ করা কঠিন করে
    sticky: true        // পিন করে রাখার চেষ্টা করবে
  };

  self.registration.showNotification(`SkyWatch: ${temp}°C`, options);
});
