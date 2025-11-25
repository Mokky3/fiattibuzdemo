# Deploying Backend with OHIF, Medications, and ICD Data

This guide explains how to deploy the backend to Cloud Run with OHIF viewer configuration, medications, and ICD data included.

## Prerequisites

1. **Google Cloud SDK** installed and authenticated
2. **Project ID**: `sage-loop-478514-r4`
3. **Region**: `us-east4`

## Deployment Commands

### Step 1: Build and Tag Docker Image

```powershell
gcloud builds submit --tag gcr.io/sage-loop-478514-r4/fiattib-backend
```

Or if you're in the backend directory:

```powershell
cd backend
gcloud builds submit --tag gcr.io/sage-loop-478514-r4/fiattib-backend
```

### Step 2: Deploy to Cloud Run

```powershell
gcloud run deploy fiattib-backend `
  --image gcr.io/sage-loop-478514-r4/fiattib-backend `
  --platform managed `
  --region us-east4 `
  --memory 1Gi `
  --cpu 1 `
  --max-instances 1 `
  --allow-unauthenticated
```

## What's Included

The updated `.dockerignore` now includes:

1. **OHIF Configuration**
   - `app/common/pacs/ohif/app-config.js` - OHIF viewer configuration
   - `app/common/pacs/ohif/viewer.js` - OHIF viewer script
   - `app/common/pacs/config/orthanc.json` - Orthanc PACS configuration

2. **Medications Data**
   - Medication import scripts in `scripts/` directory
   - Medication seed data files

3. **ICD Data**
   - ICD-11 import scripts (`import_icd11.py`, `verify_icd11_import.py`)
   - ICD structure check scripts

## Excluded Files

The following are still excluded to keep the image size manageable:

- OHIF Viewers platform (large frontend codebase)
- MONAI Label extensions
- Nginx configuration (not needed in Cloud Run)
- Docker compose files
- Most node_modules and frontend build artifacts

## Verifying Deployment

After deployment, verify that:

1. OHIF configuration is accessible at runtime
2. Medication and ICD data can be imported/accessed
3. Orthanc configuration is properly loaded

## Troubleshooting

If OHIF or data files are missing:

1. Check `.dockerignore` exclusions
2. Verify files exist in the repository
3. Check build logs for excluded files
4. Temporarily remove exclusions to test

## Notes

- The OHIF viewer frontend code is excluded to reduce image size
- Only configuration files needed at runtime are included
- Medication and ICD data should be in the database, not in the image
- Import scripts are included for reference but may not be needed in production

