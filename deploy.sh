#!/bin/bash

echo "================================"
echo " Minguella Quiz App Deployment"
echo "================================"
echo ""

cd quiz-app-react

echo "Installing dependencies..."
npm install

echo ""
echo "Building for production..."
npm run build

echo ""
echo "================================"
echo " Build completed!"
echo "================================"
echo ""
echo "The app is ready for deployment."
echo "Built files are in the 'dist' folder."
echo ""
echo "Next steps:"
echo "1. Upload contents of 'dist' folder to your web server"
echo "2. Or use platforms like Vercel, Netlify, etc."
echo ""
echo "For platform-specific instructions, see DEPLOYMENT_GUIDE.md"
echo ""