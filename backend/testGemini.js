require('dotenv').config({path: './.env'});
const key = process.env.GEMINI_API_KEY;

(async () => {
  const payload = {
    tools: [{ functionDeclarations: [{ name: 'test', description: 'test', parameters: { type: 'OBJECT', properties: { a: { type: 'STRING' } } } }] }],
    contents: [
      { role: 'user', parts: [{ text: 'call test with a=b' }] },
      { role: 'model', parts: [{ functionCall: { name: 'test', args: { a: 'b' } } }] },
      { role: 'user', parts: [{ functionResponse: { name: 'test', response: { status: 'ok' } } }] }
    ]
  };

  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + key, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  console.log("USER ROLE:", await res.json());

  payload.contents[2].role = 'function';
  const res2 = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + key, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  console.log("FUNCTION ROLE:", await res2.json());
})();
