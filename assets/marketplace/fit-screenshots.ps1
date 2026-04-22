# Fit raw screenshots onto a 1366x768 white canvas (centered, proportional).
# Run:  powershell -File fit-screenshots.ps1

Add-Type -AssemblyName System.Drawing

$dir = $PSScriptRoot
$pairs = @(
    @{ Src = 'screenshot-raw-1.png'; Dst = 'screenshot-1.png' },
    @{ Src = 'screenshot-raw-2.png'; Dst = 'screenshot-2.png' }
)

$TargetW = 1366
$TargetH = 768

foreach ($p in $pairs) {
    $srcPath = Join-Path $dir $p.Src
    $dstPath = Join-Path $dir $p.Dst
    if (-not (Test-Path $srcPath)) {
        Write-Warning "Missing: $srcPath"
        continue
    }

    $raw = [System.Drawing.Image]::FromFile($srcPath)
    try {
        # Scale proportionally to fit within (1366x768). If the raw image is
        # smaller than the target in both dimensions, we keep it at native size.
        $scale = [Math]::Min($TargetW / $raw.Width, $TargetH / $raw.Height)
        if ($scale -gt 1) { $scale = 1 }
        $newW = [int][Math]::Round($raw.Width  * $scale)
        $newH = [int][Math]::Round($raw.Height * $scale)
        $offsetX = [int][Math]::Floor(($TargetW - $newW) / 2)
        $offsetY = [int][Math]::Floor(($TargetH - $newH) / 2)

        $canvas = New-Object System.Drawing.Bitmap $TargetW, $TargetH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($canvas)
        try {
            $g.Clear([System.Drawing.Color]::White)
            $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
            $rect = New-Object System.Drawing.Rectangle $offsetX, $offsetY, $newW, $newH
            $g.DrawImage($raw, $rect)
        } finally { $g.Dispose() }

        $canvas.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $canvas.Dispose()

        $sizeKB = [math]::Round((Get-Item $dstPath).Length / 1KB, 1)
        "{0,-20} {1,5}x{2,-5}  ->  {3,-20} {4}x{5}  ({6} KB)" -f $p.Src, $raw.Width, $raw.Height, $p.Dst, $TargetW, $TargetH, $sizeKB
    } finally { $raw.Dispose() }
}
