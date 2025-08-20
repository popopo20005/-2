# 🚀 Deployment Guide

## Quick Start
1. `cd quiz-app-react`
2. `npm install`
3. `npm run build`
4. Deploy the `dist` folder

## Platform-Specific Instructions

### Vercel (Recommended)
1. Push to GitHub repository
2. Import project in Vercel dashboard
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Deploy automatically

### Netlify
1. Build project: `npm run build`
2. Drag `dist` folder to Netlify dashboard
3. Or connect GitHub repository for auto-deploy

### GitHub Pages
1. Enable GitHub Pages in repository settings
2. Use GitHub Actions with this workflow:

```yaml
name: Deploy
on:
  push:
    branches: [ main ]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm install
    - run: npm run build
    - uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

### Firebase Hosting
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Build: `npm run build`
5. Deploy: `firebase deploy`

## Environment Variables
No environment variables required for basic deployment.

## Build Output
The build process creates optimized files in the `dist` directory:
- Minified JavaScript and CSS
- Optimized images and assets
- Service worker for PWA functionality
- Manifest file for app installation