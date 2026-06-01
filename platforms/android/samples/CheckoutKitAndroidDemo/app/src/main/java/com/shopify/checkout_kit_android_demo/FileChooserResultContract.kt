package com.shopify.checkout_kit_android_demo

import android.app.Activity.RESULT_OK
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.provider.MediaStore
import android.webkit.WebChromeClient.FileChooserParams
import androidx.activity.result.contract.ActivityResultContract
import androidx.core.content.FileProvider
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Handles file chooser / camera requests triggered by checkout.
 */
class FileChooserResultContract : ActivityResultContract<FileChooserParams, Uri?>() {
    private var cameraImageUri: Uri? = null

    override fun createIntent(context: Context, input: FileChooserParams): Intent {
        val fileChooserIntent = input.createIntent().apply {
            addCategory(Intent.CATEGORY_OPENABLE)
        }

        var mimeType = input.acceptTypes.firstOrNull().orEmpty()
        if (!ACCEPTABLE_MIME_TYPES.contains(mimeType)) {
            mimeType = DEFAULT_MIME_TYPE
        }
        fileChooserIntent.type = mimeType

        val photoFile = createImageFile(context)
        cameraImageUri = FileProvider.getUriForFile(context, "${context.packageName}.provider", photoFile)
        val cameraIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
            putExtra(MediaStore.EXTRA_OUTPUT, cameraImageUri)
            addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        }

        return Intent.createChooser(fileChooserIntent, context.getText(R.string.filechooser_title)).apply {
            putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(cameraIntent))
        }
    }

    override fun parseResult(resultCode: Int, intent: Intent?): Uri? {
        return if (resultCode == RESULT_OK) {
            intent?.data ?: cameraImageUri
        } else {
            null
        }
    }

    private fun createImageFile(context: Context): File {
        val timeStamp = SimpleDateFormat(DATE_FORMAT_PATTERN, Locale.US).format(Date())
        val storageDir = context.getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        return File.createTempFile("$IMG_FILE_PREFIX${timeStamp}_", IMG_FILE_SUFFIX, storageDir)
    }

    private companion object {
        private val ACCEPTABLE_MIME_TYPES = setOf("image/*", "video/*")
        private const val DEFAULT_MIME_TYPE = "*/*"
        private const val DATE_FORMAT_PATTERN = "yyyyMMdd_HHmmss"
        private const val IMG_FILE_PREFIX = "JPEG_"
        private const val IMG_FILE_SUFFIX = ".jpg"
    }
}
