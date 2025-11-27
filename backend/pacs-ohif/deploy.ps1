# PowerShell script to deploy OHIF Viewer to Cloud Run
# Usage: .\deploy.ps1

$PROJECT_ID = "sage-loop-478514-r4"
$IMAGE_TAG = "gcr.io/$PROJECT_ID/fiattib-ohif"
$REGION = "us-east4"
$SERVICE_NAME = "fiattib-ohif"

Write-Host "🚀 Building OHIF Viewer Docker image..." -ForegroundColor Green
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
  --allow-unauthenticated `
  --port 8080

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Deployment successful!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 OHIF Viewer deployed with:" -ForegroundColor Cyan
Write-Host "  ✓ Production app-config.js pointing to Orthanc" -ForegroundColor White
Write-Host "  ✓ Configured for Cloud Run (port 8080)" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Get service URL:" -ForegroundColor Cyan
Write-Host "  gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)'" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Remember to update app-config.js with actual Orthanc URL when Orthanc is deployed!" -ForegroundColor Yellow

