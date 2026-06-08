# frozen_string_literal: true

require_relative 'shared'

module PublishChecks
  module PackageVerifier
    module_function

    def verify_installed_tarball(app_dir)
      Shell.section('Checking installed package layout')
      Shell.run('node', '-e', node_script, app_dir, chdir: app_dir, display: 'node <package layout verifier>')
    end

    def node_script
      <<~'JS'
        const fs = require('fs');
        const path = require('path');

        const appDir = process.argv[1];
        const rnPackageRoot = fs.realpathSync(
          path.join(appDir, 'node_modules/@shopify/checkout-kit-react-native'),
        );
        const protocolManifest = path.join(
          rnPackageRoot,
          'node_modules/@shopify/checkout-kit-protocol/package.json',
        );
        if (!fs.existsSync(protocolManifest)) {
          throw new Error(`Bundled protocol package missing at ${protocolManifest}`);
        }
        const resolved = fs.realpathSync(
          require.resolve('@shopify/checkout-kit-protocol', {
            paths: [path.join(rnPackageRoot, 'lib/module')],
          }),
        );
        const expectedPrefix = fs.realpathSync(path.join(rnPackageRoot, 'node_modules'));
        if (!resolved.startsWith(expectedPrefix)) {
          throw new Error(`Protocol resolved outside bundled package: ${resolved}`);
        }
        console.log(`Installed package root: ${rnPackageRoot}`);
        console.log(`Bundled protocol manifest: ${protocolManifest}`);
        console.log(`Runtime resolver from RN package finds: ${resolved}`);
      JS
    end
  end
end
