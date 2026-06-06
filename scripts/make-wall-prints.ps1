Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$InputDir = Join-Path $ProjectRoot "wall-print\input"
$OutputDir = Join-Path $ProjectRoot "wall-print\output"
$LogoPath = Join-Path $ProjectRoot "public\instax-logo.png"
$PdfScriptPath = Join-Path $PSScriptRoot "build-wall-print-pdf.mjs"

$SheetWidth = 1800
$SheetHeight = 1200
$HalfWidth = 900
$PhotoWidth = 820
$PhotoHeight = 1010
$PhotoTop = 35
$LogoMaxWidth = 230
$LogoMaxHeight = 72
$LogoCenterY = 1123
$JpegQuality = 95L
$TodayStamp = Get-Date -Format "yyyy-MM-dd"
$PdfFileName = "To-Post-On-Wall-$TodayStamp.pdf"

New-Item -ItemType Directory -Force -Path $InputDir, $OutputDir | Out-Null

function Get-JpegCodec {
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq "image/jpeg" } |
    Select-Object -First 1

  if (-not $codec) {
    throw "JPEG encoder is not available on this machine."
  }

  return $codec
}

function Save-Jpeg {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Bitmap] $Bitmap,

    [Parameter(Mandatory = $true)]
    [string] $Path
  )

  $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality,
    $JpegQuality
  )

  $Bitmap.Save($Path, (Get-JpegCodec), $encoderParams)
}

function Format-CsvRow {
  param(
    [Parameter(Mandatory = $true)]
    [AllowEmptyString()]
    [AllowNull()]
    [string[]] $Values
  )

  $escaped = $Values | ForEach-Object {
    $value = $_
    if ($null -eq $value) { $value = "" }
    if ($value -match '[,"\r\n]') {
      '"' + ($value -replace '"', '""') + '"'
    } else {
      $value
    }
  }

  return ($escaped -join ",")
}

function Convert-ExifOrientation {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Bitmap] $Bitmap,

    [Parameter(Mandatory = $true)]
    [System.Drawing.Image] $Source
  )

  try {
    $orientationItem = $Source.GetPropertyItem(274)
    $orientation = [BitConverter]::ToUInt16($orientationItem.Value, 0)
  } catch {
    return
  }

  switch ($orientation) {
    2 { $Bitmap.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX) }
    3 { $Bitmap.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
    4 { $Bitmap.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipX) }
    5 { $Bitmap.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipX) }
    6 { $Bitmap.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
    7 { $Bitmap.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipX) }
    8 { $Bitmap.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
  }
}

function Load-Bitmap {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Path
  )

  $source = [System.Drawing.Image]::FromFile($Path)
  try {
    $bitmap = New-Object System.Drawing.Bitmap($source)
    Convert-ExifOrientation -Bitmap $bitmap -Source $source
    return $bitmap
  } finally {
    $source.Dispose()
  }
}

function Draw-Cover {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Graphics] $Graphics,

    [Parameter(Mandatory = $true)]
    [System.Drawing.Image] $Image,

    [Parameter(Mandatory = $true)]
    [System.Drawing.Rectangle] $Destination
  )

  $imageRatio = $Image.Width / $Image.Height
  $destRatio = $Destination.Width / $Destination.Height

  if ($imageRatio -gt $destRatio) {
    $sourceHeight = $Image.Height
    $sourceWidth = [int][Math]::Round($sourceHeight * $destRatio)
    $sourceX = [int][Math]::Round(($Image.Width - $sourceWidth) / 2)
    $sourceY = 0
  } else {
    $sourceWidth = $Image.Width
    $sourceHeight = [int][Math]::Round($sourceWidth / $destRatio)
    $sourceX = 0
    $sourceY = [int][Math]::Round(($Image.Height - $sourceHeight) / 2)
  }

  $sourceRect = New-Object System.Drawing.Rectangle($sourceX, $sourceY, $sourceWidth, $sourceHeight)
  $Graphics.DrawImage($Image, $Destination, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
}

function Draw-WallFrame {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Graphics] $Graphics,

    [Parameter(Mandatory = $true)]
    [int] $HalfX,

    [AllowNull()]
    [System.Drawing.Image] $Photo,

    [AllowNull()]
    [System.Drawing.Image] $Logo
  )

  $photoX = $HalfX + [int][Math]::Round(($HalfWidth - $PhotoWidth) / 2)
  $photoRect = New-Object System.Drawing.Rectangle($photoX, $PhotoTop, $PhotoWidth, $PhotoHeight)

  if (-not $Photo) {
    return
  }

  Draw-Cover -Graphics $Graphics -Image $Photo -Destination $photoRect

  if ($Logo) {
    $logoScale = [Math]::Min($LogoMaxWidth / $Logo.Width, $LogoMaxHeight / $Logo.Height)
    $logoWidth = [int][Math]::Round($Logo.Width * $logoScale)
    $logoHeight = [int][Math]::Round($Logo.Height * $logoScale)
    $logoX = $HalfX + [int][Math]::Round(($HalfWidth - $logoWidth) / 2)
    $logoY = [int][Math]::Round($LogoCenterY - ($logoHeight / 2))
    $logoRect = New-Object System.Drawing.Rectangle($logoX, $logoY, $logoWidth, $logoHeight)
    $Graphics.DrawImage($Logo, $logoRect)
  }
}

