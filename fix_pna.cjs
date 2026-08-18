const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const newTriggerMikrotik = `  const triggerMikrotikRedirect = (cardCode: string, cardPassword?: string) => {
    let params = mikrotikParams;
    if (!params || Object.keys(params).length === 0) {
      try {
        const saved = localStorage.getItem('hnet_mikrotik_params');
        if (saved) {
          params = JSON.parse(saved);
        }
      } catch (e) {}
    }

    let linkLoginOnly = params['link-login-only'] || params['link-login'] || 'http://10.10.10.1/login';
    const dst = params['dst'] || '';
    
    showToast("جاري تفعيل اتصال الإنترنت عبر MikroTik... ⚡", "success");
    
    // Fallback if URL is totally unparseable
    if (!linkLoginOnly.startsWith('http')) {
      linkLoginOnly = 'http://10.10.10.1/login';
    }
    
    // Create a dynamic form to submit via POST to bypass PNA restrictions
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = linkLoginOnly.split('?')[0]; // Use base URL for action
    
    const dstInput = document.createElement('input');
    dstInput.type = 'hidden';
    dstInput.name = 'dst';
    dstInput.value = dst;
    form.appendChild(dstInput);
    
    const popupInput = document.createElement('input');
    popupInput.type = 'hidden';
    popupInput.name = 'popup';
    popupInput.value = 'true';
    form.appendChild(popupInput);
    
    const userInput = document.createElement('input');
    userInput.type = 'hidden';
    userInput.name = 'username';
    userInput.value = cardCode;
    form.appendChild(userInput);
    
    const passInput = document.createElement('input');
    passInput.type = 'hidden';
    passInput.name = 'password';
    passInput.value = cardPassword || '';
    form.appendChild(passInput);
    
    document.body.appendChild(form);
    
    setTimeout(() => {
      form.submit();
    }, 800);
  };`;

// replace triggerMikrotikRedirect logic
const oldMikrotikRegex = /const triggerMikrotikRedirect = \(cardCode: string, cardPassword\?: string\) => \{[\s\S]*?catch \(e\) \{[\s\S]*?\}[\s\S]*?setTimeout\(\(\) => \{[\s\S]*?\}, 1200\);\s*\}\s*\};/;
code = code.replace(oldMikrotikRegex, newTriggerMikrotik);
fs.writeFileSync('src/App.tsx', code);
