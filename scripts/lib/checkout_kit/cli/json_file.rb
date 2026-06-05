# frozen_string_literal: true

require 'json'

module CheckoutKit
  module CLI
    module JsonFile
      module_function

      def update(path)
        data = JSON.parse(File.read(path))
        yield data
        File.write(path, "#{JSON.pretty_generate(data)}\n")
      end
    end
  end
end
