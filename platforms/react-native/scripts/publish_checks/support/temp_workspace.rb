# frozen_string_literal: true

require 'fileutils'
require 'tmpdir'

module PublishChecks
  module TempWorkspace
    DEFAULT_ROOT_NAME = 'ck-rn-release'

    module_function

    def root
      File.expand_path(ENV.fetch('VALIDATE_RELEASE_TMP_DIR', File.join('/tmp', DEFAULT_ROOT_NAME)))
    end

    def apps_dir
      File.join(root, 'apps')
    end

    def installs_dir
      File.join(root, 'installs')
    end

    def logs_dir
      File.join(root, 'logs')
    end

    def default_pack_dir(*namespace)
      File.join(root, 'pack', *namespace.compact.map(&:to_s))
    end

    def mktmpdir(kind, prefix, namespace: [])
      parent = case kind
               when :apps then apps_dir
               when :installs then installs_dir
               when :logs then logs_dir
               else File.join(root, kind.to_s)
               end
      parent = File.join(parent, *Array(namespace).compact.map(&:to_s))
      FileUtils.mkdir_p(parent)
      Dir.mktmpdir(prefix, parent)
    end

    def clean!(dry_run: false)
      return false unless File.exist?(root)

      if dry_run
        puts "Would remove: #{root}"
      else
        FileUtils.rm_rf(root)
        puts "Removed: #{root}"
      end
      true
    end
  end
end
