/** Sunucu bileşenlerinden (layout) güvenle import edilebilsin diye "use client" dosyasından ayrıldı. */
export const THEME_STORAGE_KEY = "yildirim_theme";

/** <head> içine enjekte edilir: ilk boyamadan önce temayı uygular (yanıp sönmeyi önler). Varsayılan: koyu. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.classList.toggle('dark',t==='dark')}catch(e){document.documentElement.classList.add('dark')}})();`;
