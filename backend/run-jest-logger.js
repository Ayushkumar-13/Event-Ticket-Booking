const { exec } = require('child_process');
const fs = require('fs');

exec('npx jest src/__tests__/event.test.js', (error, stdout, stderr) => {
    fs.writeFileSync('jest-raw-trace.log', stdout + '\n\n' + stderr);
});
