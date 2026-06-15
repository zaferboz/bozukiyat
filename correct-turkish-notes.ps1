$ErrorActionPreference = 'Stop'
$songsDir = 'D:\somemusic\songs'
$utf8 = [System.Text.UTF8Encoding]::new($false)

function Note($letter, $octave, $acc, $value) {
  [ordered]@{ letter = $letter; octave = $octave; value = $value; acc = $acc }
}
function Rest($value) { [ordered]@{ rest = $true; value = $value } }

$scaleNotes = @{
  'rast|G' = @(@('G',4,0),@('A',4,0),@('B',4,0),@('C',5,0),@('D',5,0),@('E',5,0),@('F',5,1),@('G',5,0))
  'mahur|G' = @(@('G',4,0),@('A',4,0),@('B',4,0),@('C',5,0),@('D',5,0),@('E',5,0),@('F',5,1),@('G',5,0))
  'mahur|C' = @(@('C',4,0),@('D',4,0),@('E',4,0),@('F',4,0),@('G',4,0),@('A',4,0),@('B',4,0),@('C',5,0))
  'nihavent|A' = @(@('A',4,0),@('B',4,0),@('C',5,0),@('D',5,0),@('E',5,0),@('F',5,1),@('G',5,0),@('A',5,0))
  'kurdi|E' = @(@('E',4,0),@('F',4,0),@('G',4,0),@('A',4,0),@('B',4,0),@('C',5,0),@('D',5,0),@('E',5,0))
  'kurdi|G' = @(@('G',4,0),@('A',4,-1),@('B',4,-1),@('C',5,0),@('D',5,0),@('E',5,-1),@('F',5,0),@('G',5,0))
  'hicaz|D' = @(@('D',4,0),@('E',4,-1),@('F',4,1),@('G',4,0),@('A',4,0),@('B',4,-1),@('C',5,1),@('D',5,0))
  'hicaz|G' = @(@('G',4,0),@('A',4,-1),@('B',4,0),@('C',5,0),@('D',5,0),@('E',5,-1),@('F',5,1),@('G',5,0))
  'ussak|A' = @(@('A',4,0),@('B',4,0),@('C',5,0),@('D',5,0),@('E',5,0),@('F',5,0),@('G',5,0),@('A',5,0))
  'huseyni|A' = @(@('A',4,0),@('B',4,0),@('C',5,0),@('D',5,0),@('E',5,0),@('F',5,0),@('G',5,1),@('A',5,0))
  'segah|A' = @(@('A',4,0),@('B',4,0),@('C',5,1),@('D',5,1),@('E',5,0),@('F',5,1),@('G',5,1),@('A',5,0))
  'saba|D' = @(@('D',4,0),@('E',4,-1),@('F',4,1),@('G',4,0),@('B',4,-1),@('B',4,0),@('C',5,1),@('D',5,0))
  'huzzam|D' = @(@('D',4,0),@('E',4,-1),@('F',4,1),@('G',4,0),@('A',4,0),@('B',4,-1),@('C',5,0),@('D',5,0))
  'buselik|A' = @(@('A',4,0),@('B',4,0),@('C',5,1),@('D',5,1),@('E',5,0),@('F',5,1),@('G',5,1),@('A',5,0))
  'acemasiran|E' = @(@('E',4,0),@('F',4,0),@('G',4,0),@('A',4,0),@('B',4,-1),@('C',5,0),@('D',5,0),@('E',5,0))
  'karcigar|A' = @(@('A',4,0),@('B',4,0),@('C',5,0),@('D',5,0),@('E',5,0),@('F',5,1),@('G',5,1),@('A',5,0))
  'phrygian|E' = @(@('E',4,0),@('F',4,0),@('G',4,0),@('A',4,0),@('B',4,0),@('C',5,0),@('D',5,0),@('E',5,0))
}

$nameByScale = @{
  rast='Rast'; nihavent='Nihavent'; kurdi='Kürdi'; hicaz='Hicaz'; ussak='Uşşak'; huseyni='Hüseyni'; segah='Segah'; saba='Saba'; huzzam='Hüzzam'; mahur='Mahur'; buselik='Buselik'; acemasiran='Acemaşiran'; karcigar='Karcıgar'; phrygian='Phrygian / Kürdi'
}

$degreePattern = @(0,1,2,3, 4,3,2,1, 0,2,4,5, 6,5,4,3, 2,3,4,6, 5,4,2,1, 0,1,2,1)

$files = Get-ChildItem -LiteralPath $songsDir -Filter '*.json' | Where-Object { $_.Name -ne 'manifest.json' }
foreach ($file in $files) {
  $song = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($song.group -ne 'Turkish Makams' -and $song.group -ne 'Azerbaijani') { continue }
  $key = "$($song.scale)|$($song.root)"
  if (-not $scaleNotes.ContainsKey($key)) { throw "No note map for $key in $($file.Name)" }
  $notesForScale = $scaleNotes[$key]
  $melody = @()
  foreach ($degree in $degreePattern) {
    $n = $notesForScale[$degree]
    $melody += Note $n[0] $n[1] $n[2] 4
  }
  $tonic = $notesForScale[0]
  $melody += Note $tonic[0] $tonic[1] $tonic[2] 2
  $melody += Rest 2

  $primary = @($song.tracks)[0]
  $primary.notes = @($melody)
  if (-not $primary.instrument) { $primary.instrument = 'baglama' }

  $tracks = @($primary)
  if (@($song.tracks).Count -gt 1) {
    $bassNotes = @()
    $rootLetter = $notesForScale[0][0]
    $rootAcc = $notesForScale[0][2]
    $fifth = $notesForScale[4]
    for ($i = 0; $i -lt 4; $i++) {
      $bassNotes += Note $rootLetter 2 $rootAcc 1
      $bassNotes += Note $fifth[0] 2 $fifth[2] 1
    }
    $bass = @($song.tracks)[1]
    $bass.instrument = 'bass'
    $bass.notes = @($bassNotes)
    $tracks += $bass
  }
  $song.tracks = @($tracks)

  $scaleName = $song.scale
  $song.title = "$scaleName makam - corrected note study"
  if ($song.group -eq 'Azerbaijani') { $song.title = "Azerbaijani folk - corrected Phrygian/Kurdi study" }

  $json = $song | ConvertTo-Json -Depth 40
  [System.IO.File]::WriteAllText($file.FullName, $json + "`n", $utf8)
}
