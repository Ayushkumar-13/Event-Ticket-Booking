# 🚀 Live Deployment Guide (Vercel Backend Version)

Since you are using **Vercel** for both your Frontend and Backend, you must handle them as two separate projects. Follow this checklist to link them:

### **1. Backend Project (Vercel Dashboard)**
This is the project connected to the `/backend` folder.
- **Go to Settings**: Environment Variables.
- **Add these keys**:
  - `MONGO_URI`: `mongodb+srv://...`
  - `JWT_SECRET`: `d4605f33...`
  - `SMTP_USER`: `eventtix141@gmail.com`
  - `SMTP_PASS`: `ywmdigccjvxabmzu`
  - `GEMINI_API_KEY`: `AIzaSyAsjdp4UbOJ0BPDXX8zIiS-auM75_OxxTM`
- **Redeploy**: Ensure the new `vercel.json` I created is pushed to GitHub. This tells Vercel to treat the app as an API.

### **2. Frontend Project (Vercel Dashboard)**
This is the project connected to the `/frontend` folder.
- **Go to Settings**: Environment Variables.
- **Add this key**:
  - `VITE_API_URL`: **[The URL of your Backend Vercel project]**
  - *Example:* `https://event-ticket-backend.vercel.app`

---

### **Why this is needed:**
- **Vercel Backend**: Without the `vercel.json` I added, Vercel just sees "files" and doesn't know how to run the AI logic.
- **Connection**: Since you have two separate Vercel projects, the Frontend needs to know the "address" of the Backend project to send chat messages.

**Once you push the code and add these variables to both Vercel dashboards, your AI Assistant will be fully operational on your mobile link!** 🚀
