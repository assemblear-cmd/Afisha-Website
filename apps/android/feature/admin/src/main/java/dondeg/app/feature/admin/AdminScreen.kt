package dondeg.app.feature.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dondeg.app.core.model.SessionUser
import dondeg.app.core.model.UserRole

/**
 * Admin moderation/payout entry. Every action (approve/reject/complete/archive,
 * payout state machine) is guarded server-side; the app opens the admin console
 * in a Custom Tab so no moderation state machine is duplicated on the device.
 */
@Composable
fun AdminScreen(
    session: SessionUser?,
    onOpenWeb: () -> Unit,
) {
    val isAdmin = session?.role == UserRole.Admin

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        if (!isAdmin) {
            Text(
                text = stringResource(R.string.admin_denied_title),
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.ExtraBold,
            )
            Text(
                text = stringResource(R.string.admin_denied_body),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            Text(
                text = stringResource(R.string.admin_dashboard_title),
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.ExtraBold,
            )
            Text(
                text = stringResource(R.string.admin_dashboard_body),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Button(onClick = onOpenWeb, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.admin_open_web))
            }
        }
    }
}
