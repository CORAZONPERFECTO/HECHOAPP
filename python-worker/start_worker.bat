@echo off
echo Starting Hecho Python Worker...
cd /d "%~dp0"
set MOCK_DB=true
call python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
