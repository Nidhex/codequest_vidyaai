@echo off
title VIDYA AI Setup & Startup

echo ===================================================
echo   🎓 Welcome to VIDYA AI Orchestration Manager 🎓
echo ===================================================
echo.

:: 1. Verify Node modules in root
if not exist node_modules\ (
    echo [SYS]: Root node_modules not found. Installing concurrently...
    call npm install
)

:: 2. Verify Node modules in backend
if not exist backend\node_modules\ (
    echo [SYS]: Backend node_modules not found. Installing server packages...
    cd backend
    call npm install
    cd ..
)

:: 3. Verify Node modules in frontend
if not exist frontend\node_modules\ (
    echo [SYS]: Frontend node_modules not found. Installing client packages...
    cd frontend
    call npm install
    cd ..
)

:: 4. Verify Python libraries
echo [SYS]: Verifying Python dependencies for RAG service...
echo (Note: If sentence-transformers fails or takes too long, uvicorn will still start and run using the fast TF-IDF fallback!)
pip install -r rag-service/requirements.txt

echo.
echo [SYS]: Starting RAG service, Orchestrator backend, and Vite frontend concurrently...
echo =========================================================================
call npm run dev
