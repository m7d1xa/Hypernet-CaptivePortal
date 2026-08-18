const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldAuthLoginRouter = `        // Redirect to router login or trigger custom MikroTik redirect
        const savedMikrotik = localStorage.getItem('hnet_mikrotik_params');
        if (savedMikrotik) {
          triggerMikrotikRedirect(cData.cardUsername || cData.username || "", cData.cardPassword || cData.password || "");
        } else {
          const routerUrl = \`http://10.10.10.1/login?username=\${encodeURIComponent(cData.cardUsername || cData.username || "")}&password=\${encodeURIComponent(cData.cardPassword || cData.password || "")}\`;
          setTimeout(() => {
            window.location.href = routerUrl;
          }, 800);
        }`;

const newAuthLoginRouter = `        // Redirect to router login or trigger custom MikroTik redirect using form
        triggerMikrotikRedirect(cData.cardUsername || cData.username || "", cData.cardPassword || cData.password || "");`;

code = code.replace(oldAuthLoginRouter, newAuthLoginRouter);
fs.writeFileSync('src/App.tsx', code);
