import re
with open("src/App.tsx", "r") as f:
    content = f.read()
# Let's see if "تحديث التزامن" is still there
print(content.count("تحديث التزامن"))
