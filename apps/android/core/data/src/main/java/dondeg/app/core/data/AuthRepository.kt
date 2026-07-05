package dondeg.app.core.data

import dondeg.app.core.common.ApiResult
import dondeg.app.core.model.SessionUser
import dondeg.app.core.network.AuthResponse
import dondeg.app.core.network.DondeGoApi
import dondeg.app.core.network.GoogleAuthRequest
import dondeg.app.core.network.LoginRequest
import dondeg.app.core.network.RegisterRequest
import dondeg.app.core.network.safeApiCall
import kotlinx.coroutines.flow.StateFlow

class AuthRepository(
    private val api: DondeGoApi,
    private val sessionRepository: SessionRepository,
) {
    val session: StateFlow<SessionUser?> = sessionRepository.session

    suspend fun login(email: String, password: String): ApiResult<SessionUser> =
        authenticate { api.login(LoginRequest(email = email.trim(), password = password)) }

    /**
     * Exchanges a Google ID token (from Sign in with Google) for a DondeGO
     * session. The backend verifies the token with Google, then finds or
     * creates the matching account and returns the app JWT.
     */
    suspend fun loginWithGoogle(idToken: String): ApiResult<SessionUser> =
        authenticate { api.googleAuth(GoogleAuthRequest(idToken = idToken)) }

    suspend fun register(
        name: String,
        email: String,
        password: String,
        asOrganizer: Boolean,
    ): ApiResult<SessionUser> = authenticate {
        api.register(
            RegisterRequest(
                name = name.trim(),
                email = email.trim(),
                password = password,
                // Only visitor/organizer exist on registration — admin is
                // seed-only on the backend and rejected by its schema.
                role = if (asOrganizer) "organizer" else "visitor",
            ),
        )
    }

    /**
     * Validates the stored token against the backend on app start. Expired or
     * rejected sessions are cleared so the UI falls back to logged-out state.
     */
    suspend fun refresh(): SessionUser? {
        if (sessionRepository.token() == null) return null
        when (val result = safeApiCall { api.me() }) {
            is ApiResult.Success -> {
                val user = result.value.user?.toModel()
                if (user == null) sessionRepository.clear() else sessionRepository.updateUser(user)
                return user
            }
            is ApiResult.HttpError -> if (result.code == 401) sessionRepository.clear()
            else -> Unit // Offline: keep the stored session; the server still re-checks every call.
        }
        return sessionRepository.session.value
    }

    fun logout() {
        sessionRepository.clear()
    }

    private suspend fun authenticate(block: suspend () -> AuthResponse): ApiResult<SessionUser> =
        when (val result = safeApiCall(block)) {
            is ApiResult.Success -> {
                val user = result.value.user.toModel()
                sessionRepository.store(result.value.token, user)
                ApiResult.Success(user)
            }
            is ApiResult.HttpError -> result
            is ApiResult.NetworkError -> result
            is ApiResult.UnknownError -> result
        }
}
