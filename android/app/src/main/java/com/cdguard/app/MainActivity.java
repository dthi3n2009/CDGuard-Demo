package com.cdguard.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        AppCheckSetup.initialize();
        registerPlugin(CDGuardAIPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
