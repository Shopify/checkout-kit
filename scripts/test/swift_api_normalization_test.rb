# frozen_string_literal: true

require "minitest/autorun"
require "fileutils"
require "json"
require "open3"
require "rbconfig"
require "tmpdir"

class SwiftApiNormalizationTest < Minitest::Test
  SCRIPTS = File.expand_path("../../platforms/swift/Scripts", __dir__)

  def test_normalizes_nested_declarations_from_separate_extensions
    original = api_tree
    reordered = api_tree
    reordered["ABIRoot"]["children"].reverse!
    namespace(reordered)["children"].reverse!
    payload(reordered)["children"].reverse!

    assert_equal normalize(original), normalize(reordered)
    assert_equal normalize(original), normalize(JSON.parse(normalize(original)))
  end

  def test_preserves_stored_property_order
    assert_order_matters do |tree|
      payload(tree)["children"] = %w[first second].map do |name|
        declaration("Var", name, "hasStorage" => true)
      end
      payload(tree)["children"]
    end
  end

  def test_preserves_enum_case_order
    assert_order_matters do |tree|
      namespace(tree)["children"] = %w[first second].map do |name|
        declaration("Var", name, "declKind" => "EnumElement")
      end
      namespace(tree)["children"]
    end
  end

  def test_preserves_return_and_parameter_type_order
    assert_order_matters do |tree|
      method(tree)["children"] = %w[Void String Int].map { |name| {"kind" => "TypeNominal", "name" => name} }
    end
  end

  def test_preserves_tuple_and_generic_argument_order
    assert_order_matters do |tree|
      method(tree)["children"] = [{"kind" => "TypeNominal", "name" => "Pair", "children" => [
        {"kind" => "TypeNominal", "name" => "String"},
        {"kind" => "TypeNominal", "name" => "Int"},
      ]}]
      method(tree)["children"][0]["children"]
    end
  end

  def test_preserves_metadata_array_order
    assert_order_matters do |tree|
      payload(tree)["conformances"] = [{"name" => "Encodable"}, {"name" => "Decodable"}]
    end
  end

  def test_preserves_unknown_node_order
    assert_order_matters do |tree|
      payload(tree)["children"] = %w[first second].map { |name| declaration("FutureKind", name) }
    end
  end

  def test_detects_removals_and_signature_changes
    original = api_tree
    removed = api_tree
    payload(removed)["children"].delete(method(removed))
    refute_equal normalize(original), normalize(removed)

    changed = api_tree
    method(changed)["throwing"] = true
    refute_equal normalize(original), normalize(changed)
  end

  def test_dump_and_check_share_canonical_output_and_reject_api_drift
    Dir.mktmpdir("swift-api-test") do |root|
      script_dir = File.join(root, "platforms/swift/Scripts")
      FileUtils.mkdir_p(script_dir)
      FileUtils.cp([File.join(SCRIPTS, "api"), File.join(SCRIPTS, "normalize-api.jq")], script_dir)
      File.write(File.join(root, "Package.swift"), "// Test package\n")
      bin = File.join(root, "bin")
      FileUtils.mkdir_p(bin)
      write_executable(File.join(bin, "xcodebuild"), <<~'SH')
        #!/bin/sh
        case " $* " in
          *" -disableAutomaticPackageResolution "*) exit 0 ;;
          *) echo "Expected committed package resolution" >&2; exit 1 ;;
        esac
      SH
      write_executable(File.join(bin, "xcbeautify"), "#!/bin/sh\ncat\n")
      write_executable(File.join(bin, "xcrun"), <<~RUBY)
        #!#{RbConfig.ruby}
        if ARGV.include?("--show-sdk-path")
          puts "/test-sdk"
        elsif ARGV.include?("-dump-sdk")
          File.write(ARGV[ARGV.index("-o") + 1], File.read(ENV.fetch("SWIFT_API_TEST_INPUT")))
        elsif ARGV.include?("-diagnose-sdk")
          puts "API diagnosis invoked"
        else
          abort "Unexpected xcrun arguments"
        end
      RUBY

      input = File.join(root, "raw.json")
      File.write(input, JSON.generate(api_tree))
      env = {"PATH" => "#{bin}:#{ENV.fetch('PATH')}", "SWIFT_API_TEST_INPUT" => input}
      run_api(env, script_dir, "dump")
      baselines = Dir.glob(File.join(root, "platforms/swift/api/*.json"))
      assert_equal 3, baselines.size
      baselines.each { |file| assert_equal normalize(api_tree), File.read(file) }
      before = baselines.to_h { |file| [file, File.read(file)] }

      reordered = api_tree
      reordered["ABIRoot"]["children"].reverse!
      namespace(reordered)["children"].reverse!
      payload(reordered)["children"].reverse!
      File.write(input, JSON.generate(reordered))
      run_api(env, script_dir, "check")
      run_api(env, script_dir, "dump")
      assert_equal before, baselines.to_h { |file| [file, File.read(file)] }

      method(reordered)["throwing"] = true
      File.write(input, JSON.generate(reordered))
      output, status = Open3.capture2e(env, "bash", File.join(script_dir, "api"), "check")
      refute status.success?, output
      assert_includes output, "Public Swift API drift detected"
      assert_includes output, "API diagnosis invoked"
    end
  end

  private

  def declaration(kind, name, extra = {})
    {"kind" => kind, "printedName" => name, "usr" => "test:#{name}"}.merge(extra)
  end

  def api_tree
    {"ABIRoot" => {"kind" => "Root", "children" => [
      declaration("Var", "version"),
      declaration("TypeDecl", "Namespace", "declKind" => "Enum", "children" => [
        declaration("Var", "events"),
        declaration("TypeDecl", "Payload", "declKind" => "Struct", "children" => [
          declaration("Function", "success()"),
          declaration("Var", "parsedURL"),
          declaration("Constructor", "init(data:)"),
          declaration("Constructor", "init(data:)", "usr" => "test:overload"),
        ]),
      ]),
    ]}}
  end

  def namespace(tree)
    tree["ABIRoot"]["children"].find { |node| node["printedName"] == "Namespace" }
  end

  def payload(tree)
    namespace(tree)["children"].find { |node| node["printedName"] == "Payload" }
  end

  def method(tree)
    payload(tree)["children"].find { |node| node["kind"] == "Function" }
  end

  def normalize(tree)
    output, error, status = Open3.capture3("jq", "-f", File.join(SCRIPTS, "normalize-api.jq"), stdin_data: JSON.generate(tree))
    assert status.success?, error
    output
  end

  def assert_order_matters
    tree = api_tree
    ordered = yield tree
    before = normalize(tree)
    ordered.reverse!
    refute_equal before, normalize(tree)
  end

  def write_executable(path, content)
    File.write(path, content)
    FileUtils.chmod(0o755, path)
  end

  def run_api(env, script_dir, command)
    output, status = Open3.capture2e(env, "bash", File.join(script_dir, "api"), command)
    assert status.success?, output
  end
end
