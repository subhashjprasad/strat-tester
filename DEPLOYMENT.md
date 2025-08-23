# Deployment Guide

## Quick Deploy Options

### Option 1: Railway (Recommended)
Railway supports both Node.js and Python in the same project.

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy to Railway**:
   - Go to [railway.app](https://railway.app)
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect Node.js and install Python dependencies

3. **Environment Variables** (if needed):
   - `NODE_ENV=production`
   - `PORT` (auto-set by Railway)

### Option 2: Render
1. **Push to GitHub** (same as above)

2. **Deploy to Render**:
   - Go to [render.com](https://render.com)
   - Click "New Web Service"
   - Connect your GitHub repository
   - Use these settings:
     - **Build Command**: `npm run heroku-postbuild`
     - **Start Command**: `npm start`

### Option 3: Heroku
1. **Install Heroku CLI**
2. **Deploy**:
   ```bash
   heroku create your-app-name
   git push heroku main
   ```

## Build Commands

The app will automatically:
1. Install Node.js dependencies
2. Install Python dependencies (pandas, numpy)
3. Build React frontend
4. Serve everything from the Express server

## Environment Variables

Required for production:
- `NODE_ENV=production`
- `PORT` (usually auto-set by platform)

## Testing Deployment

After deployment, test:
1. ✅ Frontend loads correctly
2. ✅ Monaco editor works
3. ✅ Regular backtest works
4. ✅ Permutation test works (may be slower)

## Troubleshooting

**Python Dependencies**: If Python deps fail to install:
- Ensure `requirements.txt` is in root directory
- Platform should auto-detect Python is needed

**Build Errors**: 
- Check that both root and client `package.json` files are valid
- Ensure all dependencies are properly listed

**Runtime Errors**:
- Check server logs for Python path issues
- Verify data files are included in deployment

## Custom Domain (Optional)

Most platforms allow custom domains in their dashboards:
- Railway: Project Settings → Domains
- Render: Settings → Custom Domains  
- Heroku: Settings → Domains