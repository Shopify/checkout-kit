const codegenNativeComponent = (_name: string) => {
  const React = require('react');
  return (props: any) =>
    React.createElement('View', {
      ...props,
      testID: props?.testID ?? 'accelerated-checkout-buttons',
    });
};

module.exports = {
  __esModule: true,
  default: codegenNativeComponent,
};

export {};
