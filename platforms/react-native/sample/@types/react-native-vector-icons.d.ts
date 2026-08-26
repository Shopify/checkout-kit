declare module 'react-native-vector-icons/Entypo' {
  import type {ComponentType} from 'react';
  import type {TextProps} from 'react-native';

  type EntypoIconProps = TextProps & {
    name: string;
    size?: number;
    color?: string;
  };

  const EntypoIcon: ComponentType<EntypoIconProps>;
  export default EntypoIcon;
}
