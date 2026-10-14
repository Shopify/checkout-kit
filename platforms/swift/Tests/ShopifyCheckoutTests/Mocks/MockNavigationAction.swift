import WebKit

class MockNavigationAction: WKNavigationAction {
    private let mockRequest: URLRequest

    override var request: URLRequest {
        return mockRequest
    }

    init(url: URL) {
        mockRequest = URLRequest(url: url)
        super.init()
    }
}

class MockExternalNavigationAction: WKNavigationAction {
    private let mockRequest: URLRequest
    private let navType: WKNavigationType

    override var request: URLRequest {
        return mockRequest
    }

    override var navigationType: WKNavigationType {
        return navType
    }

    override var targetFrame: WKFrameInfo? {
        return nil
    }

    init(url: URL, navigationType: WKNavigationType = .linkActivated) {
        mockRequest = URLRequest(url: url)
        navType = navigationType
        super.init()
    }
}
