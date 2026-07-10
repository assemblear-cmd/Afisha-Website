package dondeg.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.AdminPanelSettings
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.Event
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dondeg.app.R
import dondeg.app.core.common.ApiResult
import dondeg.app.core.data.PreferencesRepository
import dondeg.app.core.designsystem.DondeGoBannerBlue
import dondeg.app.core.designsystem.DondeGoPillBlack
import dondeg.app.core.model.SessionUser
import dondeg.app.core.model.UserRole

/**
 * Account tab, reference-design style: big title, profile card, "tell us what
 * you love" banner, and a Preferences list (interests, venues, language,
 * organizer tools). Signing in/out also lives here.
 */
@Composable
fun AccountScreen(
    session: SessionUser?,
    preferencesRepository: PreferencesRepository,
    prefsVersion: Int,
    onSignIn: () -> Unit,
    onSignOut: () -> Unit,
    onEditInterests: () -> Unit,
    onEditVenues: () -> Unit,
    onOpenYourEvents: () -> Unit,
    onOpenOrganizer: () -> Unit,
    onOpenScanner: () -> Unit,
    onOpenAdmin: () -> Unit,
) {
    var followingCount by remember { mutableStateOf<Int?>(null) }
    LaunchedEffect(session?.id, prefsVersion) {
        followingCount = if (session == null) {
            null
        } else {
            when (val result = preferencesRepository.preferences()) {
                is ApiResult.Success -> result.value.categories.size + result.value.venues.size
                else -> null
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(bottom = 24.dp),
    ) {
        // Header: title + settings (language) menu.
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 20.dp, end = 8.dp, top = 18.dp, bottom = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = stringResource(R.string.account_title),
                style = MaterialTheme.typography.headlineLarge,
                color = MaterialTheme.colorScheme.onBackground,
                fontWeight = FontWeight.ExtraBold,
            )
            Spacer(modifier = Modifier.weight(1f))
            LanguageMenuIcon()
        }

        // Profile card.
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .background(DondeGoPillBlack, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = (session?.name?.trim()?.take(1) ?: "?").uppercase(),
                        color = Color.White,
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                    )
                }
                if (session != null) {
                    Text(
                        text = session.name,
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onBackground,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = session.email,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    followingCount?.let { count ->
                        Text(
                            text = stringResource(R.string.account_following, count),
                            style = MaterialTheme.typography.titleSmall,
                            color = MaterialTheme.colorScheme.onBackground,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                } else {
                    Text(
                        text = stringResource(R.string.account_guest_title),
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onBackground,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = stringResource(R.string.account_guest_body),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    PillButton(
                        label = stringResource(R.string.account_sign_in),
                        onClick = onSignIn,
                    )
                }
            }
        }

        // "Tell us what you love" banner → the two onboarding questions.
        if (session != null) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(12.dp),
                color = DondeGoBannerBlue,
                contentColor = Color.White,
                onClick = onEditInterests,
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Icon(
                        imageVector = Icons.Outlined.FavoriteBorder,
                        contentDescription = null,
                        modifier = Modifier.size(26.dp),
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = stringResource(R.string.account_banner_title),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            text = stringResource(R.string.account_banner_body),
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.9f),
                        )
                    }
                    Text(
                        text = stringResource(R.string.account_banner_cta),
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline,
                    )
                }
            }
        }

        // Preferences list.
        Text(
            text = stringResource(R.string.account_preferences),
            modifier = Modifier.padding(start = 20.dp, top = 18.dp, bottom = 4.dp),
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onBackground,
            fontWeight = FontWeight.Bold,
        )

        AccountRow(
            icon = Icons.Outlined.Bolt,
            label = stringResource(R.string.account_interests),
            onClick = if (session != null) onEditInterests else onSignIn,
        )
        AccountRow(
            icon = Icons.Outlined.Place,
            label = stringResource(R.string.account_venues),
            onClick = if (session != null) onEditVenues else onSignIn,
        )
        if (session != null) {
            AccountRow(
                icon = Icons.Outlined.Event,
                label = stringResource(R.string.account_your_events),
                onClick = onOpenYourEvents,
            )
            AccountRow(
                icon = Icons.Outlined.Dashboard,
                label = stringResource(R.string.nav_organizer),
                onClick = onOpenOrganizer,
            )
            AccountRow(
                icon = Icons.Outlined.QrCodeScanner,
                label = stringResource(R.string.nav_scanner),
                onClick = onOpenScanner,
            )
            if (session.role == UserRole.Admin) {
                AccountRow(
                    icon = Icons.Outlined.AdminPanelSettings,
                    label = stringResource(R.string.nav_admin),
                    onClick = onOpenAdmin,
                )
            }
        }

        if (session != null) {
            Spacer(modifier = Modifier.height(20.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                contentAlignment = Alignment.Center,
            ) {
                PillButton(
                    label = stringResource(R.string.account_sign_out),
                    onClick = onSignOut,
                )
            }
        }
    }
}

@Composable
private fun PillButton(label: String, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(24.dp),
        color = DondeGoPillBlack,
        contentColor = Color.White,
        onClick = onClick,
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 28.dp, vertical = 12.dp),
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun AccountRow(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
) {
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.size(22.dp),
            )
            Text(
                text = label,
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onBackground,
            )
            Icon(
                imageVector = Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        HorizontalDivider(
            modifier = Modifier.padding(horizontal = 16.dp),
            color = MaterialTheme.colorScheme.outline.copy(alpha = 0.6f),
        )
    }
}

/** Settings gear → language picker (persists and recreates the Activity). */
@Composable
private fun LanguageMenuIcon() {
    val context = LocalContext.current
    val currentLang = LocalConfiguration.current.locales[0].language
    var expanded by remember { mutableStateOf(false) }
    Box {
        IconButton(onClick = { expanded = true }) {
            Icon(
                imageVector = Icons.Outlined.Settings,
                contentDescription = stringResource(R.string.language_menu),
                tint = MaterialTheme.colorScheme.onBackground,
            )
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            AppLanguage.entries.forEach { language ->
                DropdownMenuItem(
                    text = { Text(language.label) },
                    onClick = {
                        expanded = false
                        if (language.tag != currentLang) {
                            AppLocale.persist(context, language.tag)
                            context.findActivity()?.recreate()
                        }
                    },
                    trailingIcon = if (language.tag == currentLang) {
                        { Icon(Icons.Outlined.Check, contentDescription = null) }
                    } else {
                        null
                    },
                )
            }
        }
    }
}
