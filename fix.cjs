const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Revert the double await inside useEffect
code = code.replace(
  "      if (username) {\n        await await fetchUserCardsFromDatabase(username);\n      }",
  "      if (username) {\n        fetchUserCardsFromDatabase(username);\n      }"
);

// Revert other wrong awaits just in case there are others that are broken
// Let's just fix the double awaits and await in non-async functions
code = code.replace(/await await /g, "await ");
code = code.replace(
  "  // Sync edit profile name when entering dashboard\n  useEffect(() => {\n    if (view === \"dashboard\") {\n      if (!editFirstName) setEditFirstName(firstName || \"علي\");\n      if (!editFatherName) setEditFatherName(fatherName || \"\");\n      if (!editLastName) setEditLastName(lastName || \"أحمد\");\n      if (!editPhone) setEditPhone(phone || \"0567101900\");\n\n      if (username) {\n        await fetchUserCardsFromDatabase(username);\n      }",
  "  // Sync edit profile name when entering dashboard\n  useEffect(() => {\n    if (view === \"dashboard\") {\n      if (!editFirstName) setEditFirstName(firstName || \"علي\");\n      if (!editFatherName) setEditFatherName(fatherName || \"\");\n      if (!editLastName) setEditLastName(lastName || \"أحمد\");\n      if (!editPhone) setEditPhone(phone || \"0567101900\");\n\n      if (username) {\n        fetchUserCardsFromDatabase(username);\n      }"
);

code = code.replace(
  "  useEffect(() => {\n    if (isAuthenticated && username && dashboardTab === 'cards') {\n      await fetchUserCardsFromDatabase(username);\n    }\n  }, [dashboardTab, isAuthenticated, username]);",
  "  useEffect(() => {\n    if (isAuthenticated && username && dashboardTab === 'cards') {\n      fetchUserCardsFromDatabase(username);\n    }\n  }, [dashboardTab, isAuthenticated, username]);"
);

fs.writeFileSync('src/App.tsx', code);
