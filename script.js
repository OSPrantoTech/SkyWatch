/**
 * SkyWatch - Full JavaScript Logic
 * Features: PWA Notification, Wind Chill vs Heat Index (20°C Limit), In-depth Analysis
 */

let lastCoords = null; // To store last known coordinates for pull-to-refresh

// ১. সার্ভিস ওয়ার্কার রেজিস্টার করা (নোটিফিকেশন পিনের জন্য)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker Registered'))
            .catch(err => console.log('Registration Failed', err));
    });
}

// ২. চাঁদের বয়স বের করার ফাংশন (জ্যোতির্বিজ্ঞান লজিক)
function getMoonAge() {
    const date = new Date(), lp = 2551443;
    const now = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const new_moon = new Date(1970, 0, 7, 20, 35, 0);
    return Math.floor((((now.getTime() - new_moon.getTime()) / 1000) % lp) / (24 * 3600)) + 1;
}

// ৩. লোকেশন অ্যাড্রেস বের করার ফাংশন
async function fetchAddress(lat, lon) {
    try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=bn`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.locality || data.city || "আপনার এলাকা";
    } catch (e) {
        console.error("Error fetching address:", e);
        return "লোকেশন পাওয়া গেছে";
    }
}

// ৪. ইন-ডেপথ বিশ্লেষণের HTML জেনারেটর (বিস্তারিত ব্যাখ্যাসহ)
function generateInDepthAnalysis(cur, finalFeels, rain, dewPoint, uv) {
    const temp = Math.round(cur.air_temperature);
    const cloud = cur.cloud_area_fraction;
    const pressure = cur.air_pressure_at_sea_level;
    const moonAge = getMoonAge();

    // মেঘের অবস্থার ব্যাখ্যা
    let cloudDesc = cloud < 20 ? "আকাশ একদম পরিষ্কার" : cloud < 70 ? "আকাশ আংশিক মেঘলা" : "আকাশ পুরোপুরি মেঘাচ্ছন্ন";
    
    // শিশিরাঙ্ক ও অস্বস্তির ব্যাখ্যা
    let comfortDesc = dewPoint > 21 ? "বাতাসে জলীয় বাষ্প বেশি থাকায় ভ্যাপসা গরম লাগতে পারে।" : "বাতাস বেশ আরামদায়ক।";
    
    // বায়ুচাপের ব্যাখ্যা
    let pressureDesc = pressure < 1005 ? "বায়ুচাপ কম, বৃষ্টির সম্ভাবনা আছে।" : "বায়ুচাপ স্বাভাবিক, স্থিতিশীল আবহাওয়া।";

    // UV সতর্কবার্তা
    let uvDesc = uv < 3 ? "নিরাপদ" : uv < 6 ? "মাঝারি (ছাতা ব্যবহার করুন)" : "তীব্র (সরাসরি রোদ এড়িয়ে চলুন)";

    return `
    <div class="explanation-box">
        <h4><i class="fas fa-microscope"></i> সহজ ভাষায় বিশ্লেষণ:</h4>
        
        <p><strong>১. মেঘ ও আকাশ:</strong> বর্তমানে ${cloudDesc} (${cloud}%)। ${cloud > 80 ? "বৃষ্টির জন্য প্রস্তুত থাকুন।" : "রোদের উজ্জ্বলতা বজায় থাকবে।"}</p>
        
        <p><strong>২. বায়ুচাপ:</strong> বর্তমানে বায়ুচাপ ${pressure} hPa। ${pressureDesc}</p>
        
        <p><strong>৩. UV ইনডেক্স:</strong> সূর্যের অতিবেগুনি রশ্মির তীব্রতা ${uv} অর্থাৎ এটি ${uvDesc}।</p>
        
        <p><strong>৪. বৃষ্টিপাত:</strong> বর্তমানে ${rain > 0 ? `প্রতি ঘণ্টায় ${rain}mm বৃষ্টি হচ্ছে বা হওয়ার সম্ভাবনা আছে।` : "বর্তমানে বৃষ্টির কোনো সম্ভাবনা নেই।"}</p>
        
        <p><strong>৫. শিশিরাঙ্ক ও আরাম:</strong> শিশিরাঙ্ক ${dewPoint}°C। ${comfortDesc}</p>
        
        <p><strong>৬. চাঁদের দশা:</strong> আজ চাঁদের বয়স ${moonAge} দিন। ${moonAge > 13 && moonAge < 17 ? "আজ পূর্ণিমার কাছাকাছি সময়, আকাশ বেশ উজ্জ্বল থাকবে।" : moonAge > 27 || moonAge < 3 ? "আজ অমাবস্যার কাছাকাছি সময়।" : "চাঁদ আংশিক দৃশ্যমান।"}</p>
    </div>`;
}

// ৫. নোটিফিকেশন প্যানেলে পিন করার ফাংশন
async function pinWeatherNotification(temp, feelsLike, address) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
        sendToSW(temp, feelsLike, address);
    } else {
        const permission = await Notification.requestPermission();
        if (permission === "granted") sendToSW(temp, feelsLike, address);
    }
}

function sendToSW(temp, feelsLike, address) {
    navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(`SkyWatch: ${temp}°C`, {
            body: `অনুভূত হচ্ছে: ${feelsLike}°C | ${address}`,
            tag: 'live-weather',
            ongoing: true, // পিন করে রাখার জন্য
            icon: 'logo.png',
            badge: 'logo.png'
        });
    });
}

// ৬. মূল আপডেট ফাংশন
async function updateSkyWatch(lat, lon) {
    try {
        const address = await fetchAddress(lat, lon);
        document.getElementById('location-display').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${address}`;

        const weatherRes = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`, {
            headers: { 'User-Agent': 'SkyWatch/1.0' }
        });
        if (!weatherRes.ok) throw new Error(`Weather API error: ${weatherRes.status}`);
        const data = await weatherRes.json();
        const timeseries = data.properties.timeseries;

        const sunRes = await fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`);
        if (!sunRes.ok) throw new Error(`Sun API error: ${sunRes.status}`);
        const sunData = await sunRes.json();

        const cur = timeseries[0].data.instant.details;
        const rawTemp = cur.air_temperature;
        const hum = cur.relative_humidity;
        const windKmh = (cur.wind_speed * 3.6).toFixed(1);

        // --- সংশোধিত লজিক: ২০°C লিমিট সেট করা হয়েছে ---
        let feelsLike = rawTemp <= 20 
            ? 13.12 + 0.6215 * rawTemp - 11.37 * Math.pow(windKmh, 0.16) + 0.3965 * rawTemp * Math.pow(windKmh, 0.16)
            : rawTemp + 0.33 * ((hum/100) * 6.105 * Math.exp(17.27 * rawTemp / (237.7 + rawTemp))) - 4.0;
        
        const finalTemp = Math.round(rawTemp);
        const finalFeels = Math.round(feelsLike);
        const uv = cur.ultraviolet_index_clear_sky || 0;
        const rain = timeseries[0].data.next_1_hours ? timeseries[0].data.next_1_hours.details.precipitation_amount : 0;
        const fTime = (iso) => new Date(iso).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });

        let dewPoint = Math.round(cur.dew_point_temperature || (rawTemp - (100 - hum) / 5));

        // UI আপডেট: weather-main
        document.getElementById('weather-main').innerHTML = `
            <span class="temp-val">${finalTemp}°C</span>
            <p class="feel-text">অনূভূত হচ্ছে: ${finalFeels}°C</p>
        `;

        // গ্রিড আপডেট (৮টি আইটেম)
        document.getElementById('weather-details').innerHTML = `
            <div class="detail-item"><i class="fas fa-cloud"></i> মেঘ: ${cur.cloud_area_fraction}%</div>
            <div class="detail-item"><i class="fas fa-gauge-high"></i> বায়ুচাপ: ${cur.air_pressure_at_sea_level}hPa</div>
            <div class="detail-item"><i class="fas fa-sun"></i> UV ইনডেক্স: ${uv}</div>
            <div class="detail-item"><i class="fas fa-droplet"></i> বৃষ্টিপাত: ${rain}mm</div>
            <div class="detail-item"><i class="fas fa-tint"></i> শিশিরাঙ্ক: ${dewPoint}°C</div>
            <div class="detail-item"><i class="fas fa-moon"></i> চাঁদের বয়স: ${getMoonAge()} দিন</div>
            <div class="detail-item"><i class="fas fa-sun"></i> সূর্যোদয়: ${fTime(sunData.results.sunrise)}</div>
            <div class="detail-item"><i class="fas fa-mountain-sun"></i> সূর্যাস্ত: ${fTime(sunData.results.sunset)}</div>
        `;

        // ইন-ডেপথ ডিটেইলস আপডেট
        document.getElementById('weather-explain').innerHTML = generateInDepthAnalysis(cur, finalFeels, rain, dewPoint, uv);
        
        // টিপস সেকশন
        document.getElementById('weather-tip').innerHTML = `<strong>💡 টিপস:</strong> ${finalTemp < 20 ? "আবহাওয়া শীতল, হালকা জ্যাকেট বা চাদর সাথে রাখুন।" : "সুতি পোশাক পরুন এবং শরীর হাইড্রেটেড রাখুন।"}`;

        // নোটিফিকেশন আপডেট
        pinWeatherNotification(finalTemp, finalFeels, address);

        // ফোরকাস্ট স্লাইডার (Hourly)
        let hourlyHtml = '';
        for(let i=1; i<=24; i++) {
            const hData = timeseries[i];
            const hTime = new Date(hData.time).getHours() + ":00";
            hourlyHtml += `
                <div class="hourly-item">
                    <span>${hTime}</span><br>
                    <i class="fas fa-cloud-sun" style="color:#facc15"></i><br>
                    <span>${Math.round(hData.data.instant.details.air_temperature)}°</span>
                </div>`;
        }
        document.getElementById('hourly-forecast').innerHTML = hourlyHtml;

        // ৭ দিনের ফোরকাস্ট
        let dailyData = {};
        timeseries.forEach(item => {
            const date = item.time.split('T')[0];
            const t = item.data.instant.details.air_temperature;
            if (!dailyData[date]) dailyData[date] = { min: t, max: t };
            else {
                if (t < dailyData[date].min) dailyData[date].min = t;
                if (t > dailyData[date].max) dailyData[date].max = t;
            }
        });
        let dailyHtml = '';
        Object.keys(dailyData).slice(1, 8).forEach(date => {
            const dayName = new Date(date).toLocaleDateString('bn-BD', { weekday: 'long' });
            dailyHtml += `
                <div class="daily-item">
                    <span>${dayName}</span>
                    <span>${Math.round(dailyData[date].min)}° / ${Math.round(dailyData[date].max)}°C</span>
                </div>`;
        });
        document.getElementById('daily-forecast').innerHTML = dailyHtml;

    } catch (e) {
        console.error("Error updating weather:", e);
        if (!navigator.onLine) {
            const locationDisplay = document.getElementById('location-display');
            if (!locationDisplay.innerHTML.includes('অফলাইনে')) {
                locationDisplay.innerHTML += '<br><small style="color: #facc15;">আপনি অফলাইনে আছেন। সর্বশেষ সংরক্ষিত ডেটা দেখানো হচ্ছে।</small>';
            }
        } else {
            document.getElementById('weather-main').innerHTML = "আবহাওয়ার ডেটা লোড করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।";
        }
    }
}

