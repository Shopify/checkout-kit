import WebKit

class MockScriptMessage: WKScriptMessage {
    private let mockBody: Any
    private let mockName: String

    override var body: Any {
        mockBody
    }

    override var name: String {
        mockName
    }

    init(name: String = "EmbeddedCheckoutProtocolConsumer", body: Any) {
        mockBody = body
        mockName = name
        super.init()
    }
}
