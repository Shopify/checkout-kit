import 'setimmediate';
import 'react-native-gesture-handler';

import SampleApp from './src/App';
import {name} from './app.json';
import {AppRegistry, LogBox} from 'react-native';

LogBox.ignoreLogs([
  "Component 'RCTImageView' re-registered bubbling event 'topError' as a direct event",
]);

AppRegistry.registerComponent(name, () => SampleApp);
