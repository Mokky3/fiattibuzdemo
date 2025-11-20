# Backend Deployment Guide

This guide explains how to deploy the FastAPI backend to Google Cloud Run (integrated with Firebase).

## Prerequisites

1. **Google Cloud Account**: You need a Google Cloud account with billing enabled
2. **gcloud CLI**: Install the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
3. **Docker**: Install [Docker](https://www.docker.com/get-started)
4. **Firebase CLI**: Install Firebase CLI (`npm install -g firebase-tools`)

## Initial Setup

### 1. Authenticate with Google Cloud

```bash
gcloud auth login
gcloud auth configure-docker
```

### 2. Set Your Project

```bash
gcloud config set project fiattib
# Or your project ID
```

### 3. Enable Required APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

## Deployment Methods

### Method 1: Using the Deployment Script (Recommended)

```bash
cd backend
chmod +x deploy.sh
./deploy.sh
```

### Method 2: Manual Deployment

#### Step 1: Build and Push Docker Image

```bash
cd backend

# Build the image
docker build -t gcr.io/fiattib/fiattib-backend:latest .

# Push to Container Registry
docker push gcr.io/fiattib/fiattib-backend:latest
```

#### Step 2: Deploy to Cloud Run

```bash
gcloud run deploy fiattib-backend \
    --image gcr.io/fiattib/fiattib-backend:latest \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --port 8080 \
    --memory 2Gi \
    --cpu 2 \
    --min-instances 0 \
    --max-instances 10 \
    --timeout 300 \
    --set-env-vars PORT=8080
```

### Method 3: Using Cloud Build (CI/CD)

This method uses the `cloudbuild.yaml` file for automated builds:

```bash
gcloud builds submit --config cloudbuild.yaml backend/
```

## Environment Variables

You need to set environment variables in Cloud Run for your backend to work:

```bash
gcloud run services update fiattib-backend \
    --region us-central1 \
    --update-env-vars \
    DATABASE_URL=postgresql+psycopg://user:password@host:5432/dbname,\
    SECRET_KEY=your-secret-key,\
    ALGORITHM=HS256,\
    ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Or set them via the Cloud Console:
1. Go to Cloud Run in Google Cloud Console
2. Select `fiattib-backend` service
3. Click "Edit & Deploy New Revision"
4. Go to "Variables & Secrets" tab
5. Add your environment variables

### Required Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT secret key
- `ALGORITHM`: JWT algorithm (usually HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration time

### Optional Environment Variables

- `REDIS_URL`: Redis connection string (if using Redis)
- `CELERY_BROKER_URL`: Celery broker URL (if using Celery)
- `FHIR_SERVER_URL`: FHIR server URL (if using FHIR)

## Database Setup

The backend requires a PostgreSQL database. You have two options:

### Option 1: Cloud SQL (Recommended for Production)

```bash
# Create Cloud SQL instance
gcloud sql instances create fiattib-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1

# Create database
gcloud sql databases create ehr_db --instance=fiattib-db

# Create user
gcloud sql users create ehr_user \
    --instance=fiattib-db \
    --password=your-secure-password
```

Then update the `DATABASE_URL` environment variable in Cloud Run.

### Option 2: External Database

If you're using an external PostgreSQL database, just set the `DATABASE_URL` environment variable.

## Firebase Hosting Integration

The `firebase.json` has been configured to proxy API requests to Cloud Run:

```json
{
  "source": "/api/**",
  "run": {
    "serviceId": "fiattib-backend",
    "region": "us-central1"
  }
}
```

This allows your frontend to make requests to `/api/*` which will be proxied to your Cloud Run service.

## CORS Configuration

After deployment, update the CORS settings in `backend/app/main.py` to include your production frontend domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-firebase-app.web.app",
        "https://your-firebase-app.firebaseapp.com",
        # ... other origins
    ],
    # ...
)
```

## Updating the Deployment

To update the backend after making changes:

```bash
cd backend
./deploy.sh
```

Or manually:

```bash
docker build -t gcr.io/fiattib/fiattib-backend:latest .
docker push gcr.io/fiattib/fiattib-backend:latest
gcloud run deploy fiattib-backend --image gcr.io/fiattib/fiattib-backend:latest --region us-central1
```

## Monitoring and Logs

View logs:

```bash
gcloud run services logs read fiattib-backend --region us-central1
```

Or in the Cloud Console:
1. Go to Cloud Run
2. Select your service
3. Click "Logs" tab

## Troubleshooting

### Service won't start

1. Check logs: `gcloud run services logs read fiattib-backend --region us-central1`
2. Verify environment variables are set correctly
3. Check database connectivity

### 502 Bad Gateway

- Check if the service is running: `gcloud run services describe fiattib-backend --region us-central1`
- Verify the port is set to 8080
- Check application logs for errors

### Database Connection Errors

- Verify `DATABASE_URL` is set correctly
- Check if Cloud SQL instance allows connections from Cloud Run
- For Cloud SQL, you may need to use Cloud SQL Proxy or configure authorized networks

## Cost Optimization

- **Min instances**: Set to 0 to avoid charges when idle (cold starts will occur)
- **Max instances**: Limit to control costs
- **Memory/CPU**: Adjust based on your needs (2Gi/2CPU is a good starting point)

## Security Considerations

1. **Secrets**: Use Google Secret Manager for sensitive data instead of environment variables
2. **Authentication**: Consider requiring authentication for Cloud Run (remove `--allow-unauthenticated`)
3. **HTTPS**: Cloud Run provides HTTPS by default
4. **Database**: Use Cloud SQL with private IP for better security

## Next Steps

1. Set up CI/CD with GitHub Actions or Cloud Build
2. Configure monitoring and alerting
3. Set up backup strategies for your database
4. Configure custom domain (if needed)
5. Set up staging environment

