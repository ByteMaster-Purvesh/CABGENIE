# CABGENIE

AI-based cab booking and recommendation system.

## Structure

- `frontend`: React app deployed to GitHub Pages
- `backend`: Express + MongoDB API

## Frontend Hosting

GitHub Pages URL:

`https://bytemaster-purvesh.github.io/CABGENIE/`

Set the frontend environment variable before deploying:

- `REACT_APP_API_URL=https://your-backend-service.onrender.com/api/v1`

Then redeploy from `frontend`:

```powershell
npm run deploy
```

## Backend Hosting

This repo includes `render.yaml` for Render deployment.

Backend environment variables:

- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRE`
- `PORT`
- `FRONTEND_URL`
- `FRONTEND_URLS`

You can copy starter values from [backend/.env.example](c:/Users/PURVESH/Desktop/Trae/CABGENIE%20v.1/backend/.env.example).

## Local Development

Backend:

```powershell
cd backend
npm install
npm run dev
```

Frontend:

```powershell
cd frontend
npm install
npm start
```
