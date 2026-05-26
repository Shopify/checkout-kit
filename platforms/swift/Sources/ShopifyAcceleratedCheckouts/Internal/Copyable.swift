protocol Copyable {
    init(copy: Self)
}

extension Copyable {
    func copy() -> Self {
        return Self(copy: self)
    }
}
