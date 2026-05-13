import UIKit

@MainActor
class ProgressBarView: UIView {
    lazy var progressBar: UIProgressView = {
        let progressBar = UIProgressView(progressViewStyle: .bar)
        progressBar.setProgress(0.0, animated: false)
        progressBar.translatesAutoresizingMaskIntoConstraints = false
        return progressBar
    }()

    private var progressAnimation: UIViewPropertyAnimator?

    override init(frame: CGRect) {
        super.init(frame: frame)

        addSubview(progressBar)

        NSLayoutConstraint.activate([
            progressBar.topAnchor.constraint(equalTo: topAnchor),
            progressBar.heightAnchor.constraint(equalToConstant: 1)
        ])

        progressBar.tintColor = ShopifyCheckoutKit.configuration.tintColor
    }

    override func didMoveToSuperview() {
        super.didMoveToSuperview()

        if let superview {
            progressBar.leadingAnchor.constraint(equalTo: superview.safeAreaLayoutGuide.leadingAnchor).isActive = true
            progressBar.trailingAnchor.constraint(equalTo: superview.safeAreaLayoutGuide.trailingAnchor).isActive = true
        }
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func setProgress(_ progress: Float, animated: Bool = false) {
        if progress > progressBar.progress {
            progressBar.setProgress(progress, animated: animated)
        }
    }

    func startAnimating() {
        alpha = 1
        isHidden = false
    }

    func stopAnimating() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            UIView.animate(withDuration: 0.2, animations: {
                self.alpha = 0
            }, completion: { _ in
                self.isHidden = true
                self.alpha = 1
                self.progressBar.setProgress(0.0, animated: false)
            })
        }
    }
}
