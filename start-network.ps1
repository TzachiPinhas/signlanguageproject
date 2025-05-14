# PowerShell script to start the React app on the network
Write-Host "Starting Sign Language Recognition App in network mode..."
Write-Host ""
Write-Host "This will make the app accessible from other devices on your local network"
Write-Host ""

# Find local IP address
Write-Host "Detecting your local IP address..."
$localIP = (Get-NetIPAddress | Where-Object { 
    $_.AddressFamily -eq "IPv4" -and 
    $_.PrefixOrigin -eq "Dhcp" -and 
    !($_.IPAddress -match "^169\.254\.") 
} | Select-Object -First 1).IPAddress

if (-not $localIP) {
    # Fallback method if the first one doesn't work
    $localIP = (Test-Connection -ComputerName (hostname) -Count 1).IPV4Address.IPAddressToString
}

Write-Host ""
Write-Host "Your local IP address is: $localIP"
Write-Host ""
Write-Host "When the app starts, you can access it from other devices at:"
Write-Host "http://$($localIP):3000"
Write-Host ""
Write-Host "Use the QR code in the app for easier access from mobile devices"
Write-Host ""
Write-Host "Starting server..."
Write-Host ""

# Set environment variables and start the app
$env:HOST = "0.0.0.0"
npm start

# Keep the window open after completion for visibility
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")