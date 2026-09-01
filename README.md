# 🚀 Production Deployment Guide

This project is designed to run with:

- Frontend: React + Vite (InfinityFree)
- Backend: Node.js (Render Web Service)
- Database: Firebase Firestore
- Authentication: Firebase Auth + Google OAuth
- Media Storage: Google Drive API

---

# Step 1 - Export Project

Export the complete source code.

---

# Step 2 - Create Production .env

Copy:

.env.example

to

.env

Fill all required values.

Example:

```env
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://YOUR_RENDER_APP.onrender.com/api/drive/callback

GEMINI_API_KEY=YOUR_GEMINI_API_KEY
TITLE_API_KEY=YOUR_TITLE_API_KEY

ENCRYPTION_KEY=YOUR_RANDOM_SECRET_KEY

FIREBASE_SERVICE_ACCOUNT_BASE64=YOUR_BASE64_SERVICE_ACCOUNT

VITE_BACKEND_URL=https://YOUR_RENDER_APP.onrender.com
```

Do NOT leave any placeholder values.

---

# Step 3 - Push to GitHub

Commit the complete project.

Push to your GitHub repository.

---

# Step 4 - Deploy Backend (Render)

Create a new Web Service.

Connect GitHub repository.

Configure:

Build Command

```bash
npm install
```

Start Command

```bash
npm start
```

(or whatever the project uses.)

Add every environment variable from your .env into Render Environment Variables.

Deploy.

---

# Step 5 - Copy Backend URL

After successful deployment Render will provide:

https://YOUR_APP_NAME.onrender.com

Copy this URL.

---

# Step 6 - Update Frontend

Update:

```env
VITE_BACKEND_URL=https://YOUR_APP_NAME.onrender.com
```

---

# Step 7 - Build Frontend

Run:

```bash
npm install
npm run build
```

A dist folder will be generated.

---

# Step 8 - InfinityFree Upload

Upload EVERYTHING inside dist/

NOT the dist folder itself.

Upload directly into:

htdocs/

---

# Step 9 - Upload .htaccess

Place the production-ready .htaccess file inside htdocs.

This is required so React Router works correctly after browser refresh.

Without it:

/tools
/profile
/chat

will show 404 Page Not Found.

---

# Step 10 - Google OAuth

Google Cloud Console

Authorized JavaScript Origin

https://YOUR_DOMAIN

Example

https://suhebdev.rf.gd

Authorized Redirect URI

https://YOUR_RENDER_APP.onrender.com/api/drive/callback

---

# Step 11 - Final Testing

Verify:

✔ Login

✔ Google Drive Connection

✔ Media Upload

✔ Chat Import

✔ Media Viewer

✔ Chat Delete

✔ Firebase Save

✔ Drive Save

✔ Refresh on every route

✔ Mobile

✔ Tablet

✔ Desktop

---

# Notes

Never upload .env to GitHub.

Keep .env.example as a template only.

All secrets must remain inside:

• Render Environment Variables
• Local .env

If backend URL changes, update:

VITE_BACKEND_URL

and rebuild using:

npm run build
