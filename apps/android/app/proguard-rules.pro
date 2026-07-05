# kotlinx.serialization — keep serializers generated for DTOs.
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class dondeg.app.core.network.** {
    *** Companion;
}
-keepclasseswithmembers class dondeg.app.core.network.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Retrofit relies on generic signatures and annotations at runtime.
-keepattributes Signature, Exceptions
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
