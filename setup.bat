@echo off
REM MailMergeX Quick Setup Script (Windows)

echo Setting up MailMergeX...

REM Check if .env.local exists
if exist .env.local (
    echo .env.local already exists. Skipping creation.
) else (
    echo Creating .env.local...
    copy .env.example .env.local
    echo Please edit .env.local and add your:
    echo   - DATABASE_URL from Neon
    echo   - NEXTAUTH_SECRET
    echo   - ENCRYPTION_KEY
)

REM Install dependencies
echo Installing dependencies...
npm install

REM Push database schema
echo Pushing database schema...
npm run db:push

echo.
echo Setup complete!
echo.
echo To start the development server:
echo   npm run dev
echo.
echo Then open http://localhost:3000
