$ErrorActionPreference = 'Stop'
$songsDir = 'D:\somemusic\songs'
$pc = @{ C=0; D=2; E=4; F=5; G=7; A=9; B=11 }
$scaleIntervals = @{
  rast=@(0,2,4,5,7,9,11); nihavent=@(0,2,3,5,7,9,10); kurdi=@(0,1,3,5,7,8,10); hicaz=@(0,1,4,5,7,8,11); ussak=@(0,2,3,5,7,8,10); huseyni=@(0,2,3,5,7,8,11); segah=@(0,2,4,6,7,9,11); saba=@(0,1,4,5,8,9,11); huzzam=@(0,1,4,5,7,8,10); mahur=@(0,2,4,5,7,9,11); buselik=@(0,2,4,6,7,9,11); acemasiran=@(0,1,3,5,6,8,10); karcigar=@(0,2,3,5,7,9,11); phrygian=@(0,1,3,5,7,8,10)
}
$errors = 0
foreach ($file in (Get-ChildItem -LiteralPath $songsDir -Filter '*.json' | Where-Object { $_.Name -ne 'manifest.json' })) {
  $song = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($song.group -ne 'Turkish Makams' -and $song.group -ne 'Azerbaijani') { continue }
  $root = ($pc[$song.root]) % 12
  $allowed = @{}
  foreach ($i in $scaleIntervals[$song.scale]) { $allowed[(($root + $i) % 12)] = $true }
  foreach ($track in @($song.tracks)) {
    foreach ($note in @($track.notes)) {
      if ($note.rest -or $note.drum) { continue }
      $pitch = ($pc[$note.letter] + [int]$note.acc) % 12
      if ($pitch -lt 0) { $pitch += 12 }
      if (-not $allowed.ContainsKey($pitch)) {
        Write-Output ("OUT: {0} scale={1} root={2} note={3}{4}" -f $file.Name,$song.scale,$song.root,$note.letter,$note.acc)
        $errors++
      }
    }
  }
}
Write-Output ("Scale audit errors: {0}" -f $errors)
