@echo off
echo Starting Hecho Python Worker...
cd /d "%~dp0"
set MOCK_DB=true
:loop
call python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
echo Worker crashed or stopped. Restarting in 5 seconds...
timeout /t 5
goto loop
pause
