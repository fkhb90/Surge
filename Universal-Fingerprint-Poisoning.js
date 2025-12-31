// ==UserScript==
// @name         🛡️ FP-Shield v1.22 (Fingerprint Protection)
// @namespace    http://tampermonkey.net/
// @version      1.22
// @description  [v1.22] 引入「動態網格位移 (Dynamic Grid Shifting)」技術。解決指紋 Hash 重複率過高問題，確保每次重整頁面都能生成截然不同的指紋。
// @author       Claude & Gemini
// @match        *://*/*
// @run-at       document-start
// @grant        none
//
// --- [白名單避讓設定] ---
//
// --- E-Commerce (Shopee) ---
// @exclude      *://*.shopee.tw/*
// @exclude      *://*.shopee.com/*
// @exclude      *://*.shopeemobile.com/*
// @exclude      *://*.susercontent.com/*
// @exclude      *://*.shopee.ph/*
// @exclude      *://*.shopee.my/*
// @exclude      *://*.shopee.sg/*
// @exclude      *://*.shopee.th/*
// @exclude      *://*.shopee.co.id/*
// @exclude      *://*.shopee.vn/*
//
// --- Developer Tools (GitHub) ---
// Note: [v1.22] 預設排除 github.io 以免干擾部落格閱讀。若需測試 CreepJS，請暫時移除下方 github.io 的排除規則。
// @exclude      *://*.github.com/*
// @exclude      *://*.githubusercontent.com/*
// @exclude      *://*.githubassets.com/*
// @exclude      *://git.io/*
// @exclude      *://*.github.io/*
//
// --- LINE Ecosystem ---
// @exclude      *://*.line-apps.com/*
// @exclude      *://*.line.me/*
// @exclude      *://*.naver.jp/*
// @exclude      *://*.line-scdn.net/*
// @exclude      *://*.nhncorp.jp/*
// @exclude      *://*.line-cdn.net/*
// @exclude      *://*.linetv.tw/*
// @exclude      *://*.worksmobile.com/*
//
// --- Messaging & VoIP ---
// @exclude      *://*.whatsapp.net/*
// @exclude      *://*.whatsapp.com/*
// @exclude      *://*.telegram.org/*
// @exclude      *://*.messenger.com/*
// @exclude      *://*.skype.com/*
// @exclude      *://web.whatsapp.com/*
//
// --- System & Cloud ---
// @exclude      *://*.googleapis.com/*
// @exclude      *://*.gstatic.com/*
// @exclude      *://*.google.com/*
// @exclude      *://*.apple.com/*
// @exclude      *://*.icloud.com/*
// @exclude      *://*.microsoft.com/*
// @exclude      *://*.windowsupdate.com/*
// @exclude      *://*.azure.com/*
//
// --- Streaming (Avoid DRM/Playback Issues) ---
// @exclude      *://*.youtube.com/*
// @exclude      *://*.googlevideo.com/*
// @exclude      *://*.netflix.com/*
// @exclude      *://*.nflxvideo.net/*
// @exclude      *://*.spotify.com/*
// ==/UserScript==

