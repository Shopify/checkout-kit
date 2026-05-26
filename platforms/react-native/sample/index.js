import {install} from 'react-native-quick-crypto';
install();

import 'setimmediate';
import 'react-native-gesture-handler';

import SampleApp from './src/App';
import {name} from './app.json';
import {AppRegistry, LogBox} from 'react-native';

/**
 * Suppress the RCTImageView topError warning
 * This is a known React Native issue that doesn't affect functionality
 */
LogBox.ignoreLogs([
  "Component 'RCTImageView' re-registered bubbling event 'topError' as a direct event",
]);

AppRegistry.registerComponent(name, () => SampleApp);
