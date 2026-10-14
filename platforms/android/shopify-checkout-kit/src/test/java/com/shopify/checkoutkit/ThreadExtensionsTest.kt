package com.shopify.checkoutkit

import android.os.Looper
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.LooperMode
import org.robolectric.shadows.ShadowLooper

@RunWith(RobolectricTestRunner::class)
@LooperMode(LooperMode.Mode.PAUSED)
class ThreadExtensionsTest {

    @Test
    fun `onMainThread executes immediately when already on main thread`() {
        var executed = false
        onMainThread {
            executed = true
            assertThat(Looper.myLooper()).isEqualTo(Looper.getMainLooper())
        }
        assertThat(executed).isTrue()
    }

    @Test
    fun `onMainThread posts to main looper when called from background thread`() {
        var executedOnMainThread: Boolean? = null
        val shadowLooper = ShadowLooper.shadowMainLooper()

        // Verify no tasks are initially queued
        assertThat(shadowLooper.isIdle).isTrue()

        // Create background thread and call onMainThread from it
        val thread = Thread {
            onMainThread {
                executedOnMainThread = Looper.myLooper() == Looper.getMainLooper()
            }
        }
        thread.start()
        thread.join() // Wait for thread to complete

        // Task should be queued on main looper but not yet executed
        assertThat(shadowLooper.isIdle).isFalse()
        assertThat(executedOnMainThread).isNull()

        // Run pending tasks on main looper
        shadowLooper.runToEndOfTasks()

        // Now callback should have executed on main thread
        assertThat(executedOnMainThread).isNotNull()
        assertThat(executedOnMainThread).isTrue()
        assertThat(shadowLooper.isIdle).isTrue()
    }
}
