import re

with open("src/App.tsx", "r") as f:
    content = f.read()

modal_pattern = r'\{/\* Clear All Data Confirm Modal \*/\}.*?isClearAllConfirmOpen && \(.*?</AnimatePresence>'
# I will just remove it carefully.
# Wait, let's just find the start of the modal and delete it.
content = re.sub(r'\{/\* Clear All Data Confirm Modal \*/\}.*?isClearAllConfirmOpen && \(.*?</motion\.div>\s*</div>\s*\)\}\s*</AnimatePresence>', '', content, flags=re.DOTALL)

# Let's also remove `const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);`
content = re.sub(r'const \[isClearAllConfirmOpen, setIsClearAllConfirmOpen\] = useState\(false\);\n', '', content)

with open("src/App.tsx", "w") as f:
    f.write(content)

