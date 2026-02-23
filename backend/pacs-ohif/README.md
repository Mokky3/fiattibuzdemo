# OHIF Viewer Deployment to Cloud Run

This directory contains the configuration and deployment files for deploying OHIF Viewer to Google Cloud Run.

## Files

- `app-config.js` - OHIF configuration pointing to Orthanc PACS server
- `Dockerfile` - Multi-stage build that clones OHIF, builds it, and serves with nginx
- `deploy.ps1` - PowerShell script to build and deploy to Cloud Run
- `.dockerignore` - Files to exclude from Docker build

## Configuration

The `app-config.js` file is configured to point to:
- **QIDO Root**: `http://35.230.172.150:8042/dicom-web`
- **WADO Root**: `http://35.230.172.150:8042/dicom-web`
- **WADO URI Root**: `http://35.230.172.150:8042/wado`

**Note**: 
- The config file is copied to `config/app-config.js` during build (OHIF standard location)
- The build uses `APP_CONFIG=config/app-config.js` to load this configuration
- If Orthanc IP changes, update `app-config.js` and redeploy

## Deployment

### Prerequisites

1. Google Cloud SDK installed and authenticated
2. Project ID: `sage-loop-478514-r4`
3. Region: `us-east4`

### Quick Deploy

```powershell
cd backend/pacs-ohif
.\deploy.ps1
```

### Manual Deployment

#### Step 1: Build Docker Image

```powershell
gcloud builds submit --tag gcr.io/sage-loop-478514-r4/fiattib-ohif
```

#### Step 2: Deploy to Cloud Run

```powershell
gcloud run deploy fiattib-ohif `
  --image gcr.io/sage-loop-478514-r4/fiattib-ohif `
  --platform managed `
  --region us-east4 `
  --memory 1Gi `
  --cpu 1 `
  --max-instances 1 `
  --allow-unauthenticated `
  --port 8080
```

## How It Works

1. **Build Stage**: 
   - Clones OHIF Viewers from GitHub
   - Installs dependencies with `yarn install`
   - Copies `app-config.js` to the public directory
   - Builds OHIF with `yarn run build`

2. **Runtime Stage**:
   - Uses nginx:alpine to serve static files
   - Configures nginx to listen on port 8080 (Cloud Run requirement)
   - Serves the built OHIF application

## Updating Configuration

To update the Orthanc URLs:

1. Edit `app-config.js`
2. Rebuild and redeploy:
   ```powershell
   .\deploy.ps1
   ```

## Verifying Deployment

After deployment, check the service URL:

```powershell
gcloud run services describe fiattib-ohif --region us-east4 --format 'value(status.url)'
```

Visit the URL in your browser to verify OHIF is running.

## Troubleshooting

- **Build fails**: Check that you have internet access (needs to clone OHIF repo)
- **Deployment fails**: Verify you have Cloud Run permissions
- **OHIF can't connect to Orthanc**: Verify Orthanc URLs in `app-config.js` are correct

