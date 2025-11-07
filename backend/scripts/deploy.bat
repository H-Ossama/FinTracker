@echo off
REM FinTracker Backend Deployment Script for Windows

echo 🚀 Starting FinTracker Backend Deployment...

REM Generate Prisma Client
echo 📦 Generating Prisma Client...
call npx prisma generate

REM Push database schema (creates tables if they don't exist)
echo 🗄️ Setting up database schema...
call npx prisma db push --accept-data-loss

REM Check if deployment succeeded
if %errorlevel% equ 0 (
    echo ✅ Database setup completed successfully!
    echo 🚀 Starting server...
    call node dist/server.js
) else (
    echo ❌ Database setup failed!
    exit /b 1
)