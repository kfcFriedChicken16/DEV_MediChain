@echo off
REM MediChain IPFS Setup Script for Windows

echo === MediChain IPFS Setup ===
echo This script will help you set up IPFS integration for MediChain.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed. Please install Node.js and try again.
    exit /b 1
)

REM Step 1: Set up environment variables
echo.
echo === Step 1: Setting up environment variables ===
node src\scripts\setup-env.js

REM Check if setup was successful
if not exist .env.local (
    echo Error: Environment setup failed. Please run 'node src\scripts\setup-env.js' manually.
    exit /b 1
)

REM Step 2: Test IPFS integration
echo.
echo === Step 2: Testing IPFS integration ===
echo To test your IPFS configuration, start the development server with:
echo npm run dev
echo.
echo Then visit http://localhost:3000/ipfs-test in your browser.

echo.
echo === Setup Complete ===
echo You can now start the development server with:
echo npm run dev

pause 