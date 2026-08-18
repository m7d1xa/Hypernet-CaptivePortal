import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# Remove `{/* Clear All Stock Confirmation Modal */}` completely.
content = re.sub(r'\{/\* Clear All Stock Confirmation Modal \*/\}.*?isClearAllConfirmOpen && \(.*?</motion\.div>\s*</div>\s*\)\}\s*</AnimatePresence>', '', content, flags=re.DOTALL)

with open("src/App.tsx", "w") as f:
    f.write(content)

