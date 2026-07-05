package dondeg.app.core.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys
import dondeg.app.core.model.SessionUser
import dondeg.app.core.model.UserRole
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Secure session storage: the JWT and the signed-in user live in
 * EncryptedSharedPreferences (AES-256, Android Keystore master key). The
 * token never goes through plain prefs, logs, or backups — the app manifest
 * disables backup and the data extraction rules exclude this file.
 */
class SessionRepository(context: Context) {
    private val prefs: SharedPreferences = run {
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        EncryptedSharedPreferences.create(
            "dondego_session",
            masterKeyAlias,
            context.applicationContext,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    private val state = MutableStateFlow(readUser())

    /** Signed-in user, null when logged out. Screens collect this for role-aware UI. */
    val session: StateFlow<SessionUser?> = state

    fun token(): String? = prefs.getString(KEY_TOKEN, null)

    fun store(token: String, user: SessionUser) {
        prefs.edit()
            .putString(KEY_TOKEN, token)
            .putString(KEY_ID, user.id)
            .putString(KEY_EMAIL, user.email)
            .putString(KEY_NAME, user.name)
            .putString(KEY_ROLE, user.role.name)
            .apply()
        state.value = user
    }

    /** Refreshes profile fields (e.g. role changes) without touching the token. */
    fun updateUser(user: SessionUser) {
        prefs.edit()
            .putString(KEY_ID, user.id)
            .putString(KEY_EMAIL, user.email)
            .putString(KEY_NAME, user.name)
            .putString(KEY_ROLE, user.role.name)
            .apply()
        state.value = user
    }

    fun clear() {
        prefs.edit().clear().apply()
        state.value = null
    }

    private fun readUser(): SessionUser? {
        if (token() == null) return null
        val id = prefs.getString(KEY_ID, null) ?: return null
        return SessionUser(
            id = id,
            email = prefs.getString(KEY_EMAIL, null).orEmpty(),
            name = prefs.getString(KEY_NAME, null).orEmpty(),
            role = prefs.getString(KEY_ROLE, null)
                ?.let { stored -> UserRole.entries.firstOrNull { it.name == stored } }
                ?: UserRole.Unknown,
        )
    }

    private companion object {
        const val KEY_TOKEN = "token"
        const val KEY_ID = "user_id"
        const val KEY_EMAIL = "user_email"
        const val KEY_NAME = "user_name"
        const val KEY_ROLE = "user_role"
    }
}
