const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldRouterLogin2 = `    // Redirect to router login or trigger custom MikroTik redirect
    const savedMikrotik = localStorage.getItem('hnet_mikrotik_params');
    if (savedMikrotik) {
      triggerMikrotikRedirect(userVal, passVal);
    } else {
      const routerLoginUrl = \`http://10.10.10.1/login?username=\${encodeURIComponent(userVal)}&password=\${encodeURIComponent(passVal)}\`;
      setTimeout(() => {
        window.location.href = routerLoginUrl;
      }, 600);
    }`;

const newRouterLogin2 = `    // Redirect to router login or trigger custom MikroTik redirect
    triggerMikrotikRedirect(userVal, passVal);`;

code = code.replace(oldRouterLogin2, newRouterLogin2);
fs.writeFileSync('src/App.tsx', code);
