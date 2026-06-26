# Download a platform ffmpeg build into builder/.staging/forester/bin/

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuilderDir = Resolve-Path (Join-Path $ScriptDir "..")
$StagingBin = Join-Path $BuilderDir ".staging\forester\bin"
$CacheDir = Join-Path $BuilderDir ".staging\ffmpeg-cache"
$ReleaseTag = if ($env:FFMPEG_RELEASE_TAG) { $env:FFMPEG_RELEASE_TAG } else { "latest" }

if ($env:FFMPEG_SKIP -eq "true") {
    Write-Host "FFMPEG_SKIP=true - skipping bundled ffmpeg fetch"
    exit 0
}

$ReleaseLabel = if ($ReleaseTag -eq "latest") { "master-latest" } else { $ReleaseTag }

New-Item -ItemType Directory -Force -Path $StagingBin, $CacheDir | Out-Null

$ArchiveName = "ffmpeg-$ReleaseLabel-win64-gpl.zip"
$ArchivePath = Join-Path $CacheDir $ArchiveName
$FfmpegName = "ffmpeg.exe"
$StagedFfmpeg = Join-Path $StagingBin $FfmpegName

if ((Test-Path $StagedFfmpeg) -and ($env:FFMPEG_FORCE -ne "true")) {
    Write-Host "Bundled ffmpeg already present: $StagedFfmpeg"
    exit 0
}

$DownloadUrl = "https://github.com/BtbN/FFmpeg-Builds/releases/download/$ReleaseTag/$ArchiveName"
Write-Host "=== Fetch ffmpeg (windows) ==="
Write-Host "URL: $DownloadUrl"

if ((-not (Test-Path $ArchivePath)) -or ($env:FFMPEG_FORCE -eq "true")) {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $ArchivePath
}

$ExtractDir = Join-Path $CacheDir "extract-$ArchiveName"
if (Test-Path $ExtractDir) {
    Remove-Item -Recurse -Force $ExtractDir
}
New-Item -ItemType Directory -Force -Path $ExtractDir | Out-Null
Expand-Archive -Path $ArchivePath -DestinationPath $ExtractDir -Force

$FfmpegSrc = Get-ChildItem -Path $ExtractDir -Recurse -Filter $FfmpegName -File | Select-Object -First 1
if (-not $FfmpegSrc) {
    throw "ffmpeg binary not found in $ArchiveName"
}

Copy-Item -Force $FfmpegSrc.FullName $StagedFfmpeg
Get-ChildItem -Path $FfmpegSrc.DirectoryName -Filter "*.dll" -File | ForEach-Object {
    Copy-Item -Force $_.FullName (Join-Path $StagingBin $_.Name)
}

Write-Host "ffmpeg staged: $StagedFfmpeg"
