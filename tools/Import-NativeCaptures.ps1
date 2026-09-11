[CmdletBinding()]
param([string]$CaptureRoot = 'artifacts/native-capture-v2', [string]$Impeccable = 'E:/OpenCode/.devtools/impeccable/plugin/skills/impeccable/scripts/impeccable.cmd')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$capture = [IO.Path]::GetFullPath((Join-Path $root $CaptureRoot))
$receipt = Get-Content -LiteralPath (Join-Path $capture 'capture-provenance.json') -Raw | ConvertFrom-Json
$specs = @(
  @{name='windows-live';source='assistant-live-Dark-wide.png'},
  @{name='windows-assistant-detail';source='assistant-live-Dark-wide.png';crop=@(2015,183,681,900)},
  @{name='windows-transcript-detail';source='assistant-live-Dark-wide.png';crop=@(476,544,1519,950)},
  @{name='windows-detection';source='meeting-detection-Dark.png';crop=@(1098,310,1558,540)},
  @{name='windows-detection-full';source='meeting-detection-Dark.png'},
  @{name='windows-people';source='interface-people-assessed-wide.png'},
  @{name='windows-person-detail';source='interface-people-assessed-wide.png';crop=@(1832,607,842,1165)},
  @{name='windows-speak';source='speak-Dark-wide.png'},
  @{name='windows-speak-detail';source='speak-Dark-wide.png';crop=@(466,180,2210,755)},
  @{name='windows-speak-pill';source='speak-listening-pill.png'}
)
$outputs = @()
foreach ($spec in $specs) {
  $source = Join-Path $capture ('website-final/' + $spec.source)
  $sourceHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()
  $expected = @($receipt.images | Where-Object { [IO.Path]::GetFileName($_.path) -eq $spec.source })
  if ($expected.Count -ne 1 -or $sourceHash -ne $expected[0].sha256.ToLowerInvariant()) { throw 'Native source capture differs from its receipt.' }
  $output = Join-Path $root ('assets/' + $spec.name + '.png')
  if ($spec.crop) {
    $bitmap = [Drawing.Bitmap]::new($source)
    try {
      $rect = [Drawing.Rectangle]::new($spec.crop[0],$spec.crop[1],$spec.crop[2],$spec.crop[3])
      $detail = $bitmap.Clone($rect, $bitmap.PixelFormat)
      try { $detail.Save($output,[Drawing.Imaging.ImageFormat]::Png) } finally { $detail.Dispose() }
    } finally { $bitmap.Dispose() }
  } else { Copy-Item -LiteralPath $source -Destination $output }
  $origin = 'Origin: actual Brain Windows WinUI capture, source ' + $receipt.sourceHead + ', ' + $spec.source + '. Sample UI state, not real call or inference evidence. No redraw, recolor, text replacement, or fabricated controls.'
  if ($spec.crop) { $origin += ' Pixel crop x,y,width,height=' + ($spec.crop -join ',') + '.' }
  & $Impeccable embed-prompt $output --prompt $origin | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not embed screenshot origin.' }
  $image = [Drawing.Image]::FromFile($output)
  try { $width=$image.Width; $height=$image.Height } finally { $image.Dispose() }
  $outputs += [ordered]@{file=($spec.name+'.png');source=$spec.source;sourceSha256=$sourceHash;crop=$spec.crop;width=$width;height=$height;sha256=(Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash.ToLowerInvariant();origin=$origin}
}
$manifest = [ordered]@{sourceCommit=$receipt.sourceHead;capturedUtc=$receipt.capturedUtc;method='Native WinUI render; unchanged production controls; pixel-only crops';sampleContent='Meetings, transcript passages, assistant reply, voice assessments, Speak delivery and listening states are seeded demonstration data. These captures do not prove live ASR, calls, inference, or text insertion.';files=$outputs}
[IO.File]::WriteAllText((Join-Path $root 'tools/native-captures.json'),($manifest | ConvertTo-Json -Depth 8),[Text.UTF8Encoding]::new($false))
$outputs | Select-Object file,width,height