$files = @(Get-ChildItem -Path $InputDir -File |
  Where-Object { $_.Extension -match "^\.(jpe?g|png)$" } |
  Sort-Object Name)

if ($files.Count -eq 0) {
  Write-Host "No images found in $InputDir"
  Write-Host "Add .jpg, .jpeg, or .png files, then run npm run wall-print again."
  exit 0
}

Get-ChildItem -Path $OutputDir -File -Filter "wall-print-sheet-*.jpg" | Remove-Item -Force
$manifestPath = Join-Path $OutputDir "manifest.csv"
if (Test-Path $manifestPath) {
  Remove-Item -LiteralPath $manifestPath -Force
}
Get-ChildItem -Path $OutputDir -File -Filter "To-Post-On-Wall-*.pdf" | Remove-Item -Force
$oldPdfPath = Join-Path $OutputDir "wall-print-sheets.pdf"
if (Test-Path $oldPdfPath) {
  Remove-Item -LiteralPath $oldPdfPath -Force
}
$pdfPath = Join-Path $OutputDir $PdfFileName
if (Test-Path $pdfPath) {
  Remove-Item -LiteralPath $pdfPath -Force
}

$logo = $null
if (Test-Path $LogoPath) {
  $logo = Load-Bitmap -Path $LogoPath
} else {
  Write-Warning "Logo not found at $LogoPath. Sheets will be generated without the bottom logo."
}

$manifest = New-Object System.Collections.Generic.List[string]
$manifest.Add((Format-CsvRow -Values @("pdf_page", "left_photo", "right_photo")))

try {
  $sheetNumber = 1
  for ($i = 0; $i -lt $files.Count; $i += 2) {
    $leftFile = $files[$i]
    $rightFile = if (($i + 1) -lt $files.Count) { $files[$i + 1] } else { $null }

    $leftPhoto = Load-Bitmap -Path $leftFile.FullName
    $rightPhoto = if ($rightFile) { Load-Bitmap -Path $rightFile.FullName } else { $null }
    $sheet = $null

    try {
      $sheet = New-Object System.Drawing.Bitmap($SheetWidth, $SheetHeight, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
      $sheet.SetResolution(300, 300)
      $graphics = [System.Drawing.Graphics]::FromImage($sheet)

      try {
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.Clear([System.Drawing.Color]::White)

        Draw-WallFrame -Graphics $graphics -HalfX 0 -Photo $leftPhoto -Logo $logo
        Draw-WallFrame -Graphics $graphics -HalfX $HalfWidth -Photo $rightPhoto -Logo $logo

        $cutPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(216, 216, 216), 2)
        try {
          $graphics.DrawLine($cutPen, $HalfWidth, 0, $HalfWidth, $SheetHeight)
        } finally {
          $cutPen.Dispose()
        }
      } finally {
        $graphics.Dispose()
      }

      $outputName = "wall-print-sheet-{0:D3}.jpg" -f $sheetNumber
      $outputPath = Join-Path $OutputDir $outputName
      Save-Jpeg -Bitmap $sheet -Path $outputPath

      $rightName = if ($rightFile) { $rightFile.Name } else { "" }
      $manifest.Add((Format-CsvRow -Values @($sheetNumber.ToString(), $leftFile.Name, $rightName)))
      Write-Host "Created $outputName"
    } finally {
      if ($sheet) { $sheet.Dispose() }
      $leftPhoto.Dispose()
      if ($rightPhoto) { $rightPhoto.Dispose() }
    }

    $sheetNumber++
  }
} finally {
  if ($logo) { $logo.Dispose() }
}

$manifest | Set-Content -Path $manifestPath -Encoding UTF8

$sheetCount = $sheetNumber - 1
if ($sheetCount -gt 0) {
  & node $PdfScriptPath $OutputDir $pdfPath
  if ($LASTEXITCODE -ne 0) {
    throw "PDF generation failed."
  }

  Get-ChildItem -Path $OutputDir -File -Filter "wall-print-sheet-*.jpg" | Remove-Item -Force
}

Write-Host ""
Write-Host "Done. Created $sheetCount sheet(s) in one PDF:"
Write-Host $pdfPath
Write-Host "Manifest: $manifestPath"
