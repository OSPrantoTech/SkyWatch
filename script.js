// ১. সার্ভিস ওয়ার্কার রেজিস্টার করা (নোটিফিকেশন পিনের জন্য)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker Registered'))
            .catch(err => console.log('Registration Failed', err));
    });
}

// ২. চাঁদের বয়স বের করার ফাংশন
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
        const data = await response.json();
        return data.locality || data.city || "আপনার এলাকা";
    } catch (e) { return "লোকেশন পাওয়া গেছে"; }
}

// ৪. ইন-ডেপথ বিশ্লেষণের HTML জেনারেটর
function generateInDepthAnalysis(cur, finalFeels, rain, dewPoint, uv) {
    const temp = Math.round(cur.air_temperature);
    return `
    <div class="explanation-box">
        <h4><i class="fas fa-chart-pie"></i> ইন-ডেপথ বিশ্লেষণ:</h4>
        <p><strong>তাপমাত্রা ও অনুভূতি:</strong> বর্তমানে ${temp}°C থাকলেও বাতাসের গতি ও আর্দ্রতার কারণে শরীর <strong>${finalFeels}°C</strong> অনুভব করছে।</p>
        <p><strong>পরিবেশ:</strong> মেঘের ঘনত্ব ${cur.cloud_area_fraction}% এবং শিশিরাঙ্ক ${dewPoint}°C। বায়ুচাপ ${cur.air_pressure_at_sea_level} hPa।</p>
        <p><strong>সতর্কতা:</strong> UV ইনডেক্স ${uv}। ${rain > 0 ? `আগামী ১ ঘণ্টায় বৃষ্টিপাতের সম্ভাবনা ${rain}mm।` : "বর্তমানে বৃষ্টির সম্ভাবনা নেই।"}</p>
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
            ongoing: true, // অ্যান্ড্রয়েডে পিন করে রাখার জন্য
            icon: 'logo.png'
        });
    });
}

// ৬. মূল আপডেট ফাংশন
async function updateSkyWatch(lat, lon) {
    try {
        const address = await fetchAddress(lat, lon);
        document.getElementById('location-display').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${address}`;

        const weatherRes = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`, {
            headers: { 'User-Agent': 'SkyWatch/1.0 (OSPranto.Official@gmail.com)' }
        });
        const data = await weatherRes.json();
        const timeseries = data.properties.timeseries;

        const sunRes = await fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`);
        const sunData = await sunRes.json();

        const cur = timeseries[0].data.instant.details;
        const rawTemp = cur.air_temperature;
        const hum = cur.relative_humidity;
        const windKmh = (cur.wind_speed * 3.6).toFixed(1);

        // Feels Like উন্নত সূত্র (Wind Chill + Apparent Temp)
        let feelsLike = rawTemp <= 15 
            ? 13.12 + 0.6215 * rawTemp - 11.37 * Math.pow(windKmh, 0.16) + 0.3965 * rawTemp * Math.pow(windKmh, 0.16)
            : rawTemp + 0.33 * ((hum/100) * 6.105 * Math.exp(17.27 * rawTemp / (237.7 + rawTemp))) - 4.0;
        
        const finalTemp = Math.round(rawTemp);
        const finalFeels = Math.round(feelsLike);
        const uv = cur.ultraviolet_index_clear_sky || 0;
        const rain = timeseries[0].data.next_1_hours ? timeseries[0].data.next_1_hours.details.precipitation_amount : 0;
        const fTime = (iso) => new Date(iso).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });

        // শিশিরাঙ্ক (Dew Point) ক্যালকুলেশন
        let dewPoint = cur.dew_point_temperature || (rawTemp - (100 - hum) / 5);
        dewPoint = Math.round(dewPoint);

        // weather-main সেকশন আপডেট (আপনার রিকোয়েস্ট অনুযায়ী)
        document.getElementById('weather-main').innerHTML = `
            <span class="temp-val">${finalTemp}°C</span>
            <p class="feel-text">অনূভূত হচ্ছে: ${finalFeels}°C</p>
        `;

        // ৮টি আইটেমের গ্রিড আপডেট
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

        // ইন-ডেপথ বিশ্লেষণ এবং টিপস
        document.getElementById('weather-explain').innerHTML = generateInDepthAnalysis(cur, finalFeels, rain, dewPoint, uv);
        document.getElementById('weather-tip').innerHTML = `<strong>💡 টিপস:</strong> ${finalTemp < 20 ? "আবহাওয়া শীতল, হালকা জ্যাকেট সাথে রাখুন।" : "সুতি পোশাক পরুন এবং প্রচুর পানি পান করুন।"}`;

        // নোটিফিকেশন প্যানেলে পিন করা
        pinWeatherNotification(finalTemp, finalFeels, address);

        // আগামী ২৪ ঘণ্টার ফোরকাস্ট স্লাইডার
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

        // আগামী ৭ দিনের ফোরকাস্ট
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
        document.getElementById('weather-main').innerHTML = "ডেটা লোড করতে সমস্যা হচ্ছে।";
    }
}

// লোকেশন পারমিশন এবং ইনিশিয়ালাইজেশন
function init() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => updateSkyWatch(pos.coords.latitude, pos.coords.longitude),
            () => { document.getElementById('weather-main').innerHTML = "লোকেশন পারমিশন প্রয়োজন।"; },
            { enableHighAccuracy: true, timeout: 15000 }
        );
    }
}
init();
