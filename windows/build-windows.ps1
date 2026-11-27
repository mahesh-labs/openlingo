param(
  [string]$Version = $(if ($env:APP_VERSION) { $env:APP_VERSION } else { "0.0.10-beta" })
)

$ErrorActionPreference = "Stop"

$WinDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $WinDir
$DistDir = Join-Path $WinDir "dist"
$StageDir = Join-Path $DistDir "stage"
$StageMsiDir = Join-Path $DistDir "stage-msi"
$WwwDir = Join-Path $StageDir "www"

if (Test-Path $DistDir) { Remove-Item -Recurse -Force $DistDir }
New-Item -ItemType Directory -Force -Path $WwwDir | Out-Null

# 1. Copy web app + courses + assets into stage/www
$RootFiles = @("index.html", "privacy.html", "styles.css", "app.js", "sw.js", "manifest.webmanifest", "LICENSE", "README.md")
foreach ($f in $RootFiles) {
  Copy-Item (Join-Path $ProjectDir $f) -Destination $WwwDir -Force
}
foreach ($d in @("src", "courses", "assets")) {
  Copy-Item (Join-Path $ProjectDir $d) -Destination (Join-Path $WwwDir $d) -Recurse -Force
}

# 2. Compile native zero-dependency OpenLingo.exe using built-in .NET Framework 4.8 csc.exe
$Csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $Csc)) {
  $Csc = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
}
if (-not (Test-Path $Csc)) {
  throw "Could not find .NET Framework csc.exe"
}

$ExeOut = Join-Path $StageDir "OpenLingo.exe"
$IconPath = Join-Path $WinDir "openlingo.ico"
$CsSrc = Join-Path $WinDir "OpenLingo.cs"

& $Csc /nologo /optimize+ /target:winexe /platform:anycpu `
  "/win32icon:$IconPath" `
  "/out:$ExeOut" `
  /r:System.dll `
  /r:System.Core.dll `
  /r:System.Web.Extensions.dll `
  /r:System.IO.Compression.dll `
  /r:System.IO.Compression.FileSystem.dll `
  $CsSrc

if ($LASTEXITCODE -ne 0) { throw "csc.exe failed compiling OpenLingo.cs" }
Write-Host "Built $ExeOut"

# 3. Build Portable ZIP (OpenLingo-v<Version>-windows-portable.zip)
$PortableFolder = Join-Path $DistDir "OpenLingo-v$Version-windows-portable"
Copy-Item $StageDir -Destination $PortableFolder -Recurse -Force
$PortableZip = Join-Path $DistDir "OpenLingo-v$Version-windows-portable.zip"
Compress-Archive -Path $PortableFolder -DestinationPath $PortableZip -CompressionLevel Optimal -Force
Remove-Item -Recurse -Force $PortableFolder
Write-Host "Built $PortableZip"

# 4. Build EXE Installer via Inno Setup (iscc)
$Iscc = Get-Command iscc -ErrorAction SilentlyContinue
if (-not $Iscc) {
  foreach ($cand in @(
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe",
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
  )) {
    if (Test-Path $cand) { $Iscc = $cand; break }
  }
} else {
  $Iscc = $Iscc.Source
}

if ($Iscc) {
  & $Iscc "/DAppVersion=$Version" (Join-Path $WinDir "openlingo.iss")
  if ($LASTEXITCODE -ne 0) { throw "ISCC failed building Windows EXE setup" }
  Write-Host "Built OpenLingo-v$Version-windows-setup.exe"
} else {
  Write-Warning "Inno Setup (ISCC.exe) not found; skipping setup .exe build."
}

# 5. Build MSI Installer via WiX Toolset (wix)
$Wix = Get-Command wix -ErrorAction SilentlyContinue
if ($Wix) {
  Copy-Item $StageDir -Destination $StageMsiDir -Recurse -Force
  Set-Content -Path (Join-Path $StageMsiDir ".msi-installed") -Value $Version -NoNewline

  # MSI Version must be numeric Major.Minor.Build (strip -beta etc.)
  $MsiVersion = ($Version -replace '-.*$', '')
  $MsiOut = Join-Path $DistDir "OpenLingo-v$Version-windows.msi"
  Push-Location $WinDir
  try {
    & wix build -d "MsiVersion=$MsiVersion" -o $MsiOut (Join-Path $WinDir "openlingo.wxs")
    if ($LASTEXITCODE -ne 0) { throw "wix build failed" }
  } finally {
    Pop-Location
  }
  Write-Host "Built $MsiOut"
} else {
  Write-Warning "WiX CLI (wix) not found; skipping .msi build."
}

Get-ChildItem $DistDir -File | Format-Table Name, Length
