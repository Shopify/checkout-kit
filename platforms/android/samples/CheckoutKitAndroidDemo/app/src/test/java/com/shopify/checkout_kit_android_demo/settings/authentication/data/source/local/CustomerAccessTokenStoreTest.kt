package com.shopify.checkout_kit_android_demo.settings.authentication.data.source.local

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.stringPreferencesKey
import com.google.crypto.tink.Aead
import com.shopify.checkout_kit_android_demo.settings.authentication.data.AccessToken
import java.io.File
import java.io.IOException
import java.nio.charset.StandardCharsets.UTF_8
import java.security.GeneralSecurityException
import java.util.Base64
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class CustomerAccessTokenStoreTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    private val json = Json { ignoreUnknownKeys = true }
    private lateinit var scope: CoroutineScope
    private lateinit var dataStore: DataStore<Preferences>

    @Before
    fun setUp() {
        scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
        dataStore = PreferenceDataStoreFactory.create(scope = scope) {
            File(temporaryFolder.root, "customer-access-token.preferences_pb")
        }
    }

    @After
    fun tearDown() {
        scope.cancel()
    }

    @Test
    fun `persists an encrypted token and returns it`() = runBlocking<Unit> {
        val store = storeWith(TransformingAead())
        val token = token()
        val serializedToken = json.encodeToString(token)

        assertThat(store.save(token)).isTrue()

        assertThat(store.find()).isEqualTo(token)
        val stored = requireNotNull(storedToken())
        assertThat(stored).startsWith("v1:")
        assertThat(stored).doesNotContain(token.accessToken)
        assertThat(Base64.getDecoder().decode(stored.removePrefix("v1:")))
            .isNotEqualTo(serializedToken.toByteArray(UTF_8))
    }

    @Test
    fun `removes a token and invalidates the codec when decryption fails`() = runBlocking<Unit> {
        val invalidations = AtomicInteger()
        val store = storeWith(DecryptFailingAead()) { invalidations.incrementAndGet() }

        store.save(token())

        assertThat(store.find()).isNull()
        assertThat(storedToken()).isNull()
        assertThat(invalidations.get()).isEqualTo(1)
    }

    @Test
    fun `reports failure when the token DataStore cannot be deleted`() = runBlocking<Unit> {
        val store = CustomerAccessTokenStore(
            tokenCodecProvider = codecProvider(codecFactory = { EncryptedTokenCodec(IdentityAead()) }),
            dataStore = deleteFailingDataStore()
        )

        assertThat(store.delete()).isFalse()
    }

    @Test
    fun `does not delete a token when the DataStore cannot be read`() = runBlocking<Unit> {
        var codecCreated = false
        val store = CustomerAccessTokenStore(
            tokenCodecProvider = codecProvider(codecFactory = {
                codecCreated = true
                EncryptedTokenCodec(IdentityAead())
            }),
            dataStore = unreadableDataStore()
        )

        assertThat(store.find()).isNull()
        assertThat(codecCreated).isFalse()
    }

    @Test
    fun `returns null when the token DataStore read throws an unchecked exception`() = runBlocking<Unit> {
        var codecCreated = false
        val store = CustomerAccessTokenStore(
            tokenCodecProvider = codecProvider(codecFactory = {
                codecCreated = true
                EncryptedTokenCodec(IdentityAead())
            }),
            dataStore = runtimeFailingDataStore()
        )

        assertThat(store.find()).isNull()
        assertThat(codecCreated).isFalse()
    }

    @Test
    fun `removes a legacy plaintext token`() = runBlocking<Unit> {
        val store = storeWith(IdentityAead())
        dataStore.edit { preferences ->
            preferences[TOKEN_KEY] = json.encodeToString(token())
        }

        assertThat(store.find()).isNull()
        assertThat(storedToken()).isNull()
    }

    @Test
    fun `does not remove a token saved while an unreadable token is being discarded`() = runBlocking<Unit> {
        val replacement = "v1:replacement"
        val store = storeWith(DecryptFailingAead {
            runBlocking {
                dataStore.edit { preferences ->
                    preferences[TOKEN_KEY] = replacement
                }
            }
        })

        store.save(token())

        assertThat(store.find()).isNull()
        assertThat(storedToken()).isEqualTo(replacement)
    }

    @Test
    fun `does not persist a token when the codec cannot be created`() = runBlocking<Unit> {
        val store = CustomerAccessTokenStore(
            json = json,
            tokenCodecProvider = codecProvider(codecFactory = { throw GeneralSecurityException("Unable to load keyset") }),
            dataStore = dataStore
        )

        assertThat(store.save(token())).isFalse()

        assertThat(storedToken()).isNull()
    }

    @Test
    fun `leaves a stored token when the codec cannot be created`() = runBlocking<Unit> {
        val ciphertext = "v1:ciphertext"
        dataStore.edit { preferences ->
            preferences[TOKEN_KEY] = ciphertext
        }
        val store = CustomerAccessTokenStore(
            json = json,
            tokenCodecProvider = codecProvider(codecFactory = { throw GeneralSecurityException("Unable to load keyset") }),
            dataStore = dataStore
        )

        assertThat(store.find()).isNull()
        assertThat(storedToken()).isEqualTo(ciphertext)
    }

    private fun storeWith(
        aead: Aead,
        invalidateTokenCodec: suspend () -> Unit = {}
    ) = CustomerAccessTokenStore(
        json = json,
        tokenCodecProvider = codecProvider(
            codecFactory = { EncryptedTokenCodec(aead) },
            invalidation = invalidateTokenCodec
        ),
        dataStore = dataStore
    )

    private fun codecProvider(
        codecFactory: suspend () -> EncryptedTokenCodec,
        invalidation: suspend () -> Unit = {}
    ) = object : TokenCodecProvider {
        override suspend fun codec(): EncryptedTokenCodec = codecFactory()

        override suspend fun invalidate() {
            invalidation()
        }
    }

    private suspend fun storedToken(): String? = dataStore.data.first()[TOKEN_KEY]

    private fun deleteFailingDataStore(): DataStore<Preferences> = object : DataStore<Preferences> {
        override val data: Flow<Preferences> = flowOf(emptyPreferences())

        override suspend fun updateData(
            transform: suspend (t: Preferences) -> Preferences
        ): Preferences = throw IOException("Unable to delete customer access token")
    }

    private fun unreadableDataStore(): DataStore<Preferences> = object : DataStore<Preferences> {
        override val data: Flow<Preferences> = flow {
            throw IOException("Unable to read customer access token")
        }

        override suspend fun updateData(
            transform: suspend (t: Preferences) -> Preferences
        ): Preferences = error("DataStore should not be modified when it cannot be read")
    }

    private fun runtimeFailingDataStore(): DataStore<Preferences> = object : DataStore<Preferences> {
        override val data: Flow<Preferences> = flow {
            throw IllegalStateException("Unable to read customer access token")
        }

        override suspend fun updateData(
            transform: suspend (t: Preferences) -> Preferences
        ): Preferences = error("DataStore should not be modified when it cannot be read")
    }

    private fun token() = AccessToken(
        accessToken = "access-token",
        refreshToken = "refresh-token",
        tokenType = "Bearer",
        expiresIn = 3600,
        expiresAt = 1_000L
    )

    private class IdentityAead : Aead {
        override fun encrypt(plaintext: ByteArray, associatedData: ByteArray): ByteArray = plaintext

        override fun decrypt(ciphertext: ByteArray, associatedData: ByteArray): ByteArray = ciphertext
    }

    private class TransformingAead : Aead {
        override fun encrypt(plaintext: ByteArray, associatedData: ByteArray): ByteArray =
            plaintext.map { (it.toInt() xor TRANSFORMATION_KEY).toByte() }.toByteArray()

        override fun decrypt(ciphertext: ByteArray, associatedData: ByteArray): ByteArray =
            ciphertext.map { (it.toInt() xor TRANSFORMATION_KEY).toByte() }.toByteArray()

        private companion object {
            const val TRANSFORMATION_KEY = 0x5A
        }
    }

    private class DecryptFailingAead(
        private val onDecrypt: () -> Unit = {}
    ) : Aead {
        override fun encrypt(plaintext: ByteArray, associatedData: ByteArray): ByteArray = plaintext

        override fun decrypt(ciphertext: ByteArray, associatedData: ByteArray): ByteArray {
            onDecrypt()
            throw GeneralSecurityException("Unable to decrypt")
        }
    }

    private companion object {
        val TOKEN_KEY = stringPreferencesKey(TOKEN_PREFERENCE_KEY)
    }
}
