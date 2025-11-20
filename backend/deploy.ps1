# Firebase/Cloud Run Deployment Script for FastAPI Backend (PowerShell)
# This script deploys the backend to Google Cloud Run

$ErrorActionPreference = "Stop"

Write-Host "Starting deployment to Google Cloud Run..." -ForegroundColor Green

# Check if gcloud is installed
try {
    $null = Get-Command gcloud -ErrorAction Stop
} catch {
    Write-Host "Error: gcloud CLI is not installed." -ForegroundColor Red
    Write-Host "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
}

# Check if user is authenticated
$activeAccounts = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
if (-not $activeAccounts) {
    Write-Host "Not authenticated with gcloud. Please run: gcloud auth login" -ForegroundColor Yellow
    exit 1
}

# Get project ID
$PROJECT_ID = gcloud config get-value project 2>$null
if (-not $PROJECT_ID) {
    Write-Host "Error: No Google Cloud project set." -ForegroundColor Red
    Write-Host "Please set it with: gcloud config set project YOUR_PROJECT_ID"
    exit 1
}

Write-Host "Using project: $PROJECT_ID" -ForegroundColor Green

# Set variables
$SERVICE_NAME = "fiattib-backend"
$REGION = "us-central1"
$IMAGE_NAME = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Navigate to backend directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "Building Docker image..." -ForegroundColor Green
docker build -t "${IMAGE_NAME}:latest" .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Pushing image to Container Registry..." -ForegroundColor Green
docker push "${IMAGE_NAME}:latest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker push failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Deploying to Cloud Run..." -ForegroundColor Green
gcloud run deploy $SERVICE_NAME `
    --image "${IMAGE_NAME}:latest" `
    --platform managed `
    --region $REGION `
    --allow-unauthenticated `
    --port 8080 `
    --memory 2Gi `
    --cpu 2 `
    --min-instances 0 `
    --max-instances 10 `
    --timeout 300 `
    --set-env-vars PORT=8080

if ($LASTEXITCODE -ne 0) {
    Write-Host "Cloud Run deployment failed!" -ForegroundColor Red
    exit 1
}

# Get the service URL
$SERVICE_URL = gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)'

Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "Service URL: $SERVICE_URL" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update your frontend to use: $SERVICE_URL/api"
Write-Host "2. Update CORS settings in backend/app/main.py to include your frontend domain"
Write-Host "3. Set up environment variables in Cloud Run for database connection"
Write-Host "4. Configure Firebase Hosting rewrites (already done in firebase.json)"

