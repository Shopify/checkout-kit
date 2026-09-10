class CodeQLCanaryController < ActionController::Base
  def create
    file = params[:file]
    system("cat #{file}")
  end
end
