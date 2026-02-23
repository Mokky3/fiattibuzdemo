# OHIF and Orthanc Files in Docker Deployment

This document confirms which OHIF and Orthanc files are included in the Docker build.

## Included Files

### OHIF Configuration
- ✅ `app/common/pacs/ohif/app-config.js` - OHIF viewer configuration
- ✅ `app/common/pacs/ohif/viewer.js` - OHIF viewer script
- ✅ `app/common/pacs/ohif/extensions/` - OHIF extensions (including monai-extension)
- ✅ `app/common/pacs/ohif/package.json` - OHIF package configuration
- ✅ All JSON files in `app/common/pacs/ohif/`

### Orthanc Configuration
- ✅ `app/common/pacs/config/orthanc.json` - Orthanc PACS server configuration
- ✅ All JSON files in `app/common/pacs/config/`

### DICOM Files
- ✅ `app/common/pacs/dicom/` - Sample DICOM files

## Excluded Files

### Large Directories (Not Needed in Container)
- ❌ `app/common/pacs/Viewers/` - OHIF source code (very large, not needed)
- ❌ `app/common/pacs/monai/` - MONAI Label apps (not needed in backend)
- ❌ `app/common/pacs/nginx/` - Nginx config (not needed in Cloud Run)
- ❌ `app/common/pacs/docker-compose.yml` - Docker Compose file (not needed)
- ❌ `app/common/pacs/ohif/node_modules/` - Node modules (not needed in Python container)

## Verification

To verify files are included in the Docker build:

```powershell
# Build the image
docker build -t test-build -f backend/Dockerfile backend/

# Check if OHIF files are present
docker run --rm test-build ls -la /app/app/common/pacs/ohif/

# Check if Orthanc config is present
docker run --rm test-build cat /app/app/common/pacs/config/orthanc.json
```

## .dockerignore Rules

The `.dockerignore` file uses the following logic:

1. **Exclude large directories first:**
   - `app/common/pacs/Viewers/`
   - `app/common/pacs/monai/`
   - `app/common/pacs/nginx/`

2. **Exclude OHIF node_modules:**
   - `app/common/pacs/ohif/node_modules/`

3. **Include OHIF directory (overrides general exclusions):**
   - `!app/common/pacs/ohif/`

4. **Include Orthanc config:**
   - `!app/common/pacs/config/`

5. **Include DICOM files:**
   - `!app/common/pacs/dicom/`

6. **Override JS/JSON exclusions for OHIF:**
   - `!app/common/pacs/ohif/**/*.js`
   - `!app/common/pacs/ohif/**/*.json`
   - `!app/common/pacs/config/**/*.json`

## Notes

- The `!` prefix in `.dockerignore` means "include this" (negation of exclusion)
- More specific patterns override general patterns
- Order matters: exclusions are processed first, then inclusions

