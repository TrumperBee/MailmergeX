#!/bin/bash

# MailMergeX Quick Setup Script
# Run this after creating your Neon database

echo "Setting up MailMergeX..."

# Check if .env.local exists
if [ -f .env.local ]; then
    echo ".env.local already exists. Skipping creation."
else
    echo "Creating .env.local..."
    cp .env.example .env.local
    echo "Please edit .env.local and add your:"
    echo "  - DATABASE_URL from Neon"
    echo "  - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)"
    echo "  - ENCRYPTION_KEY (generate with: openssl rand -base64 32)"
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Push database schema
echo "Pushing database schema..."
npm run db:push

echo ""
echo "Setup complete!"
echo ""
echo "To start the development server:"
echo "  npm run dev"
echo ""
echo "Then open http://localhost:3000"
