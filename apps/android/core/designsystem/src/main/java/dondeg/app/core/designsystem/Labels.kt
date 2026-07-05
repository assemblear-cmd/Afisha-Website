package dondeg.app.core.designsystem

import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import java.text.NumberFormat
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

// Shared label helpers so no feature hardcodes user-facing strings. Category
// slugs come from the backend taxonomy; unknown slugs degrade to a beautified
// slug instead of crashing on a missing resource.

@Composable
fun categoryLabel(slug: String?): String = when (slug) {
    "concierto" -> stringResource(R.string.ds_category_concierto)
    "festival" -> stringResource(R.string.ds_category_festival)
    "exposicion" -> stringResource(R.string.ds_category_exposicion)
    "charla" -> stringResource(R.string.ds_category_charla)
    "obra-de-teatro" -> stringResource(R.string.ds_category_obra_de_teatro)
    "evento-interactivo" -> stringResource(R.string.ds_category_evento_interactivo)
    "comedia" -> stringResource(R.string.ds_category_comedia)
    "fiesta-y-vida-nocturna" -> stringResource(R.string.ds_category_fiesta_y_vida_nocturna)
    "networking" -> stringResource(R.string.ds_category_networking)
    "negocios" -> stringResource(R.string.ds_category_negocios)
    "tecnologia" -> stringResource(R.string.ds_category_tecnologia)
    "gastronomia" -> stringResource(R.string.ds_category_gastronomia)
    "curso-taller" -> stringResource(R.string.ds_category_curso_taller)
    "salud-y-bienestar" -> stringResource(R.string.ds_category_salud_y_bienestar)
    "deportes" -> stringResource(R.string.ds_category_deportes)
    "familia" -> stringResource(R.string.ds_category_familia)
    "cine" -> stringResource(R.string.ds_category_cine)
    "beneficencia" -> stringResource(R.string.ds_category_beneficencia)
    "religion-espiritualidad" -> stringResource(R.string.ds_category_religion_espiritualidad)
    "otros", null -> stringResource(R.string.ds_category_otros)
    else -> slug.split("-").joinToString(" ") { part ->
        part.replaceFirstChar { it.uppercaseChar() }
    }
}

/**
 * Price label from server data: the raw source `priceText` wins, then the
 * minor-unit price, then TBA. CLP amounts format with es-CL separators
 * regardless of UI language.
 */
@Composable
fun priceLabel(priceText: String?, priceMinor: Long?, currency: String): String {
    val explicit = priceText?.trim().orEmpty()
    if (explicit.isNotEmpty()) return explicit
    val minor = priceMinor ?: return stringResource(R.string.ds_price_tba)
    if (minor <= 0L) return stringResource(R.string.ds_price_free)
    return stringResource(R.string.ds_price_from, formatMoney(minor, currency))
}

private val clpLocale: Locale = Locale.Builder().setLanguage("es").setRegion("CL").build()

fun formatMoney(minor: Long, currency: String): String {
    val formatted = NumberFormat.getIntegerInstance(clpLocale).format(minor)
    return "$$formatted ${currency.uppercase(Locale.US)}"
}

// Event times always display in the venue's timezone (America/Santiago),
// matching the web, regardless of the device timezone.
private val santiagoZone: ZoneId = ZoneId.of("America/Santiago")
private val dateFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("EEE, MMM d", Locale.US)
private val timeFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm", Locale.US)

fun formatEventDateTime(startsAt: String?): String? = startsAt?.let { iso ->
    runCatching {
        val zoned = Instant.parse(iso).atZone(santiagoZone)
        "${dateFormatter.format(zoned)} · ${timeFormatter.format(zoned)}"
    }.getOrNull()
}