// ইনিশিয়ালাইজেশন
function init() {
    document.getElementById('copyright-year').textContent = new Date().getFullYear();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                lastCoords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                updateSkyWatch(pos.coords.latitude, pos.coords.longitude);
            },
            () => { document.getElementById('weather-main').innerHTML = "অবস্থান অ্যাক্সেস করা যায়নি। অনুগ্রহ করে অবস্থান অনুমতি দিন।"; },
            { enableHighAccuracy: true, timeout: 15000 }
        );
    }
}

// Pull-to-refresh Logic
let startY = 0;
let isPulling = false;

document.body.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) {
        startY = e.touches[0].pageY;
        isPulling = true;
    }
}, { passive: true });

document.body.addEventListener('touchmove', (e) => {
    if (!isPulling) return;
    const y = e.touches[0].pageY;
    const diff = y - startY;

    if (diff > 0) {
        document.body.style.transform = `translateY(${Math.min(diff / 2, 100)}px)`;
    }
}, { passive: true });

document.body.addEventListener('touchend', (e) => {
    if (!isPulling) return;
    const y = e.changedTouches[0].pageY;
    const diff = y - startY;

    document.body.style.transition = 'transform 0.3s';
    document.body.style.transform = 'translateY(0)';

    if (diff > 120 && lastCoords) { // Threshold to trigger refresh
        const mainCard = document.querySelector('.main-temp');
        mainCard.innerHTML = '<span class="temp-val" style="font-size: 2rem;">রিফ্রেশ হচ্ছে...</span>';
        updateSkyWatch(lastCoords.latitude, lastCoords.longitude);
    }
    
    setTimeout(() => {
        document.body.style.transition = '';
    }, 300);

    isPulling = false;
});

init();
