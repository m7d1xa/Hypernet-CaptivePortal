const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldQuickConnect = /const handleQuickConnect = \(cardUsername: string, cardPassword: string\) => \{[\s\S]*?triggerMikrotikRedirect\(userVal, passVal\);\s*\};/m;

const newQuickConnect = `const handleQuickConnect = async (cardUsername: string, cardPassword: string, cardId?: string) => {
    const userVal = cardUsername ? cardUsername.trim() : '';
    const passVal = cardPassword ? cardPassword.trim() : '';

    if (!userVal) {
      showToast('اسم المستخدم / رقم الكرت غير صالح للاتصال السريع.', 'error');
      return;
    }

    const existingPurchased = cards.find(c => c.id === cardId || c.cardUsername === userVal || c.username === userVal || c.code === userVal);
    const targetCardId = cardId || existingPurchased?.id;

    if (targetCardId) {
      try {
        setIsLoading(true);
        const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "";
        const res = await fetch(\`\${API_BASE_URL}/api/cards/\${targetCardId}/activate\`, {
          method: 'POST',
          headers: {
            "Authorization": \`Bearer \${token}\`
          }
        });
        const data = await res.json().catch(() => null);
        
        if (!res.ok && data?.error && !data?.error?.includes('مفعلة مسبقاً')) {
          showToast(data.error, 'error');
          setIsLoading(false);
          return;
        }
        
        // Auto-refresh cards to sync activationTime & status from server
        if (username) {
           await fetchUserCardsFromDatabase(username);
        }
      } catch (err) {
         console.error("Activation failed:", err);
      } finally {
        setIsLoading(false);
      }
    }

    const activeCardData = {
      id: existingPurchased?.id || ('active_' + userVal),
      cardUsername: userVal,
      username: userVal,
      cardPassword: passVal,
      password: passVal,
      name: existingPurchased?.name || existingPurchased?.packageName || 'باقة 24 ساعة',
      packageName: existingPurchased?.packageName || existingPurchased?.name || 'باقة 24 ساعة',
      status: 'active',
      duration: existingPurchased?.duration || existingPurchased?.name || '24 ساعة',
      dataLimit: existingPurchased?.dataLimit || 'غير محدود',
      price: existingPurchased?.price || '3 ₪',
      purchaseDate: existingPurchased?.purchaseDate || new Date().toLocaleDateString('ar-EG'),
      activationTime: existingPurchased?.activationTime || new Date().toISOString(),
      downloadUsed: '0 MB',
      uploadUsed: '0 MB',
      deviceIp: deviceIp || '192.168.1.105',
      deviceMac: deviceMac || '7C:D1:C3:AA:BB:CC',
      deviceType: deviceType || 'هاتف ذكي (Android/iOS)'
    };

    localStorage.setItem('hnet_active_card', JSON.stringify(activeCardData));
    setLastActiveCard(activeCardData);
    sessionStorage.setItem('auth_token', 'valid_session');
    setUsername(userVal);
    setPassword(passVal);
    setIsAuthenticated(true);
    setError(null);
    setEntrySource('dashboard');
    setView('status');
    showToast(\`جاري الاتصال السريع بالكرت (\${userVal})... ⚡\`, 'success');
      
    // Redirect to router login or trigger custom MikroTik redirect
    triggerMikrotikRedirect(userVal, passVal);
  };`;

code = code.replace(oldQuickConnect, newQuickConnect);
fs.writeFileSync('src/App.tsx', code);
