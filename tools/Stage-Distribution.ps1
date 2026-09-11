[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ApplicationRepository,
    [string]$OutputDirectory = ('artifacts/distribution-stage-' + [guid]::NewGuid().ToString('N'))
)
$ErrorActionPreference = 'Stop'
$siteRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (& git -C $siteRoot status --porcelain) { throw 'Commit the reviewed website candidate before staging distribution.' }
$appRoot = (Resolve-Path -LiteralPath $ApplicationRepository).Path
$stage = [IO.Path]::GetFullPath((Join-Path $siteRoot $OutputDirectory))
$boundary = $siteRoot.TrimEnd('\') + '\artifacts\'
if (!$stage.StartsWith($boundary, [StringComparison]::OrdinalIgnoreCase) -or (Test-Path -LiteralPath $stage)) {
    throw 'Choose a fresh staging directory beneath this website checkout artifacts folder.'
}
# Build a separate review fixture; never change the application checkout.
New-Item -ItemType Directory -Path (Join-Path $stage 'scripts'), (Join-Path $stage 'distribution/site') -Force | Out-Null
foreach ($name in @('BrainSignature.Common.ps1', 'BrainPublicSite.Common.ps1', 'BrainDistribution.Common.ps1')) {
    Copy-Item -LiteralPath (Join-Path $appRoot ('scripts/' + $name)) -Destination (Join-Path $stage ('scripts/' + $name))
}
$publicScriptPath = Join-Path $stage 'scripts/BrainPublicSite.Common.ps1'
$publicScript = [IO.File]::ReadAllText($publicScriptPath)
if (!$publicScript.Contains("'samishariff/Brain-Windows-Releases'")) { throw 'Application baseline guard changed. Review the integration before staging.' }
$publicScript = $publicScript.Replace("'samishariff/Brain-Windows-Releases'", "'samishariff/Brain'")
[IO.File]::WriteAllText($publicScriptPath, $publicScript, [Text.UTF8Encoding]::new($false))
$distributionScriptPath = Join-Path $stage 'scripts/BrainDistribution.Common.ps1'
$distributionScript = [IO.File]::ReadAllText($distributionScriptPath)
if (!$distributionScript.Contains("@('.html', '.css', '.svg'")) { throw 'Application asset allowlist changed. Review the integration before staging.' }
# The baseline hashes cover these local scripts just as they cover other assets.
$distributionScript = $distributionScript.Replace("@('.html', '.css', '.svg'", "@('.html', '.css', '.js', '.svg'")
[IO.File]::WriteAllText($distributionScriptPath, $distributionScript, [Text.UTF8Encoding]::new($false))
. $distributionScriptPath
$templateRoot = Join-Path $stage 'distribution/site'
$sourceFiles = @(Get-ChildItem -LiteralPath $siteRoot -File | Where-Object { $_.Extension -in @('.html','.css','.js') -or $_.Name -in @('.nojekyll','mac-notices.md') })
foreach ($file in $sourceFiles) { Copy-Item -LiteralPath $file.FullName -Destination $templateRoot }
foreach ($directory in @('assets','help','privacy')) { Copy-Item -LiteralPath (Join-Path $siteRoot $directory) -Destination $templateRoot -Recurse }
Copy-Item -LiteralPath (Join-Path $siteRoot 'licenses') -Destination $stage -Recurse
Copy-Item -LiteralPath (Join-Path $siteRoot 'THIRD_PARTY_NOTICES.md') -Destination $stage
foreach ($page in @('index.html','help.html','release-notes.html')) {
    $file = Join-Path $templateRoot $page
    $content = [IO.File]::ReadAllText($file)
    if (!$content.Contains('data-site-mode="release"')) { throw "Missing release mode in $page" }
    $content = $content.Replace('data-site-mode="release"', 'data-site-mode="{{SITE_MODE}}"')
    $content = [regex]::Replace($content, '(<main\b[^>]*>)', '$1{{RELEASE_BANNER}}')
    $statePattern = if ($page -eq 'index.html') { '(<div class="release-state platform-windows">).*?</div>' } else { '(<div class="release-state">).*?</div>' }
    if ([regex]::Matches($content, $statePattern).Count -ne 1) { throw "Unexpected release state layout in $page" }
    $content = [regex]::Replace($content, $statePattern, '$1{{STATE_DETAILS}}{{VERSION_DETAILS}}</div>')
    if ($page -eq 'index.html') {
        $actionPattern = '(<div class="hero-actions platform-windows">)<a class="button"[^>]*>[^<]*</a>'
        if ([regex]::Matches($content, $actionPattern).Count -ne 1) { throw 'Unexpected Windows download layout' }
        $content = [regex]::Replace($content, $actionPattern, '$1{{DOWNLOAD_ACTION}}')
    }
    [IO.File]::WriteAllText($file, $content, [Text.UTF8Encoding]::new($false))
}
$holding = Get-BrainSitePresentation -Mode Holding
$baselineFiles = @(foreach ($file in @(Get-BrainSiteFiles $templateRoot)) {
    $text = [IO.File]::ReadAllText($file.FullName)
    $publicHash = Get-BrainSiteContentHash -Path $file.FullName
    if ($file.Extension -eq '.html') {
        foreach ($key in $holding.Keys) { $text = $text.Replace($key, $holding[$key]) }
        $publicHash = Get-BrainSiteContentHash -Text $text
    }
    [ordered]@{ path = $file.FullName.Substring($templateRoot.Length + 1).Replace('\','/'); templateSha256 = (Get-BrainSiteContentHash -Path $file.FullName); publicSha256 = $publicHash }
})
$macUris = @([regex]::Matches([IO.File]::ReadAllText((Join-Path $siteRoot 'index.html')), 'https://github\.com/samishariff/Brain-Windows-Releases/releases/download/mac-v[0-9.]+/Brain-[0-9.]+\.dmg') | ForEach-Object { $_.Value } | Sort-Object -Unique)
$candidate = (& git -C $siteRoot rev-parse HEAD).Trim()
$baseline = [ordered]@{ formatVersion = 1; repository = 'samishariff/Brain'; branch = 'main'; commit = $candidate; hashPolicy = 'sha256-text-utf8-lf-binary-exact'; allowedMacDownloadUris = $macUris; files = $baselineFiles }
[IO.File]::WriteAllText((Join-Path $stage 'distribution/public-site-baseline.json'), ($baseline | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
$results = @()
foreach ($mode in @('Holding','LocalPreview','Release')) {
    $render = Join-Path $stage ('artifacts/' + $mode)
    $parameters = @{ Repository = $stage; OutputDirectory = $render; Mode = $mode }
    if ($mode -ne 'Holding') { $parameters.Version = '1.0.3.12' }
    if ($mode -eq 'Release') { $parameters.SetupUri = [uri]'https://github.com/samishariff/Brain-Windows-Releases/releases/download/v1.0.3.12/Set.up.Brain.exe' }
    Write-BrainDistributionPages @parameters | Out-Null
    $rendered = [IO.File]::ReadAllText((Join-Path $render 'index.html'))
    foreach ($id in @('inside-brain','memory','outcomes','speak','agents')) {
        if (!$rendered.Contains('id="' + $id + '"')) { throw "Feature lost during $mode rendering: $id" }
    }
    foreach ($asset in @('showcase.css','showcase.js','windows-store.js','agents.html')) {
        if ((Get-FileHash -LiteralPath (Join-Path $render $asset)).Hash -ne (Get-FileHash -LiteralPath (Join-Path $siteRoot $asset)).Hash) { throw "Asset changed during render: $asset" }
    }
    if (!$rendered.Contains('data-approved="false"')) { throw 'The disabled Store option changed.' }
    $results += [ordered]@{ mode = $mode; passed = $true; path = $render }
}
$report = [ordered]@{ candidate = $candidate; applicationSource = $appRoot; stage = $stage; changedApplicationCheckout = $false; results = $results; note = 'Staging only. After approved publication, bind the baseline to the actual public merge commit before integrating the staged scripts/templates into the application release pipeline.' }
[IO.File]::WriteAllText((Join-Path $stage 'integration-report.json'), ($report | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
$report | ConvertTo-Json -Depth 8
