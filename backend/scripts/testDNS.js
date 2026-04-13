const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const https = require('https');

https.get('https://api.razorpay.com/v1/ping', (res) => {
  console.log('Status Code:', res.statusCode);
}).on('error', (e) => {
  console.error('Real Network Error:', e);
});
