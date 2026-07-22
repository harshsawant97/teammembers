Write-Host "Downloading Flutter SDK..."
$FlutterDir = "C:\src\flutter"
if (-Not (Test-Path "C:\src")) {
    New-Item -ItemType Directory -Path "C:\src" | Out-Null
}
if (-Not (Test-Path $FlutterDir)) {
    git clone https://github.com/flutter/flutter.git -b stable $FlutterDir
} else {
    Write-Host "Flutter directory already exists."
}

Write-Host "Adding Flutter to PATH..."
$UserPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::User)
if ($UserPath -notmatch "flutter\\bin") {
    $NewPath = $UserPath + ";$FlutterDir\bin"
    [Environment]::SetEnvironmentVariable("Path", $NewPath, [EnvironmentVariableTarget]::User)
    Write-Host "Flutter added to User PATH."
} else {
    Write-Host "Flutter is already in User PATH."
}

$env:Path += ";$FlutterDir\bin"

Write-Host "Running flutter doctor..."
& "$FlutterDir\bin\flutter.bat" doctor
