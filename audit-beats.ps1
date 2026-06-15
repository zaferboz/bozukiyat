$ErrorActionPreference = 'Stop'
$songsDir = 'D:\somemusic\songs'
$files = Get-ChildItem -LiteralPath $songsDir -Filter '*.json' | Where-Object { $_.Name -ne 'manifest.json' }
$bad = 0
foreach ($file in $files) {
  $song = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  $num = if ($song.timeSig -and $song.timeSig.num) { [int]$song.timeSig.num } else { 4 }
  foreach ($track in @($song.tracks)) {
    $beats = 0.0
    foreach ($note in @($track.notes)) {
      if ($note.value) { $beats += 4.0 / [double]$note.value }
    }
    $bars = $beats / $num
    $ok = [math]::Abs($bars - [math]::Round($bars)) -lt 0.0001
    if (-not $ok) {
      Write-Output ("BAD: {0} | {1} | beats={2} | bars={3}" -f $file.Name, $track.instrument, $beats, $bars)
      $bad++
    }
  }
}
Write-Output ("Beat audit errors: {0}" -f $bad)