(function() {
    'use strict';

    const injectionCode = `
    (function() {
        // --- 核心配置 ---
        const CONFIG = {
            noiseIntensity: 2, 
            spoofNative: true
        };

        // 1. 穩定隨機數生成器 (Seeded Random)
        // 使用 Date.now() 與 Math.random() 混合生成高熵種子
        const SESSION_SEED = Math.floor(Math.random() * 1000000) + Date.now();
        const pseudoRandom = (input) => {
            const x = Math.sin(input + SESSION_SEED) * 10000;
            return x - Math.floor(x);
        };
        const getStableNoise = (index) => Math.floor(pseudoRandom(index) * 5) - 2;

        // [v1.22] 動態網格位移 (Dynamic Grid Shifting)
        // 根據種子計算一個隨機偏移量 (0~200)，決定從哪一顆像素開始修改
        // 這確保了每次 Session 修改的像素位置都完全不同
        const GRID_OFFSET = Math.floor(pseudoRandom(999) * 200);

        // 2. 原生代碼偽裝 (Native Code Spoofing)
        const originalToString = Function.prototype.toString;
        const hookedFunctions = new WeakMap();

        if (CONFIG.spoofNative) {
            const toStringProxy = new Proxy(originalToString, {
                apply: function(target, thisArg, args) {
                    if (thisArg && hookedFunctions.has(thisArg)) {
                        return target.call(hookedFunctions.get(thisArg), ...args);
                    }
                    return target.call(thisArg, ...args);
                }
            });
            Function.prototype.toString = toStringProxy;
            hookedFunctions.set(toStringProxy, originalToString);
        }

        function hookFunc(proto, funcName, wrapper) {
            if (!proto) return;
            const original = proto[funcName];
            if (!original) return;

            wrapper.prototype = original.prototype;
            if (CONFIG.spoofNative) {
                hookedFunctions.set(wrapper, original);
            }

            try {
                Object.defineProperty(proto, funcName, {
                    value: wrapper,
                    configurable: true,
                    enumerable: true,
                    writable: true
                });
            } catch(e) {
                proto[funcName] = wrapper;
            }
        }

        console.log("%c[FP-Defender] v1.22 (High-Entropy) Active", "color: #00ff00; background: #000; padding: 4px;");

        try {
            // --- 3. Canvas Fingerprinting (Dynamic Grid) ---
            const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
            
            hookFunc(CanvasRenderingContext2D.prototype, 'getImageData', function(x, y, w, h) {
                const imageData = originalGetImageData.apply(this, arguments);
                if (w < 50 && h < 50) return imageData; 
                
                const { data } = imageData;
                // [v1.22] 使用像素索引 (i/4) 加上隨機偏移量 (GRID_OFFSET) 進行取模運算
                // 這樣每次 Session 修改的像素分佈都會發生位移
                for (let i = 0; i < data.length; i += 4) {
                    const pixelIndex = i / 4;
                    if ((pixelIndex + GRID_OFFSET) % 200 === 0) { 
                        const n = getStableNoise(pixelIndex);
                        data[i] = Math.min(255, Math.max(0, data[i] + n));
                        data[i+1] = Math.min(255, Math.max(0, data[i+1] + n));
                        data[i+2] = Math.min(255, Math.max(0, data[i+2] + n));
                    }
                }
                return imageData;
            });

            // --- 4. WebGL Fingerprinting ---
            hookFunc(WebGLRenderingContext.prototype, 'getParameter', function(parameter) {
                if (parameter === 37445) return 'Intel Inc.'; 
                if (parameter === 37446) return 'Intel Iris OpenGL Engine'; 
                return WebGLRenderingContext.prototype.getParameter.apply(this, arguments);
            });

            if (typeof WebGL2RenderingContext !== 'undefined') {
                hookFunc(WebGL2RenderingContext.prototype, 'getParameter', function(parameter) {
                    if (parameter === 37445) return 'Intel Inc.'; 
                    if (parameter === 37446) return 'Intel Iris OpenGL Engine'; 
                    return WebGL2RenderingContext.prototype.getParameter.apply(this, arguments);
                });
            }

            // --- 5. AudioContext Fingerprinting ---
            if (window.AudioBuffer && window.AudioBuffer.prototype) {
                const originalGetChannelData = window.AudioBuffer.prototype.getChannelData;
                hookFunc(window.AudioBuffer.prototype, 'getChannelData', function(channel) {
                    const results = originalGetChannelData.apply(this, arguments);
                    // 同樣應用偏移邏輯，增加音訊指紋的隨機性
                    const offset = GRID_OFFSET % 50; 
                    for (let i = offset; i < results.length; i += 100) {
                        results[i] += (pseudoRandom(i) * 0.00001); 
                    }
                    return results;
                });
            }
        } catch (e) { console.error("[FP-Defender] Error:", e); }
    })();
    `;

    const script = document.createElement('script');
    script.textContent = injectionCode;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
})();
