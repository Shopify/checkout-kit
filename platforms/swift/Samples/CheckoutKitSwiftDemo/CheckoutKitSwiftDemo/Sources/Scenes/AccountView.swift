import AuthenticationServices
import SwiftUI
import UIKit

struct AccountView: View {
    @ObservedObject var accountManager = CustomerAccountManager.shared
    @ObservedObject private var e2eSignInRequest = E2ESignInRequest.shared
    @State private var errorMessage = ""
    @State private var showingError = false

    var body: some View {
        NavigationView {
            Group {
                if accountManager.isAuthenticated {
                    AuthenticatedAccountView(logout: logout)
                } else {
                    UnauthenticatedAccountView(signIn: signIn)
                }
            }
            .navigationTitle(accountManager.isAuthenticated ? "Account" : "Sign In")
        }
        .alert("Customer Account", isPresented: $showingError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
        .onReceive(e2eSignInRequest.$isPending) { isPending in
            guard isPending else { return }

            signIn()
            e2eSignInRequest.fulfil()
        }
    }

    private func signIn() {
        guard let presentationAnchor = UIApplication.shared.customerAccountPresentationAnchor else {
            presentError("Unable to find a window for sign in.")
            return
        }

        Task {
            do {
                try await accountManager.signIn(from: presentationAnchor)
            } catch CustomerAccountError.authorizationCancelled {
                return
            } catch {
                presentError(error.localizedDescription)
            }
        }
    }

    private func logout() {
        Task {
            await accountManager.logout()
        }
    }

    private func presentError(_ message: String) {
        errorMessage = message
        showingError = true
    }
}

extension UIApplication {
    fileprivate var customerAccountPresentationAnchor: ASPresentationAnchor? {
        connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }?
            .keyWindow
    }
}

struct AuthenticatedAccountView: View {
    @ObservedObject var accountManager = CustomerAccountManager.shared
    let logout: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "person.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(Color(ColorPalette.primaryColor))

            VStack(spacing: 8) {
                Text("Signed In")
                    .font(.title2)
                    .fontWeight(.semibold)

                if let email = accountManager.customerEmail {
                    Text(email)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Text("Your checkout will be pre-filled with your account info.")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
                    .padding(.top, 8)
            }

            Spacer()

            Button(action: logout) {
                HStack {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                    Text(accountManager.isLoading ? "Signing Out…" : "Sign Out")
                }
                .foregroundColor(.red)
                .frame(maxWidth: .infinity)
                .padding()
            }
            .disabled(accountManager.isLoading)
            .padding(.bottom, 32)
        }
        .background(Color(.systemGroupedBackground))
        .accessibilityIdentifier(E2ETestIds.Account.signedInView)
    }
}

struct UnauthenticatedAccountView: View {
    @ObservedObject var accountManager = CustomerAccountManager.shared
    let signIn: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "person.circle")
                .font(.system(size: 80))
                .foregroundColor(Color(ColorPalette.primaryColor))

            VStack(spacing: 8) {
                Text("Sign in to your account")
                    .font(.title2)
                    .fontWeight(.semibold)

                Text("Access your orders, saved addresses, and checkout faster.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            Button(action: signIn) {
                Text(accountManager.isLoading ? "Signing In…" : "Sign In")
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(ColorPalette.primaryColor))
                    .cornerRadius(12)
            }
            .disabled(accountManager.isLoading)
            .padding(.horizontal, 32)

            Spacer()

            VStack(spacing: 12) {
                BenefitRow(icon: "clock.arrow.circlepath", text: "Faster checkout with saved info")
                BenefitRow(icon: "shippingbox", text: "Track your orders easily")
                BenefitRow(icon: "heart", text: "Save items to your wishlist")
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 32)
        }
        .background(Color(.systemGroupedBackground))
    }
}

struct BenefitRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(Color(ColorPalette.primaryColor))
                .frame(width: 24)
            Text(text)
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
        }
    }
}

#Preview {
    AccountView()
}
