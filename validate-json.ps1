$ErrorActionPreference = 'Stop'
$songsDir = 'D:\somemusic\songs'
$valid = 0
foreach ($file in (Get-ChildItem -LiteralPath $songsDir -Filter '*.json' | Where-Object { $_.Name -ne 'manifest.json' })) {
  $null = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  $valid++
}
Write-Output ("Valid JSON songs: {0}" -f $valid)
