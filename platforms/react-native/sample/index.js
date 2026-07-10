import {install} from 'react-native-quick-crypto';
install();

import 'setimmediate';
import 'react-native-gesture-handler';

import SampleApp from './src/App';
import {name} from './app.json';
import {AppRegistry, LogBox} from 'react-native';
import Config from 'react-native-config';

/**
 * Suppress the RCTImageView topError warning
 * This is a known React Native issue that doesn't affect functionality
 */
if (Config.CHECKOUT_KIT_E2E_DISABLE_LOGBOX === '1') {
  LogBox.ignoreAllLogs();
} else {
  LogBox.ignoreLogs([
    "Component 'RCTImageView' re-registered bubbling event 'topError' as a direct event",
  ]);
}

AppRegistry.registerComponent(name, () => SampleApp);
