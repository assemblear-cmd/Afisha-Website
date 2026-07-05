package dondeg.app.core.designsystem

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp

val DondeGoCoral = Color(0xFFE21B2D)
val DondeGoCoralDark = Color(0xFFB91527)
val DondeGoInk = Color(0xFF1E0A3C)
val DondeGoBody = Color(0xFF4B4860)
val DondeGoMuted = Color(0xFF6F7287)
val DondeGoSurface = Color(0xFFF8F7FA)
val DondeGoSuccess = Color(0xFF3EB489)

private val CanvasLight = Color.White
private val CardLight = Color.White
private val CanvasDark = Color(0xFF110F1A)
private val CardDark = Color(0xFF1B1727)
private val BodyDark = Color(0xFFC9C6D4)

private val LightColors: ColorScheme = lightColorScheme(
    primary = DondeGoCoral,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFFFE7EA),
    onPrimaryContainer = DondeGoCoralDark,
    secondary = DondeGoSuccess,
    onSecondary = Color.White,
    background = CanvasLight,
    onBackground = DondeGoInk,
    surface = CardLight,
    onSurface = DondeGoInk,
    surfaceVariant = DondeGoSurface,
    onSurfaceVariant = DondeGoMuted,
    outline = Color(0xFFE8E5EF),
)

private val DarkColors: ColorScheme = darkColorScheme(
    primary = DondeGoCoral,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF42101A),
    onPrimaryContainer = Color(0xFFFFC7D0),
    secondary = DondeGoSuccess,
    onSecondary = Color(0xFF052A21),
    background = CanvasDark,
    onBackground = Color(0xFFF4F2F8),
    surface = CardDark,
    onSurface = BodyDark,
    surfaceVariant = Color(0xFF241F33),
    onSurfaceVariant = Color(0xFFC9C6D4),
    outline = Color(0xFF393247),
)

private val DondeGoShapes = Shapes(
    extraSmall = androidx.compose.foundation.shape.RoundedCornerShape(6.dp),
    small = androidx.compose.foundation.shape.RoundedCornerShape(8.dp),
    medium = androidx.compose.foundation.shape.RoundedCornerShape(8.dp),
    large = androidx.compose.foundation.shape.RoundedCornerShape(8.dp),
    extraLarge = androidx.compose.foundation.shape.RoundedCornerShape(8.dp),
)

@Composable
fun DondeGoTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        shapes = DondeGoShapes,
        typography = MaterialTheme.typography.copy(
            displaySmall = MaterialTheme.typography.displaySmall.copy(fontFamily = FontFamily.SansSerif),
            headlineLarge = MaterialTheme.typography.headlineLarge.copy(fontFamily = FontFamily.SansSerif),
            headlineMedium = MaterialTheme.typography.headlineMedium.copy(fontFamily = FontFamily.SansSerif),
            headlineSmall = MaterialTheme.typography.headlineSmall.copy(fontFamily = FontFamily.SansSerif),
            titleLarge = MaterialTheme.typography.titleLarge.copy(fontFamily = FontFamily.SansSerif),
            titleMedium = MaterialTheme.typography.titleMedium.copy(fontFamily = FontFamily.SansSerif),
            titleSmall = MaterialTheme.typography.titleSmall.copy(fontFamily = FontFamily.SansSerif),
            bodyLarge = MaterialTheme.typography.bodyLarge.copy(fontFamily = FontFamily.SansSerif),
            bodyMedium = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.SansSerif),
            bodySmall = MaterialTheme.typography.bodySmall.copy(fontFamily = FontFamily.SansSerif),
            labelLarge = MaterialTheme.typography.labelLarge.copy(fontFamily = FontFamily.SansSerif),
            labelMedium = MaterialTheme.typography.labelMedium.copy(fontFamily = FontFamily.SansSerif),
            labelSmall = MaterialTheme.typography.labelSmall.copy(fontFamily = FontFamily.SansSerif),
        ),
        content = content,
    )
}
