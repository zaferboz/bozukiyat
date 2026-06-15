$ErrorActionPreference = 'Stop'
$songsDir = 'D:\somemusic\songs'
$bundlePath = 'D:\somemusic\js\songs-bundle.js'
$manifestPath = 'D:\somemusic\songs\manifest.json'
$utf8 = [System.Text.UTF8Encoding]::new($false)
$oldManifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$diskFiles = Get-ChildItem -LiteralPath $songsDir -Filter '*.json' | Where-Object { $_.Name -ne 'manifest.json' } | ForEach-Object { $_.Name }
$diskSet = @{}
foreach ($f in $diskFiles) { $diskSet[$f] = $true }
$ordered = @()
foreach ($f in @($oldManifest.files)) { if ($diskSet.ContainsKey($f)) { $ordered += $f } }
foreach ($f in ($diskFiles | Sort-Object)) { if ($ordered -notcontains $f) { $ordered += $f } }
$jsonTexts = @()
foreach ($file in $ordered) {
  $path = Join-Path $songsDir $file
  $text = [System.IO.File]::ReadAllText($path, $utf8).Trim().Trim([char]0xFEFF)
  $null = $text | ConvertFrom-Json
  $jsonTexts += $text
}
$manifestLines = @('{', '  "version": 1,', '  "files": [')
for ($i = 0; $i -lt $ordered.Count; $i++) {
  $comma = if ($i -lt $ordered.Count - 1) { ',' } else { '' }
  $manifestLines += ('    "{0}"{1}' -f $ordered[$i], $comma)
}
$manifestLines += '  ]'
$manifestLines += '}'
[System.IO.File]::WriteAllText($manifestPath, (($manifestLines -join "`n") + "`n"), $utf8)
$bundle = "// Auto-generated fallback (file:// / offline). Regenerate: npm run rebuild-manifest`nvar SONGS_BUNDLE = [`n" + ($jsonTexts -join ",`n") + "`n];`n"
[System.IO.File]::WriteAllText($bundlePath, $bundle, $utf8)
Write-Output ("Rebuilt {0} songs" -f $ordered.Count)
