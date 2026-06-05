# frozen_string_literal: true

module CheckoutKit
  module CLI
    # Minimal reader for KEY=value files such as .env / .dev.env. Comments, blank
    # lines, `export ` prefixes, and surrounding quotes are handled; everything
    # else is left untouched.
    module Dotenv
      module_function

      def read(path)
        return {} unless File.file?(path)

        File.readlines(path, chomp: true).each_with_object({}) do |line, values|
          key, value = parse_line(line)
          values[key] = value if key
        end
      end

      def parse_line(line)
        stripped = line.strip
        return nil if stripped.empty? || stripped.start_with?('#')

        stripped = stripped.delete_prefix('export ').strip
        key, value = stripped.split('=', 2)
        return nil unless key && value

        key = key.strip
        return nil unless key.match?(/\A[A-Za-z_][A-Za-z0-9_]*\z/)

        [key, unquote(value.strip)]
      end

      def unquote(value)
        return value[1...-1] if quoted?(value, '"') || quoted?(value, "'")

        value
      end

      def quoted?(value, char)
        value.length >= 2 && value.start_with?(char) && value.end_with?(char)
      end
    end
  end
end
