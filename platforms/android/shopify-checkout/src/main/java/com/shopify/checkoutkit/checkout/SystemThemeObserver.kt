package com.shopify.checkoutkit.checkout
import android.content.Context
import android.content.ContextWrapper
import android.content.res.Configuration
import android.content.res.Configuration.UI_MODE_NIGHT_MASK
import android.content.res.Configuration.UI_MODE_NIGHT_YES
import android.view.View
import androidx.core.content.OnConfigurationChangedProvider
import androidx.core.util.Consumer

/**
 * Reports the system theme of [view] to [onThemeChecked] when the host handles `uiMode` changes itself, so
 * checkout stays open.
 *
 * It listens for configuration changes on the host activity, because an `AppCompatActivity` that handles
 * `uiMode` itself does not report night mode changes to its views through `View.onConfigurationChanged`.
 * The owning view forwards its own `onConfigurationChanged` calls to [scheduleCheck] for other hosts.
 */
internal class SystemThemeObserver(
    private val view: View,
    private val onThemeChecked: (isDarkTheme: Boolean) -> Unit,
) {
    private var provider: OnConfigurationChangedProvider? = null
    private var released = false
    private val configurationChangedListener = Consumer<Configuration> { scheduleCheck() }
    private val themeCheck = Runnable { checkNow() }

    fun bind() {
        val nextProvider = if (released) null else view.context.findConfigurationChangedProvider()
        if (nextProvider == null || provider === nextProvider) return

        unbind()
        provider = nextProvider
        nextProvider.addOnConfigurationChangedListener(configurationChangedListener)
    }

    fun unbind() {
        provider?.removeOnConfigurationChangedListener(configurationChangedListener)
        provider = null
    }

    /**
     * Checks the theme after the current configuration callbacks finish. Hosts can report a change before
     * their resources use it: an `AppCompatActivity` that handles `uiMode` updates its night mode resources
     * only after it notifies its configuration listeners.
     */
    fun scheduleCheck() {
        if (released) return

        view.removeCallbacks(themeCheck)
        view.post(themeCheck)
    }

    fun checkNow() {
        if (released) return

        onThemeChecked(view.context.isDarkTheme())
    }

    /**
     * Stops all observation permanently. Later calls do nothing.
     */
    fun release() {
        released = true
        unbind()
        view.removeCallbacks(themeCheck)
    }
}

internal fun Context.isDarkTheme(): Boolean =
    resources.configuration.uiMode and UI_MODE_NIGHT_MASK == UI_MODE_NIGHT_YES

/**
 * Finds the activity, or another host, that reports configuration changes behind this context's wrappers.
 */
private fun Context.findConfigurationChangedProvider(): OnConfigurationChangedProvider? {
    var current: Context? = this
    while (current != null) {
        if (current is OnConfigurationChangedProvider) return current
        current = (current as? ContextWrapper)?.baseContext
    }
    return null
}
