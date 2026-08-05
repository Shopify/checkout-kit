package com.shopify.checkoutkit.androiddemo.settings.authentication.data.source.local

import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.w3c.dom.Element
import javax.xml.parsers.DocumentBuilderFactory

class TokenBackupRulesTest {
    @Test
    fun `backup rules exclude the token DataStore and keyset from every backup channel`() {
        val tokenDataStorePath = "datastore/$DATA_STORE_NAME.preferences_pb"
        val keysetPath = "$KEYSET_PREFS_NAME.xml"

        assertExclusions(
            "data_extraction_rules.xml",
            sections = listOf("cloud-backup", "device-transfer"),
            tokenDataStorePaths = listOf(tokenDataStorePath, "$tokenDataStorePath.tmp"),
            keysetPath = keysetPath
        )
        assertExclusions(
            "backup_rules.xml",
            sections = listOf("full-backup-content"),
            tokenDataStorePaths = listOf(tokenDataStorePath, "$tokenDataStorePath.tmp"),
            keysetPath = keysetPath
        )
    }

    private fun assertExclusions(
        rulesFileName: String,
        sections: List<String>,
        tokenDataStorePaths: List<String>,
        keysetPath: String
    ) {
        val rules = requireNotNull(javaClass.getResourceAsStream("/$rulesFileName")) {
            "Missing test resource: $rulesFileName"
        }
        val document = rules.use { DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(it) }

        sections.forEach { sectionName ->
            val section = document.getElementsByTagName(sectionName).item(0) as? Element
            assertThat(section).withFailMessage("Missing $sectionName section in $rulesFileName").isNotNull()
            val exclusions = section!!.getElementsByTagName("exclude")

            tokenDataStorePaths.forEach { tokenDataStorePath ->
                assertThat(
                    (0 until exclusions.length).any {
                        (exclusions.item(it) as Element).getAttribute("path") == tokenDataStorePath
                    }
                ).withFailMessage("Missing DataStore exclusion for $tokenDataStorePath in $sectionName").isTrue()
            }
            assertThat(
                (0 until exclusions.length).any {
                    (exclusions.item(it) as Element).getAttribute("path") == keysetPath
                }
            ).withFailMessage("Missing keyset exclusion in $sectionName").isTrue()
        }
    }
}
