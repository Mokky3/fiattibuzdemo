# Netlify Environment Variable Setup

Since you're deploying the frontend to Netlify through GitHub, you need to set the `VITE_API_URL` environment variable in Netlify's dashboard.

## Steps to Set Environment Variable in Netlify

### Method 1: Netlify Dashboard (Recommended)

1. **Go to Netlify Dashboard**
   - Visit [app.netlify.com](https://app.netlify.com)
   - Log in to your account

2. **Select Your Site**
   - Click on your site (fiattib or your site name)

3. **Navigate to Site Settings**
   - Click on **Site settings** in the top navigation
   - Or go to: **Site configuration** → **Environment variables**

4. **Add Environment Variable**
   - Click **Add variable** or **Add environment variable**
   - **Key**: `VITE_API_URL`
   - **Value**: `https://fiattib-backend-677633413590.us-east4.run.app`
   - **Scopes**: Select **All scopes** (or just **Production** if you want different URLs for previews)

5. **Save and Redeploy**
   - Click **Save** or **Add variable**
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site** to rebuild with the new environment variable

### Method 2: Netlify CLI

If you have Netlify CLI installed:

```bash
# Set environment variable
netlify env:set VITE_API_URL "https://fiattib-backend-677633413590.us-east4.run.app"

# Or for production only
netlify env:set VITE_API_URL "https://fiattib-backend-677633413590.us-east4.run.app" --context production
```

### Method 3: netlify.toml (Not Recommended for Secrets)

You can also add it to `netlify.toml`, but this is less secure and commits the URL to your repo:

```toml
[build.environment]
  VITE_API_URL = "https://fiattib-backend-677633413590.us-east4.run.app"
```

## Verify It's Working

After setting the environment variable and redeploying:

1. Check the build logs in Netlify to see if the variable is being used
2. Open your deployed site and check the browser console
3. Look for API calls - they should go to `https://fiattib-backend-677633413590.us-east4.run.app` instead of `localhost:8000`

## Important Notes

- **Vite Environment Variables**: Variables must start with `VITE_` to be accessible in the frontend code
- **Build Time**: These variables are injected at **build time**, not runtime
- **Redeploy Required**: After adding/changing environment variables, you must **trigger a new deploy**
- **Scopes**: You can set different values for:
  - **Production**: Your main site
  - **Branch deploys**: Preview deployments for branches
  - **Deploy previews**: Pull request previews

## Current Configuration

The frontend code is already configured to:
1. Use `VITE_API_URL` if set
2. Fall back to production URL if `import.meta.env.PROD` is true
3. Use `localhost:8000` for local development

So once you set `VITE_API_URL` in Netlify, it will automatically use that value when building.

