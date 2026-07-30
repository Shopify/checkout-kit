import {readFileSync} from 'fs';
import {join} from 'path';
import {CONTROL_LINK_HOST} from '../controlLink';

const APP_SCHEME = 'com.shopify.checkoutkit.reactnativedemo';
const TEMPLATE_PATH = join(
  __dirname,
  '../../../android/app/src/main/AndroidManifest.template.xml',
);

describe('AndroidManifest.template.xml', () => {
  it('registers the control link host that the parser accepts', () => {
    const template = readFileSync(TEMPLATE_PATH, 'utf8');
    const filter = new RegExp(
      `<data android:scheme="${APP_SCHEME}" android:host="([^"]+)" />`,
    );

    expect(template.match(filter)?.[1]).toBe(CONTROL_LINK_HOST);
  });
});
