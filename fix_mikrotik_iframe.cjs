const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldMikrotikFormSubmit = `    document.body.appendChild(form);
    
    setTimeout(() => {
      form.submit();
    }, 800);
  };`;

const newMikrotikFormSubmit = `    // Create hidden iframe target
    let iframe = document.getElementById('mikrotik_hidden_frame');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'mikrotik_hidden_frame';
      iframe.name = 'mikrotik_hidden_frame';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }
    
    form.target = 'mikrotik_hidden_frame';
    document.body.appendChild(form);
    
    setTimeout(() => {
      form.submit();
      // clean up form after submission
      setTimeout(() => {
         if (form.parentNode) form.parentNode.removeChild(form);
      }, 500);
    }, 800);
  };`;

code = code.replace(oldMikrotikFormSubmit, newMikrotikFormSubmit);
fs.writeFileSync('src/App.tsx', code);
