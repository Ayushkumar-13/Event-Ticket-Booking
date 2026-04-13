const https = require('https');

https.get('https://api.razorpay.com/v1/ping', (res) => {
  console.log('Status Code:', res.statusCode);
}).on('error', (e) => {
  console.error('Real Network Error:', e);
});

fetch('https://api.razorpay.com/v1/ping').then(res => res.text()).then(console.log).catch(err => console.log('Fetch error:', err));
