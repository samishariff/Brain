[CmdletBinding()]
param(
  [string]$CaptureRoot = 'artifacts/native-speaker-refresh',
  [string]$Impeccable = 'E:/OpenCode/.devtools/impeccable/plugin/skills/impeccable/scripts/impeccable.cmd'
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$capture = [IO.Path]::GetFullPath((Join-Path $root $CaptureRoot))
$receipt = Get-Content -LiteralPath (Join-Path $capture 'capture-provenance.json') -Raw | ConvertFrom-Json
$specs = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'speaker-capture-crops.json') -Raw | ConvertFrom-Json
$manifestPath = Join-Path $root 'tools/native-captures.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$outputs = @()
foreach ($spec in $specs) {
  $expected = @($receipt.images | Where-Object { [IO.Path]::GetFileName($_.path) -eq $spec.source })
  if ($expected.Count -ne 1) { throw 'Expected exactly one receipted native source image.' }
  $source = $expected[0].path
  if (![IO.Path]::IsPathRooted($source)) { $source = Join-Path $capture $source }
  $sourceHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($sourceHash -ne $expected[0].sha256.ToLowerInvariant()) { throw 'Native source capture differs from its receipt.' }
  if ($spec.file -notmatch '^windows-[a-z-]+\.png$') { throw 'Expected a Windows PNG asset filename.' }
  $output = Join-Path $root ('assets/' + $spec.file)
  if ($spec.crop) {
    $bitmap = [Drawing.Bitmap]::new($source)
    try {
      if ($spec.crop.Count -ne 4) { throw 'Crop must contain x, y, width, height.' }
      $rect = [Drawing.Rectangle]::new($spec.crop[0], $spec.crop[1], $spec.crop[2], $spec.crop[3])
      if ($rect.X -lt 0 -or $rect.Y -lt 0 -or $rect.Width -le 0 -or $rect.Height -le 0 -or
          $rect.Right -gt $bitmap.Width -or $rect.Bottom -gt $bitmap.Height) { throw 'Crop exceeds the native source image.' }
      $detail = $bitmap.Clone($rect, $bitmap.PixelFormat)
      try { $detail.Save($output, [Drawing.Imaging.ImageFormat]::Png) } finally { $detail.Dispose() }
    } finally { $bitmap.Dispose() }
  } else { Copy-Item -LiteralPath $source -Destination $output }
  $origin = 'Origin: actual Brain Windows WinUI capture, source ' + $receipt.sourceHead + ', ' + $spec.source + '. Seeded sample content, not real call or inference evidence. No redraw, recolor, text replacement, or fabricated controls.'
  if ($spec.crop) { $origin += ' Pixel crop x,y,width,height=' + ($spec.crop -join ',') + '.' }
  & $Impeccable embed-prompt $output --prompt $origin | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not embed screenshot origin.' }
  $image = [Drawing.Image]::FromFile($output)
  try { $width = $image.Width; $height = $image.Height } finally { $image.Dispose() }
  $outputs += [ordered]@{
    file = $spec.file; source = $spec.source; sourceSha256 = $sourceHash; crop = $spec.crop
    width = $width; height = $height; sha256 = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash.ToLowerInvariant()
    sourceCommit = $receipt.sourceHead; capturedUtc = $receipt.capturedUtc; origin = $origin
  }
}
# Older assets keep their own receipts and the manifest's original default source.
# Refreshed entries explicitly override that default with their actual capture.
$manifest.files = @($manifest.files | Where-Object { $_.file -notin $outputs.file }) + $outputs
$manifest | Add-Member -NotePropertyName sourcePolicy -NotePropertyValue 'Per-file sourceCommit and capturedUtc override the original manifest defaults for refreshed captures.' -Force
[IO.File]::WriteAllText($manifestPath, (($manifest | ConvertTo-Json -Depth 8).Replace("`r`n", "`n") + "`n"), [Text.UTF8Encoding]::new($false))
$outputs | ForEach-Object { [pscustomobject]$_ } | Select-Object file, width, height, sourceCommit
