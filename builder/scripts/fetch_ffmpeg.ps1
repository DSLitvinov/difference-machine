# Download a platform ffmpeg build into builder/.staging/forester/bin/
# Archives and extracted binaries are cached under builder/.cache/ffmpeg/ (survives clean).

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuilderDir = Resolve-Path (Join-Path $ScriptDir "..")
$StagingBin = Join-Path $BuilderDir ".staging\forester\bin"
$ArchiveCacheDir = Join-Path $BuilderDir ".cache\ffmpeg\archives"
$BinCacheDir = Join-Path $BuilderDir ".cache\ffmpeg\bin"
$DistBinDir = Join-Path $BuilderDir "dist\payload\bin"
$ReleaseTag = if ($env:FFMPEG_RELEASE_TAG) { $env:FFMPEG_RELEASE_TAG } else { "latest" }

function Copy-FfmpegSidecar {
    param(
        [string]$SourceBin,
        [string]$DestBin
    )

    if (-not (Test-Path $SourceBin)) {
        return $false
    }

    New-Item -ItemType Directory -Force -Path $DestBin | Out-Null

    $FfmpegName = "ffmpeg.exe"
    $SourceFfmpeg = Join-Path $SourceBin $FfmpegName
    if (-not (Test-Path $SourceFfmpeg)) {
        return $false
    }

    Copy-Item -Force $SourceFfmpeg (Join-Path $DestBin $FfmpegName)
    Get-ChildItem -Path $SourceBin -Filter "*.dll" -File -ErrorAction SilentlyContinue | ForEach-Object {
        Copy-Item -Force $_.FullName (Join-Path $DestBin $_.Name)
    }
    return $true
}

function Try-StageFfmpegFromPreviousBuilds {
    param([string]$DestBin)

    if (Copy-FfmpegSidecar -SourceBin $BinCacheDir -DestBin $DestBin) {
        return "cache"
    }
    if (Copy-FfmpegSidecar -SourceBin $DistBinDir -DestBin $DestBin) {
        return "dist"
    }
    return $null
}

function Save-FfmpegBinCache {
    param([string]$SourceBin)
    Copy-FfmpegSidecar -SourceBin $SourceBin -DestBin $BinCacheDir | Out-Null
}

if ($env:FFMPEG_SKIP -eq "true") {
    Write-Host "FFMPEG_SKIP=true - skipping bundled ffmpeg fetch"
    exit 0
}

$ReleaseLabel = if ($ReleaseTag -eq "latest") { "master-latest" } else { $ReleaseTag }

New-Item -ItemType Directory -Force -Path $StagingBin, $ArchiveCacheDir | Out-Null

$ArchiveName = "ffmpeg-$ReleaseLabel-win64-gpl.zip"
$ArchivePath = Join-Path $ArchiveCacheDir $ArchiveName
$FfmpegName = "ffmpeg.exe"
$StagedFfmpeg = Join-Path $StagingBin $FfmpegName

if ((Test-Path $StagedFfmpeg) -and ($env:FFMPEG_FORCE -ne "true")) {
    Write-Host "Bundled ffmpeg already present: $StagedFfmpeg"
    exit 0
}

if ($env:FFMPEG_FORCE -ne "true") {
    $ReuseSource = Try-StageFfmpegFromPreviousBuilds -DestBin $StagingBin
    if ($ReuseSource -and (Test-Path $StagedFfmpeg)) {
        Save-FfmpegBinCache -SourceBin $StagingBin
        switch ($ReuseSource) {
            "cache" { Write-Host "Reused ffmpeg from build cache: $StagedFfmpeg" }
            "dist" { Write-Host "Reused ffmpeg from previous dist payload: $StagedFfmpeg" }
        }
        exit 0
    }
}

$DownloadUrl = "https://github.com/BtbN/FFmpeg-Builds/releases/download/$ReleaseTag/$ArchiveName"
Write-Host "=== Fetch ffmpeg (windows) ==="
Write-Host "URL: $DownloadUrl"

if ((-not (Test-Path $ArchivePath)) -or ($env:FFMPEG_FORCE -eq "true")) {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $ArchivePath
} else {
    Write-Host "Using cached archive: $ArchivePath"
}

$ExtractDir = Join-Path $ArchiveCacheDir "extract-$ArchiveName"
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

Save-FfmpegBinCache -SourceBin $StagingBin

Write-Host "ffmpeg staged: $StagedFfmpeg"
