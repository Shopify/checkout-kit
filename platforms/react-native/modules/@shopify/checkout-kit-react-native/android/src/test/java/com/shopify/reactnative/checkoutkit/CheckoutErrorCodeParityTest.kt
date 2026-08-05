package com.shopify.reactnative.checkoutkit

import com.shopify.checkoutkit.CheckoutErrorCode
import java.io.File
import java.io.IOException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class CheckoutErrorCodeParityTest {

    @Test
    fun `every android error code is declared in the JavaScript enum`() {
        val exportedCodes = exportedWireValues()

        assertThat(exportedCodes)
            .withFailMessage("%s exports no CheckoutErrorCode members", RELATIVE_ERRORS_PATH)
            .isNotEmpty()

        val missingCodes = CheckoutErrorCode.values()
            .map { it.name.lowercase() }
            .filterNot(exportedCodes::contains)

        assertThat(missingCodes)
            .withFailMessage(
                "%s omits %s. Add each code to CheckoutErrorCode there.",
                RELATIVE_ERRORS_PATH,
                missingCodes,
            )
            .isEmpty()
    }

    private fun exportedWireValues(): Set<String> {
        val script = File(findModuleRoot(), RELATIVE_SCRIPT_PATH)

        val process = try {
            ProcessBuilder(
                "node",
                "--experimental-transform-types",
                "--no-warnings",
                script.path,
            ).start()
        } catch (error: IOException) {
            throw AssertionError("$NODE_UNAVAILABLE_MESSAGE\n${error.message}", error)
        }

        val stdout = process.inputStream.bufferedReader().use { it.readText() }
        val stderr = process.errorStream.bufferedReader().use { it.readText() }
        val exitCode = process.waitFor()

        if (exitCode != 0) {
            throw AssertionError("${script.path} exited with $exitCode.\n$stderr")
        }

        return Json.parseToJsonElement(stdout)
            .jsonArray
            .map { it.jsonPrimitive.content }
            .toSet()
    }

    private fun findModuleRoot(): File {
        val startDirectory = File("").absoluteFile
        var directory: File? = startDirectory

        while (directory != null) {
            if (File(directory, RELATIVE_ERRORS_PATH).isFile) {
                return directory
            }
            directory = directory.parentFile
        }

        throw AssertionError("Found no $RELATIVE_ERRORS_PATH in $startDirectory or any parent directory")
    }

    private companion object {
        const val RELATIVE_ERRORS_PATH = "src/errors.ts"
        const val RELATIVE_SCRIPT_PATH = "scripts/print-error-codes.mjs"
        const val NODE_UNAVAILABLE_MESSAGE =
            "Could not run node. Run `dev rn test android`, which puts the pinned node on PATH."
    }
}
