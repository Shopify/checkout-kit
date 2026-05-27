import {codegenNativeComponent, type ViewProps} from 'react-native';
import type {
  BubblingEventHandler,
  DirectEventHandler,
  Double,
  Float,
  // eslint-disable-next-line @react-native/no-deep-imports -- codegen parser requires these type names to be imported directly (not via aliases) so it can match them statically during AST traversal
} from 'react-native/Libraries/Types/CodegenTypes';

type FailEvent = Readonly<{
  __typename: string;
  message: string;
  code?: string;
}>;

type RenderStateChangeEvent = Readonly<{
  state: string;
  reason?: string;
}>;

type ClickLinkEvent = Readonly<{url: string}>;
type DispatchEvent = Readonly<{value: string}>;
type SizeChangeEvent = Readonly<{height: Double}>;

type CheckoutIdentifierSpec = Readonly<{
  cartId?: string;
  variantId?: string;
  quantity?: Double;
}>;

interface NativeProps extends ViewProps {
  checkoutIdentifier: CheckoutIdentifierSpec;
  cornerRadius?: Float;
  wallets?: ReadonlyArray<string>;
  applePayLabel?: string;
  applePayStyle?: string;
  onFail?: BubblingEventHandler<FailEvent>;
  onCancel?: BubblingEventHandler<null>;
  onRenderStateChange?: BubblingEventHandler<RenderStateChangeEvent>;
  onClickLink?: BubblingEventHandler<ClickLinkEvent>;
  onDispatch?: DirectEventHandler<DispatchEvent>;
  onSizeChange?: DirectEventHandler<SizeChangeEvent>;
}

export default codegenNativeComponent<NativeProps>(
  'RCTAcceleratedCheckoutButtons',
);
