# Quick Start: GitHub Deployment

## One-Time Setup (5 minutes)

### 1. Add GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

#### Secret 1: `GCP_SA_KEY`
1. Go to [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Create or select a service account
3. Grant roles: **Cloud Run Admin**, **Service Account User**, **Storage Admin**
4. Create JSON key and download
5. Copy entire JSON content → Paste as `GCP_SA_KEY` secret

#### Secret 2: `FIREBASE_SERVICE_ACCOUNT_FIATTIB`
1. Go to [Firebase Console](https://console.firebase.google.com/project/fiattib/settings/serviceaccounts/adminsdk)
2. Click **Generate new private key**
3. Download JSON file
4. Copy entire JSON content → Paste as `FIREBASE_SERVICE_ACCOUNT_FIATTIB` secret

### 2. Enable Google Cloud APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 3. Set Environment Variables in Cloud Run

After first deployment, set these in Cloud Run console or via CLI:

```bash
gcloud run services update fiattib-backend \
  --region us-central1 \
  --update-env-vars \
  DATABASE_URL=your-db-url,\
  SECRET_KEY=your-secret-key
```

## How It Works

### Automatic Deployments

- **Backend changes** → Auto-deploys to Cloud Run
- **Frontend changes** → Auto-deploys to Firebase Hosting
- **Both change** → Deploys both

### Manual Deployments

1. Go to **Actions** tab
2. Select workflow (e.g., "Deploy Full Stack")
3. Click **Run workflow**

## Workflows

| Workflow | When It Runs | What It Does |
|----------|--------------|--------------|
| `deploy-backend.yml` | Backend files change | Deploys backend to Cloud Run |
| `deploy-full-stack.yml` | Any files change | Deploys both frontend & backend |
| `firebase-hosting-merge.yml` | Frontend files change | Deploys frontend to Firebase |
| `test-backend.yml` | PR or push | Runs backend tests |
| `test-frontend.yml` | PR or push | Lints & builds frontend |

## Troubleshooting

**Deployment fails?**
- Check **Actions** tab for error logs
- Verify secrets are set correctly
- Check service account has required permissions

**Backend won't start?**
- Check environment variables in Cloud Run
- Verify database connection
- Check Cloud Run logs

**Need help?**
- See `.github/DEPLOYMENT_SETUP.md` for detailed guide
- Check workflow logs in GitHub Actions

