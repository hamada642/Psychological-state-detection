Emotion Mirror - Quick readme
Files included:
- index.html
- style.css
- script.js
- netlify/functions/checkPassword.js

Instructions:
1) Create a GitHub repo and push the 'emotion-mirror' folder contents (do NOT upload zip to GitHub as a zip).
2) In Netlify choose: New site -> Import from Git -> pick repo.
3) In Netlify set Environment Variable ADMIN_PASSWORD = (your password) in Site settings -> Build & deploy -> Environment.
4) Deploy the site. Use the link Netlify provides.
5) Tester: open site, enter password, then use 'Third-party' mode or 'Self-check' mode. Press 'Capture' or 'Record 5s'.

Notes:
- For password check to work, you must deploy via Netlify functions (Import from Git). Drag & drop static upload won't run the function.
- face-api models are loaded from CDN.
- This is an experimental, heuristic tool — not medical. Use responsibly.
