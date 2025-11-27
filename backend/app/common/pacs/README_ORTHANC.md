# Running Orthanc PACS Server

## Quick Start

```powershell
# Navigate to this directory
cd backend/app/common/pacs

# Start Orthanc
docker-compose up -d orthanc

# Check status
docker-compose ps

# View logs
docker-compose logs -f orthanc

# Stop
docker-compose down
```

## Access Orthanc

- **Web Interface**: http://localhost:8042
- **REST API**: http://localhost:8042/
- **DICOM Port**: 4242
- **DICOMweb**: http://localhost:8042/dicom-web/

## Configuration

- Config file: `config/orthanc.json`
- Storage: Docker volume `orthanc-db`
- DICOMweb: Enabled

## Environment Variables

Set these in your backend `.env` file:

```env
ORTHANC_URL=http://localhost:8042
ORTHANC_USERNAME=orthanc
ORTHANC_PASSWORD=orthanc
```

For production, update `ORTHANC_URL` to your production Orthanc server URL.

