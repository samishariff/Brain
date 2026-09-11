import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers
// crop-png <in.png> <out.png> <x> <y> <w> <h> — pixel-exact crop, no resampling, no colour change.
let a = CommandLine.arguments
guard a.count == 7, let x = Int(a[3]), let y = Int(a[4]), let w = Int(a[5]), let h = Int(a[6]),
      let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(src, 0, nil) else { print("usage: crop-png in out x y w h"); exit(2) }
guard x >= 0, y >= 0, x + w <= image.width, y + h <= image.height,
      let cropped = image.cropping(to: CGRect(x: x, y: y, width: w, height: h)),
      let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[2]) as CFURL, UTType.png.identifier as CFString, 1, nil) else { print("crop out of bounds"); exit(1) }
CGImageDestinationAddImage(dest, cropped, nil)
guard CGImageDestinationFinalize(dest) else { print("write failed"); exit(1) }
print("\(a[2]) \(cropped.width)x\(cropped.height)")
