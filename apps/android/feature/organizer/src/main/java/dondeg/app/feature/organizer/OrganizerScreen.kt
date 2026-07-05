package dondeg.app.feature.organizer

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dondeg.app.core.model.SessionUser
import dondeg.app.core.model.UserRole

/**
 * Role-gated organizer entry. Event creation/editing, payouts, and scanner
 * grants are authorized server-side; the app surfaces the organizer dashboard
 * (currently via the web console in a Custom Tab) plus a shortcut to in-app
 * check-in. Balances and ledger state are never computed on the device.
 */
@Composable
fun OrganizerScreen(
    session: SessionUser?,
    onSignIn: () -> Unit,
    onOpenWeb: () -> Unit,
    onGoToScanner: () -> Unit,
) {
    val isOrganizer = session?.role == UserRole.Organizer || session?.role == UserRole.Admin

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        when {
            session == null -> {
                Heading(
                    title = stringResource(R.string.organizer_signed_out_title),
                    body = stringResource(R.string.organizer_signed_out_body),
                )
                Button(onClick = onSignIn, modifier = Modifier.fillMaxWidth()) {
                    Text(stringResource(R.string.organizer_sign_in))
                }
            }
            !isOrganizer -> {
                Heading(
                    title = stringResource(R.string.organizer_upgrade_title),
                    body = stringResource(R.string.organizer_upgrade_body),
                )
            }
            else -> {
                Heading(
                    title = stringResource(R.string.organizer_dashboard_title),
                    body = stringResource(R.string.organizer_dashboard_body),
                )
                Button(onClick = onOpenWeb, modifier = Modifier.fillMaxWidth()) {
                    Text(stringResource(R.string.organizer_open_web))
                }
                OutlinedButton(onClick = onGoToScanner, modifier = Modifier.fillMaxWidth()) {
                    Text(stringResource(R.string.organizer_scan))
                }
            }
        }
    }
}

@Composable
private fun Heading(title: String, body: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.headlineSmall,
        color = MaterialTheme.colorScheme.onBackground,
        fontWeight = FontWeight.ExtraBold,
    )
    Text(
        text = body,
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}
