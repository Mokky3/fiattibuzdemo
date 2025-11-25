# PowerShell script to deploy backend with OHIF, Medications, and ICD data
# Usage: .\deploy_with_data.ps1

$PROJECT_ID = "sage-loop-478514-r4"
$IMAGE_TAG = "gcr.io/$PROJECT_ID/fiattib-backend"
$REGION = "us-east4"
$SERVICE_NAME = "fiattib-backend"

Write-Host "🚀 Building Docker image with OHIF, Medications, and ICD data..." -ForegroundColor Green
Write-Host "Project: $PROJECT_ID" -ForegroundColor Cyan
Write-Host "Image: $IMAGE_TAG" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build and submit to Container Registry
Write-Host "📦 Step 1: Building and pushing Docker image..." -ForegroundColor Yellow
gcloud builds submit --tag $IMAGE_TAG

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green
Write-Host ""

# Step 2: Deploy to Cloud Run
Write-Host "🚀 Step 2: Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $SERVICE_NAME `
  --image $IMAGE_TAG `
  --platform managed `
  --region $REGION `
  --memory 1Gi `
  --cpu 1 `
  --max-instances 1 `
  --allow-unauthenticated

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Deployment successful!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Included in this deployment:" -ForegroundColor Cyan
Write-Host "  ✓ OHIF viewer configuration (app-config.js)" -ForegroundColor White
Write-Host "  ✓ Orthanc PACS configuration" -ForegroundColor White
Write-Host "  ✓ Medication import scripts" -ForegroundColor White
Write-Host "  ✓ ICD-11 import scripts" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Get service URL:" -ForegroundColor Cyan
Write-Host "  gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)'" -ForegroundColor Gray

