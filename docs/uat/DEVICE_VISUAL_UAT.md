# UAT — Android device visual and interaction checks

Status: **not executed**. No Android SDK is installed on the current machine
(`ANDROID_HOME` absent), and no APK was built or installed. This runbook is
the evidence procedure for a machine with the Android SDK (or an approved
internal build runner).

## Preconditions

- Internal APK built against the approved UAT API (`EXPO_PUBLIC_API_URL`).
- Clean install (`adb uninstall ai.khabir.app` first).
- Network toggling available (airplane mode / Wi-Fi off).
- Screen recording or screenshots enabled.

## Checks

1. **Offline bootstrap**
   - Sign in, close the app, disable network, reopen.
   - Expect the branded retry state (“حاول تاني”), NOT a logout and NOT a
     blank/forever splash.
   - Re-enable network, tap retry, expect the authenticated home.
2. **Definitive refresh rejection**
   - Revoke the session server-side (or use an expired/invalid refresh token).
   - Expect a clean redirect to login, with local credentials removed.
3. **Error Boundary**
   - Use a debug-only trigger to throw during render (or an approved test
     build with a fault injection).
   - Expect the Arabic “حصلت مشكلة غير متوقعة” surface with “حاول تاني”,
     not a white screen.
4. **HTML/502 response**
   - Point the app at a local proxy returning HTML `502`.
   - Expect a controlled Arabic error, no JSON crash.
5. **Chat polling**
   - Open a chat; a peer message must appear within 20 seconds.
   - Background the app: no polling network calls; foreground: one immediate
     refresh, then 15 s cadence.
   - Navigate away and back: no duplicate pollers.
6. **Orders focus refresh**
   - Change a request status elsewhere; return to the list/detail.
   - Expect the new status without a manual pull.
7. **Null coordinates**
   - Open an order whose location has no coordinates.
   - Expect the textual address; no map and no ocean/`0,0` location.
8. **Fake social auth**
   - Registration screen must not show Google/Facebook buttons.
9. **Sitemap**
   - Request `/_sitemap` and `/_sitemap.html` on the deployed web export.
   - Expect 404 (or a non-route), not the route inventory.
10. **RTL/Arabic**
    - Verify no clipped Arabic, correct direction, no letter-spacing, and
      readable mixed Arabic/Latin values.

## Evidence

Record: device model, Android version, APK versionCode, API host, screenshots/
recording, and PASS/FAIL per item. Do not claim a check without an artifact.
