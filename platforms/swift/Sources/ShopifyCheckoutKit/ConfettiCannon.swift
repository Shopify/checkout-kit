import UIKit

enum ConfettiCannon {
    static func fire(in view: UIView) {
        let layerName = "shopify-confetti"

        view.layer.sublayers?.first(where: { layer in
            layer.name == layerName
        })?.removeFromSuperlayer()

        let config = ShopifyCheckoutKit.configuration.confetti
        guard config.enabled, !config.particles.isEmpty else {
            return
        }

        let frame = view.frame

        let confetti = CAEmitterLayer()
        confetti.name = layerName
        confetti.frame = frame
        confetti.emitterPosition = CGPoint(x: frame.midX, y: frame.minY - 100)
        confetti.emitterSize = CGSize(width: frame.size.width, height: 100)
        confetti.emitterCells = config.particles.map {
            let cell = CAEmitterCell()

            cell.beginTime = 0.1
            cell.birthRate = 20
            cell.contents = $0.cgImage
            cell.emissionRange = CGFloat(Double.pi)
            cell.lifetime = 10
            cell.spin = 4
            cell.spinRange = 8
            cell.velocityRange = 100
            cell.yAcceleration = 150

            return cell
        }
        confetti.emitterShape = .rectangle
        confetti.beginTime = CACurrentMediaTime()

        view.layer.addSublayer(confetti)

        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak confetti] in
            confetti?.birthRate = 0
        }
    }
}
