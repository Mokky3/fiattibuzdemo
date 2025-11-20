# GitHub Actions Deployment Setup Guide

This guide will help you set up automated deployments to Firebase and Google Cloud Run using GitHub Actions.

## Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository
2. **Google Cloud Project**: You need a GCP project (fiattib)
3. **Firebase Project**: Connected to the same GCP project

## Required GitHub Secrets

You need to set up the following secrets in your GitHub repository:

### 1. Google Cloud Service Account Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin** > **Service Accounts**
3. Create a new service account or use an existing one
4. Grant the following roles:
   - **Cloud Run Admin** (to deploy services)
   - **Service Account User** (to use service accounts)
   - **Storage Admin** (to push Docker images)
   - **Cloud Build Service Account** (if using Cloud Build)
5. Create a JSON key:
   - Click on the service account
   - Go to **Keys** tab
   - Click **Add Key** > **Create new key** > **JSON**
   - Download the JSON file
6. Add to GitHub Secrets:
   - Go to your GitHub repository
   - Settings > Secrets and variables > Actions
   - Click **New repository secret**
   - Name: `GCP_SA_KEY`
   - Value: Paste the entire contents of the JSON file

### 2. Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (fiattib)
3. Go to **Project Settings** > **Service Accounts**
4. Click **Generate new private key**
5. Download the JSON file
6. Add to GitHub Secrets:
   - Name: `FIREBASE_SERVICE_ACCOUNT_FIATTIB`
   - Value: Paste the entire contents of the JSON file

## Workflow Files

The repository includes the following GitHub Actions workflows:

### 1. `deploy-backend.yml`
- **Triggers**: When backend files change on `main` or `develop` branches
- **Actions**: Builds Docker image and deploys to Cloud Run
- **Manual**: Can be triggered manually via `workflow_dispatch`

### 2. `deploy-full-stack.yml`
- **Triggers**: When frontend or backend files change on `main` branch
- **Actions**: Deploys both frontend and backend
- **Manual**: Can be triggered manually

### 3. `firebase-hosting-merge.yml`
- **Triggers**: When frontend files change on `main` branch
- **Actions**: Builds and deploys frontend to Firebase Hosting

### 4. `firebase-hosting-pull-request.yml`
- **Triggers**: On pull requests
- **Actions**: Creates preview deployments for frontend

### 5. `test-backend.yml`
- **Triggers**: On pull requests and pushes to `main`/`develop`
- **Actions**: Runs backend tests

### 6. `test-frontend.yml`
- **Triggers**: On pull requests and pushes to `main`/`develop`
- **Actions**: Lints and builds frontend

## Initial Setup Steps

### Step 1: Enable Required Google Cloud APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### Step 2: Set Up Service Account Permissions

The service account needs these permissions:
- `roles/run.admin` - Deploy Cloud Run services
- `roles/iam.serviceAccountUser` - Use service accounts
- `roles/storage.admin` - Push Docker images
- `roles/artifactregistry.writer` - Push to Artifact Registry (if using)

### Step 3: Configure Environment Variables in Cloud Run

After the first deployment, set environment variables in Cloud Run:

```bash
gcloud run services update fiattib-backend \
  --region us-central1 \
  --update-env-vars \
  DATABASE_URL=your-database-url,\
  SECRET_KEY=your-secret-key,\
  ALGORITHM=HS256,\
  ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Or use Google Secret Manager (recommended for production):

```bash
# Create secrets
echo -n "your-database-url" | gcloud secrets create DATABASE_URL --data-file=-
echo -n "your-secret-key" | gcloud secrets create SECRET_KEY --data-file=-

# Grant access to Cloud Run service account
gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Then update the Cloud Run service to use secrets:
```bash
gcloud run services update fiattib-backend \
  --region us-central1 \
  --update-secrets DATABASE_URL=DATABASE_URL:latest,SECRET_KEY=SECRET_KEY:latest
```

### Step 4: Update CORS Settings

Update `backend/app/main.py` to include your production frontend domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://fiattib.web.app",
        "https://fiattib.firebaseapp.com",
        # Add your custom domain if you have one
    ],
    # ...
)
```

## Testing the Setup

### Test Backend Deployment

1. Make a small change to a backend file
2. Commit and push to `main` branch
3. Go to **Actions** tab in GitHub
4. Watch the `Deploy Backend to Cloud Run` workflow
5. Check Cloud Run console to verify deployment

### Test Frontend Deployment

1. Make a small change to a frontend file
2. Commit and push to `main` branch
3. Go to **Actions** tab in GitHub
4. Watch the `Deploy Frontend to Firebase Hosting` workflow
5. Check Firebase Hosting console to verify deployment

## Manual Deployment

You can manually trigger deployments:

1. Go to **Actions** tab in GitHub
2. Select the workflow you want to run
3. Click **Run workflow**
4. Select branch and click **Run workflow**

## Troubleshooting

### Backend Deployment Fails

1. **Check service account permissions**: Ensure the service account has all required roles
2. **Check GCP quotas**: Ensure you haven't exceeded Cloud Run quotas
3. **Check logs**: View workflow logs in GitHub Actions
4. **Verify secrets**: Ensure `GCP_SA_KEY` is set correctly

### Frontend Deployment Fails

1. **Check Firebase service account**: Ensure `FIREBASE_SERVICE_ACCOUNT_FIATTIB` is set
2. **Check build errors**: Look for npm/build errors in workflow logs
3. **Verify firebase.json**: Ensure configuration is correct

### Docker Build Fails

1. **Check Dockerfile**: Ensure it's valid
2. **Check dependencies**: Ensure `requirements.txt` is up to date
3. **Check .gcloudignore**: Ensure it's not excluding necessary files

### Cloud Run Service Won't Start

1. **Check environment variables**: Ensure all required variables are set
2. **Check database connectivity**: Ensure DATABASE_URL is correct
3. **Check logs**: `gcloud run services logs read fiattib-backend --region us-central1`

## Best Practices

1. **Use branches**: Deploy from `main` branch, use `develop` for testing
2. **Review PRs**: Use pull requests to review changes before deployment
3. **Monitor deployments**: Check Cloud Run and Firebase Hosting after deployments
4. **Use secrets**: Store sensitive data in Google Secret Manager, not environment variables
5. **Test locally**: Always test changes locally before pushing
6. **Monitor costs**: Keep an eye on Cloud Run usage and costs

## Cost Optimization

- **Min instances**: Set to 0 to avoid charges when idle
- **Max instances**: Limit to control costs
- **Memory/CPU**: Adjust based on actual needs
- **Timeout**: Set appropriate timeout values

## Security Considerations

1. **Never commit secrets**: Always use GitHub Secrets or Google Secret Manager
2. **Rotate keys**: Regularly rotate service account keys
3. **Limit permissions**: Grant only necessary permissions to service accounts
4. **Use private repositories**: For sensitive projects
5. **Enable audit logs**: Monitor access and changes

## Next Steps

1. Set up monitoring and alerting
2. Configure custom domains
3. Set up staging environment
4. Implement blue-green deployments
5. Set up database backups
6. Configure CDN for static assets

