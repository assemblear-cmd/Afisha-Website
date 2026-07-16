// Renders the DondeGO app icon: burgundy theater-curtain folds with a white
// calligraphic D. Pure CoreGraphics/CoreText so it runs headless, and the
// output PNG has no alpha channel (App Store icon requirement).
// Run: swift render-appicon.swift <output.png>
import Foundation
import CoreGraphics
import CoreText
import ImageIO

let side = 1024
let args = CommandLine.arguments
let outputPath = args.count > 1 ? args[1] : "AppIcon1024.png"

let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
guard let ctx = CGContext(
    data: nil, width: side, height: side, bitsPerComponent: 8, bytesPerRow: 0,
    space: colorSpace, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
) else { fatalError("No CGContext") }

func rgb(_ hex: UInt32, alpha: CGFloat = 1) -> CGColor {
    CGColor(
        colorSpace: colorSpace,
        components: [
            CGFloat((hex >> 16) & 0xFF) / 255.0,
            CGFloat((hex >> 8) & 0xFF) / 255.0,
            CGFloat(hex & 0xFF) / 255.0,
            alpha,
        ]
    )!
}

let light = rgb(0x8C1528)
let mid = rgb(0x6B0E1D)
let dark = rgb(0x4A0812)

ctx.setFillColor(dark)
ctx.fill(CGRect(x: 0, y: 0, width: side, height: side))

// Curtain folds: vertical stripes shaded dark → light → dark.
let foldCount = 8
let foldWidth = CGFloat(side) / CGFloat(foldCount)
let foldGradient = CGGradient(
    colorsSpace: colorSpace,
    colors: [dark, light, mid, dark] as CFArray,
    locations: [0.0, 0.45, 0.7, 1.0]
)!
for i in 0..<foldCount {
    let stripe = CGRect(x: CGFloat(i) * foldWidth, y: 0, width: foldWidth, height: CGFloat(side))
    ctx.saveGState()
    ctx.clip(to: stripe)
    ctx.drawLinearGradient(
        foldGradient,
        start: CGPoint(x: stripe.minX, y: 0),
        end: CGPoint(x: stripe.maxX, y: 0),
        options: []
    )
    ctx.restoreGState()
}

// Top/bottom vignette for depth.
let vignette = CGGradient(
    colorsSpace: colorSpace,
    colors: [rgb(0x000000, alpha: 0.35), rgb(0x000000, alpha: 0.0), rgb(0x000000, alpha: 0.35)] as CFArray,
    locations: [0.0, 0.5, 1.0]
)!
ctx.drawLinearGradient(
    vignette,
    start: CGPoint(x: 0, y: 0),
    end: CGPoint(x: 0, y: side),
    options: []
)

// White calligraphic D, centered by glyph path bounds.
let fontSize: CGFloat = 700
var font = CTFontCreateWithName("Georgia-BoldItalic" as CFString, fontSize, nil)
if !(CTFontCopyPostScriptName(font) as String).hasPrefix("Georgia") {
    font = CTFontCreateWithName("Georgia-Bold" as CFString, fontSize, nil)
}
let attributes: [CFString: Any] = [
    kCTFontAttributeName: font,
    kCTForegroundColorAttributeName: rgb(0xFFFFFF),
]
let attributed = CFAttributedStringCreate(nil, "D" as CFString, attributes as CFDictionary)!
let line = CTLineCreateWithAttributedString(attributed)
let glyphBounds = CTLineGetBoundsWithOptions(line, [.useGlyphPathBounds])

ctx.saveGState()
ctx.setShadow(
    offset: CGSize(width: 0, height: -14), blur: 36,
    color: rgb(0x000000, alpha: 0.4)
)
let originX = (CGFloat(side) - glyphBounds.width) / 2 - glyphBounds.minX
let originY = (CGFloat(side) - glyphBounds.height) / 2 - glyphBounds.minY
ctx.textPosition = CGPoint(x: originX, y: originY)
CTLineDraw(line, ctx)
ctx.restoreGState()

guard let image = ctx.makeImage() else { fatalError("makeImage failed") }
let url = URL(fileURLWithPath: outputPath) as CFURL
guard let destination = CGImageDestinationCreateWithURL(url, "public.png" as CFString, 1, nil) else {
    fatalError("No destination")
}
CGImageDestinationAddImage(destination, image, nil)
guard CGImageDestinationFinalize(destination) else { fatalError("PNG write failed") }
print("Wrote \(outputPath)")
