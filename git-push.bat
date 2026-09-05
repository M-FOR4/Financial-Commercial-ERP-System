@echo off
:loop
cls
echo ========================================
echo   Little One - Git Auto Push
echo ========================================
echo.

set /p msg="Enter commit message (or press Ctrl+C to exit): "

if "%msg%"=="" (
    echo [Error] Message cannot be empty!
    pause
    goto loop
)

echo.
echo Adding files...
git add .

echo.
echo Committing changes...
git commit -m "%msg%"

echo.
echo Pushing to GitHub...
git push

echo.
echo ========================================
echo   Done! Your changes are now on GitHub.
echo ========================================
echo.
echo Press ENTER to start another update...
pause > nul
goto loop
