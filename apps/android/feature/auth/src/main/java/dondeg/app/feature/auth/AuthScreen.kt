package dondeg.app.feature.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import dondeg.app.core.common.ApiResult
import dondeg.app.core.data.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Login/registration against the mobile auth endpoints. On success the token
 * is stored in encrypted storage by the repository and the screen pops back.
 */
@Composable
fun AuthScreen(
    repository: AuthRepository,
    googleWebClientId: String,
    onAuthenticated: () -> Unit,
) {
    val viewModel = viewModel { AuthViewModel(repository) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    LaunchedEffect(state.done) {
        if (state.done) onAuthenticated()
    }

    val fillFieldsError = stringResource(R.string.auth_error_fill_fields)
    val googleErrorText = stringResource(R.string.auth_google_error)
    val googleCancelledText = stringResource(R.string.auth_google_cancelled)

    fun startGoogleSignIn() {
        val credentialManager = CredentialManager.create(context)
        val googleIdOption = GetGoogleIdOption.Builder()
            .setServerClientId(googleWebClientId)
            // Show every Google account, not only ones already used with the app.
            .setFilterByAuthorizedAccounts(false)
            .build()
        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()
        viewModel.onGoogleStart()
        scope.launch {
            try {
                val response = credentialManager.getCredential(context, request)
                val credential = response.credential
                if (
                    credential is CustomCredential &&
                    credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                ) {
                    val googleCredential = GoogleIdTokenCredential.createFrom(credential.data)
                    viewModel.loginWithGoogle(googleCredential.idToken)
                } else {
                    viewModel.onGoogleError(googleErrorText)
                }
            } catch (cancelled: GetCredentialCancellationException) {
                viewModel.onGoogleError(googleCancelledText)
            } catch (failure: GetCredentialException) {
                viewModel.onGoogleError(googleErrorText)
            } catch (parsing: GoogleIdTokenParsingException) {
                viewModel.onGoogleError(googleErrorText)
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 28.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(
            text = stringResource(
                if (state.registerMode) R.string.auth_register_title else R.string.auth_login_title,
            ),
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onBackground,
            fontWeight = FontWeight.ExtraBold,
        )
        Text(
            text = stringResource(
                if (state.registerMode) R.string.auth_register_subtitle else R.string.auth_login_subtitle,
            ),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        if (state.registerMode) {
            OutlinedTextField(
                value = state.name,
                onValueChange = viewModel::onName,
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text(stringResource(R.string.auth_name)) },
            )
        }

        OutlinedTextField(
            value = state.email,
            onValueChange = viewModel::onEmail,
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            label = { Text(stringResource(R.string.auth_email)) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
        )

        OutlinedTextField(
            value = state.password,
            onValueChange = viewModel::onPassword,
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            label = { Text(stringResource(R.string.auth_password)) },
            supportingText = if (state.registerMode) {
                { Text(stringResource(R.string.auth_password_hint)) }
            } else {
                null
            },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        )

        state.error?.let { error ->
            Text(
                text = error,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.SemiBold,
            )
        }

        Button(
            onClick = { viewModel.submit(fillFieldsError) },
            modifier = Modifier.fillMaxWidth(),
            enabled = !state.loading,
        ) {
            if (state.loading) {
                CircularProgressIndicator(
                    modifier = Modifier.padding(4.dp),
                    color = MaterialTheme.colorScheme.onPrimary,
                    strokeWidth = 2.dp,
                )
            } else {
                Text(
                    stringResource(
                        if (state.registerMode) R.string.auth_submit_register else R.string.auth_submit_login,
                    ),
                )
            }
        }

        if (googleWebClientId.isNotBlank()) {
            Text(
                text = stringResource(R.string.auth_divider_or),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.align(Alignment.CenterHorizontally),
            )
            OutlinedButton(
                onClick = { startGoogleSignIn() },
                modifier = Modifier.fillMaxWidth(),
                enabled = !state.loading,
            ) {
                Text(stringResource(R.string.auth_google_button))
            }
        }

        TextButton(
            onClick = viewModel::toggleMode,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                stringResource(
                    if (state.registerMode) R.string.auth_switch_to_login else R.string.auth_switch_to_register,
                ),
            )
        }
    }
}

// --- State & ViewModel -------------------------------------------------------

internal data class AuthUiState(
    val registerMode: Boolean = false,
    val name: String = "",
    val email: String = "",
    val password: String = "",
    val loading: Boolean = false,
    val error: String? = null,
    val done: Boolean = false,
)

internal class AuthViewModel(
    private val repository: AuthRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state

    fun onName(value: String) = _state.update { it.copy(name = value, error = null) }
    fun onEmail(value: String) = _state.update { it.copy(email = value, error = null) }
    fun onPassword(value: String) = _state.update { it.copy(password = value, error = null) }

    fun toggleMode() = _state.update {
        it.copy(registerMode = !it.registerMode, error = null)
    }

    fun submit(fillFieldsError: String) {
        val snapshot = _state.value
        val incomplete = snapshot.email.isBlank() || snapshot.password.isBlank() ||
            (snapshot.registerMode && snapshot.name.isBlank())
        if (incomplete) {
            _state.update { it.copy(error = fillFieldsError) }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            val result = if (snapshot.registerMode) {
                repository.register(
                    name = snapshot.name,
                    email = snapshot.email,
                    password = snapshot.password,
                    // Everyone registers as a normal user; any signed-in user can
                    // still create their own events.
                    asOrganizer = false,
                )
            } else {
                repository.login(email = snapshot.email, password = snapshot.password)
            }
            applyResult(result)
        }
    }

    /** Marks progress while the Google credential picker is on screen. */
    fun onGoogleStart() = _state.update { it.copy(loading = true, error = null) }

    /** Surfaces a device-side Sign in with Google failure or cancellation. */
    fun onGoogleError(message: String) =
        _state.update { it.copy(loading = false, error = message) }

    fun loginWithGoogle(idToken: String) {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            applyResult(repository.loginWithGoogle(idToken))
        }
    }

    private fun applyResult(result: ApiResult<*>) {
        when (result) {
            is ApiResult.Success -> _state.update { it.copy(loading = false, done = true) }
            is ApiResult.HttpError -> _state.update {
                it.copy(loading = false, error = result.message)
            }
            is ApiResult.NetworkError -> _state.update {
                it.copy(loading = false, error = result.throwable.message.orEmpty())
            }
            is ApiResult.UnknownError -> _state.update {
                it.copy(loading = false, error = result.throwable.message.orEmpty())
            }
        }
    }
}
