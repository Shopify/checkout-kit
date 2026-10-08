// Local oxlint JS plugin for protocol test conventions.
export default {
  meta: {name: 'protocol'},
  rules: {
    'no-optional-chaining-in-tests': {
      create(context) {
        return {
          ChainExpression(node) {
            context.report({
              node,
              message:
                'Use a non-null assertion (!.) instead of optional chaining (?.) in tests so a missing value fails the test loudly.',
            });
          },
        };
      },
    },
  },
};
