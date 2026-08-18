import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Replace handleClearAllCards -> handleDeleteAllCards
content = content.replace("const handleClearAllCards = async () => {", "const handleDeleteAllCards = async () => {")
content = content.replace("onClick={handleAdminClearAllStock}", "onClick={handleDeleteAllCards}")
content = content.replace("onClick={handleClearAllCards}", "onClick={handleDeleteAllCards}")

# Remove the line `const handleAdminClearAllStock = handleClearAllCards;` if it exists
content = re.sub(r'const handleAdminClearAllStock = handleClearAllCards;\n?', '', content)
# Or if it was renamed to handleDeleteAllCards
content = re.sub(r'const handleAdminClearAllStock = handleDeleteAllCards;\n?', '', content)


# Replace handleAdminDeleteExpiredCards -> handleDeleteExpiredCards
content = content.replace("const handleAdminDeleteExpiredCards = async () => {", "const handleDeleteExpiredCards = async () => {")
content = content.replace("onClick={handleAdminDeleteExpiredCards}", "onClick={handleDeleteExpiredCards}")

with open("src/App.tsx", "w") as f:
    f.write(content)

