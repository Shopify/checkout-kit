import {
  codegenNativeComponent,
  type HostComponent,
  type ViewProps,
} from 'react-native';
import type {
  BubblingEventHandler,
  DirectEventHandler,
  Double,
  Float,
} from './codegen-types';

type RenderStateChangeEvent = Readonly<{
  state: string;
  reason?: string;
}>;

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
  linkAction?: string;
  onDismiss?: DirectEventHandler<null>;
  onRenderStateChange?: BubblingEventHandler<RenderStateChangeEvent>;
  onDispatch?: DirectEventHandler<DispatchEvent>;
  onSizeChange?: DirectEventHandler<SizeChangeEvent>;
}

export default codegenNativeComponent<NativeProps>(
  'RCTAcceleratedCheckoutButtons',
) as HostComponent<NativeProps>;
