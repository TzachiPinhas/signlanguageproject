@echo off
echo Starting Sign Language Recognition App in network mode...
echo.
echo This will make the app accessible from other devices on your local network
echo.

:: Find your IP address
echo Detecting your local IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R /C:"IPv4 Address"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip
set LOCAL_IP=%LOCAL_IP:~1%

echo.
echo Your local IP address is: %LOCAL_IP%
echo.
echo When the app starts, you can access it from other devices at:
echo http://%LOCAL_IP%:3000
echo.
echo Use the QR code in the app for easier access from mobile devices
echo.
echo Starting server...
echo.

set HOST=0.0.0.0
npm start

pause