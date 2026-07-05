package dondeg.app.feature.checkout

import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import dondeg.app.core.designsystem.FeatureScaffold

@Composable
fun CheckoutScreen() {
    FeatureScaffold(
        title = stringResource(R.string.checkout_title),
        body = stringResource(R.string.checkout_body),
    )
}
