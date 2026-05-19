protocol MutableCopyable {
    func copy(_ mutate: (inout Self) -> Void) -> Self
}

extension MutableCopyable {
    func copy(_ mutate: (inout Self) -> Void) -> Self {
        var copy = self
        mutate(&copy)
        return copy
    }
}
