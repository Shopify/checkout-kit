# frozen_string_literal: true

require 'fileutils'
require 'tmpdir'

require_relative 'temp_workspace'

module PublishChecks
  class GeneratedApp
    attr_reader :path

    def self.create(app_dir:, app_name:, keep_on_success:, replace_existing: false, temp_namespace: [])
      if app_dir && !app_dir.empty?
        new(
          path: File.expand_path(app_dir),
          temp_parent: nil,
          explicit: true,
          keep_on_success: true,
          replace_existing: replace_existing
        )
      else
        temp_parent = TempWorkspace.mktmpdir(
          :apps,
          "#{app_name.downcase.gsub(/[^a-z0-9]+/, '-')}-",
          namespace: temp_namespace
        )
        new(
          path: File.join(temp_parent, app_name),
          temp_parent: temp_parent,
          explicit: false,
          keep_on_success: keep_on_success,
          replace_existing: false
        )
      end
    end

    def initialize(path:, temp_parent:, explicit:, keep_on_success:, replace_existing:)
      @path = path
      @temp_parent = temp_parent
      @explicit = explicit
      @keep_on_success = keep_on_success
      @replace_existing = replace_existing
    end

    def prepare!
      if File.exist?(path)
        if @replace_existing
          FileUtils.rm_rf(path)
        elsif directory_empty?(path)
          FileUtils.rmdir(path)
        else
          raise "#{path} already exists and is not empty. Choose a different APP_DIR or pass --replace-app-dir."
        end
      end

      FileUtils.mkdir_p(File.dirname(path))
    end

    def cleanup(success:)
      if success && !@keep_on_success && !@explicit && @temp_parent && File.directory?(@temp_parent)
        FileUtils.rm_rf(@temp_parent)
        return
      end

      puts "Generated app preserved at: #{path}" if File.directory?(path)
    end

    private

    def directory_empty?(candidate)
      File.directory?(candidate) && (Dir.children(candidate) - %w[.DS_Store]).empty?
    end
  end
end
