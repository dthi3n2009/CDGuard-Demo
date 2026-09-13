package com.cdguard.app;

import com.google.firebase.appcheck.FirebaseAppCheck;
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory;

final class AppCheckSetup {
    static void initialize() {
        // Each test installation generates its own token. Never embed a shared bypass token.
        FirebaseAppCheck.getInstance().installAppCheckProviderFactory(
            DebugAppCheckProviderFactory.getInstance());
    }
}
