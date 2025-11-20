# Deployment Guide

This project uses GitHub Actions for automated deployment to Firebase Hosting (frontend) and Google Cloud Run (backend).

## 🚀 Quick Start

1. **Set up secrets** in GitHub (see `.github/QUICK_START.md`)
2. **Push to `main` branch** - deployments happen automatically!
3. **Check Actions tab** to monitor deployments

## 📁 Deployment Files

- **`.github/workflows/`** - GitHub Actions workflows
- **`backend/Dockerfile`** - Backend container configuration
- **`backend/cloudbuild.yaml`** - Cloud Build configuration
- **`firebase.json`** - Firebase Hosting configuration

## 📚 Documentation

- **`.github/QUICK_START.md`** - 5-minute setup guide
- **`.github/DEPLOYMENT_SETUP.md`** - Detailed setup instructions
- **`backend/DEPLOYMENT.md`** - Backend-specific deployment guide

## 🔧 Manual Deployment

### Backend Only
```bash
cd backend
./deploy.sh  # Linux/Mac
# or
.\deploy.ps1  # Windows
```

### Frontend Only
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

## 🌐 URLs

After deployment:
- **Frontend**: https://fiattib.web.app
- **Backend API**: https://fiattib-backend-xxxxx.run.app/api

## ⚙️ Configuration

### Required Secrets (GitHub)
- `GCP_SA_KEY` - Google Cloud service account JSON
- `FIREBASE_SERVICE_ACCOUNT_FIATTIB` - Firebase service account JSON

### Required Environment Variables (Cloud Run)
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT secret key
- `ALGORITHM` - JWT algorithm (default: HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Token expiration (default: 30)

## 🐛 Troubleshooting

See `.github/DEPLOYMENT_SETUP.md` for detailed troubleshooting guide.

