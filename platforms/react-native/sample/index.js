import 'setimmediate';

import {registerRootComponent} from 'expo';
import {LogBox} from 'react-native';
import SampleApp from './src/App';

LogBox.ignoreLogs([
  "Component 'RCTImageView' re-registered bubbling event 'topError' as a direct event",
]);

registerRootComponent(SampleApp);
