package dondeg.app.core.data

import dondeg.app.core.common.ApiResult
import dondeg.app.core.model.EventSummary
import dondeg.app.core.network.DondeGoApi
import dondeg.app.core.network.LikeRequest
import dondeg.app.core.network.safeApiCall
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Feed "likes" and the data behind the Events tab. `likedKeys` is the set of
 * liked wire-ids ("event_<id>"/"show_<id>") the feed uses to fill hearts;
 * it is refreshed on sign-in and updated optimistically on toggle.
 */
class LikesRepository(
    private val api: DondeGoApi,
    private val sessionRepository: SessionRepository,
) {
    private val _likedKeys = MutableStateFlow<Set<String>>(emptySet())
    val likedKeys: StateFlow<Set<String>> = _likedKeys

    /** Loads liked keys for the feed hearts; clears them when logged out. */
    suspend fun refresh() {
        if (sessionRepository.token() == null) {
            _likedKeys.value = emptySet()
            return
        }
        when (val result = safeApiCall { api.myLikes() }) {
            is ApiResult.Success -> _likedKeys.value = result.value.keys.toSet()
            else -> Unit // Keep the last known set on transient errors.
        }
    }

    /** Optimistic like/unlike; reverts the local set if the server call fails. */
    suspend fun toggle(wireId: String): ApiResult<Unit> {
        val wasLiked = _likedKeys.value.contains(wireId)
        _likedKeys.value = if (wasLiked) _likedKeys.value - wireId else _likedKeys.value + wireId

        val result = safeApiCall {
            if (wasLiked) api.unlike(LikeRequest(wireId)) else api.like(LikeRequest(wireId))
        }
        if (result !is ApiResult.Success) {
            _likedKeys.value = if (wasLiked) _likedKeys.value + wireId else _likedKeys.value - wireId
        }
        return when (result) {
            is ApiResult.Success -> ApiResult.Success(Unit)
            is ApiResult.HttpError -> result
            is ApiResult.NetworkError -> result
            is ApiResult.UnknownError -> result
        }
    }

    /** Events the signed-in user organizes (any status). */
    suspend fun myEvents(): ApiResult<List<EventSummary>> =
        when (val result = safeApiCall { api.myEvents() }) {
            is ApiResult.Success -> ApiResult.Success(result.value.items.map { it.toModel() })
            is ApiResult.HttpError -> result
            is ApiResult.NetworkError -> result
            is ApiResult.UnknownError -> result
        }

    /** Feed items the user has liked; also refreshes the liked-key set. */
    suspend fun likedEvents(): ApiResult<List<EventSummary>> =
        when (val result = safeApiCall { api.myLikes() }) {
            is ApiResult.Success -> {
                _likedKeys.value = result.value.keys.toSet()
                ApiResult.Success(result.value.items.map { it.toModel() })
            }
            is ApiResult.HttpError -> result
            is ApiResult.NetworkError -> result
            is ApiResult.UnknownError -> result
        }
}
