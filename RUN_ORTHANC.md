# How to Run Orthanc PACS Server

Orthanc is configured to run via Docker Compose. Here are the options:

## Option 1: Run Locally with Docker Compose (Recommended for Development)

1. **Navigate to the PACS directory:**
   ```powershell
   cd backend/app/common/pacs
   ```

2. **Start Orthanc (and related services):**
   ```powershell
   docker-compose up -d
   ```

   This will start:
   - **Orthanc** on `http://localhost:8042`
   - **Nginx CORS proxy** on `http://localhost:8043`
   - **OHIF Viewer** on `http://localhost:3000`

3. **Check if Orthanc is running:**
   - Open browser: `http://localhost:8042`
   - You should see the Orthanc web interface

4. **Stop Orthanc:**
   ```powershell
   docker-compose down
   ```

## Option 2: Run Only Orthanc (Without OHIF/Nginx)

If you only need Orthanc:

```powershell
cd backend/app/common/pacs
docker-compose up -d orthanc
```

## Option 3: Run Orthanc in Production (Cloud)

For production, you'll need to:

1. **Deploy Orthanc to a cloud service** (e.g., Google Cloud Run, AWS ECS, or a VM)
2. **Set environment variables** in your backend:
   - `ORTHANC_URL` - Your production Orthanc URL (e.g., `https://orthanc.yourdomain.com`)
   - `ORTHANC_USERNAME` - Orthanc username (if authentication enabled)
   - `ORTHANC_PASSWORD` - Orthanc password (if authentication enabled)

### Deploy Orthanc to Google Cloud Run

You can deploy Orthanc as a Cloud Run service:

```powershell
# Build and push Orthanc image
docker build -t gcr.io/sage-loop-478514-r4/orthanc:latest -f Dockerfile.orthanc .

# Deploy to Cloud Run
gcloud run deploy orthanc `
  --image gcr.io/sage-loop-478514-r4/orthanc:latest `
  --platform managed `
  --region us-east4 `
  --port 8042 `
  --memory 2Gi `
  --cpu 2 `
  --allow-unauthenticated
```

## Current Configuration

- **Local URL**: `http://localhost:8042`
- **Default credentials**: None (authentication disabled)
- **DICOMweb**: Enabled on `/dicom-web/`
- **Storage**: Docker volume `orthanc-db`

## Verify Orthanc is Running

1. **Check Orthanc web interface:**
   - Visit: `http://localhost:8042`
   - You should see the Orthanc dashboard

2. **Check API:**
   ```powershell
   curl http://localhost:8042/system
   ```

3. **Check from backend:**
   - The backend uses `ORTHANC_URL` environment variable
   - Default: `http://localhost:8042`
   - Update `.env` file if needed

## Troubleshooting

- **Port already in use**: Change ports in `docker-compose.yml`
- **Permission errors**: Make sure Docker has proper permissions
- **Can't connect**: Check firewall settings and Docker network

## For Production Database Migration

Before running Orthanc in production, you also need to fix the database schema:

```powershell
cd backend
python scripts/add_orthanc_fields_to_radiology_studies.py
```

This adds the missing `orthanc_study_id` and `study_instance_uid` columns to the `radiology_studies` table.

