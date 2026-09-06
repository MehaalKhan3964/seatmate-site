# Releasing the Android APK

The app is distributed from this site as a downloadable APK. This file is the
procedure for cutting one.

## Where things live, and why

| Thing | Where | Why there |
|---|---|---|
| The APK binary | **GitHub Releases on this repo** (`sukablud/seatmate-site`) | This repo is public, so release assets download without a token. `sukablud/ride_share_main_app` is **private** — its release assets 404 for everyone but the owner and are useless for distribution. |
| `latest.json` | This repo, served by Pages at `https://seatmate.com.pk/latest.json` | The app polls it at launch to decide whether to prompt for a native update. |

**Never commit the APK into this repo.** It is ~60–90MB and GitHub Pages is not
a binary host. It goes on a Release; only the pointer lives in git.

## Cutting a release

1. **Build** — from `ride_share_main_app/`:

   ```bash
   eas build -p android --profile production-apk
   ```

   `production-apk` is the only profile that produces a sideloadable APK with
   production config. `production` emits an `.aab`, which cannot be installed
   directly.

2. **Check the signature** before publishing anything:

   ```bash
   apksigner verify --print-certs seatmate-<version>.apk
   ```

   The SHA-1 must be `7F:B5:EB:41:03:96:A4:D4:45:A4:15:A2:63:B2:14:07:79:C1:8B:60`
   — the EAS release keystore. If it shows `5E:8F:16:06:…:F6:25` that is the
   **debug** keystore, which is a publicly known key. **Do not publish it.**

3. **Create the GitHub Release** on this repo, tagged `v<versionName>`, and
   attach the APK as `seatmate-<versionName>.apk`.

4. **Update `latest.json`** and push. It must match the release exactly:

   ```json
   {
     "versionCode": 2,
     "versionName": "1.0.1",
     "apkUrl": "https://github.com/sukablud/seatmate-site/releases/download/v1.0.1/seatmate-1.0.1.apk",
     "notes": "What changed, one short line."
   }
   ```

   - `versionCode` is the **Android versionCode of the build**, not the semver.
     EAS auto-increments it; read the real value off the build page or with
     `apksigner`/`aapt`. Getting this wrong is the whole failure mode — the app
     compares on this number alone.
   - `apkUrl` **must** start with
     `https://github.com/sukablud/seatmate-site/releases/download/`. The app
     refuses any other host outright (`utils/appUpdate.ts` → `APK_URL_PREFIX`),
     because this URL is handed to users with "install this".
   - `notes`, when non-empty, replaces the generic prompt text in the banner.
     Keep it to one line; it renders in a two-line banner.

## JS-only changes don't need any of this

A change that touches no native code ships over the air and users get it on
next launch:

```bash
eas update --branch production
```

### Channels — read this once

The two production builds carry **different EAS Update channels**, declared in
`eas.json`:

| Build profile | Channel | Who gets it |
|---|---|---|
| `production-apk` | `production-web` | the APK from this site |
| `production` | `production-play` | a future Play Store listing |

They are deliberately distinct, because the app has to be able to tell them
apart at runtime: the update banner must appear **only** on web installs, and
any future out-of-store payment path must too (Play Billing is mandatory for
digital subscriptions inside a Play binary). The app reads this via
`Updates.channel` — build-time native config that an OTA cannot overwrite.

Point both channels at the same branch so one publish serves both:

```bash
eas channel:edit production-web  --branch production
eas channel:edit production-play --branch production
```

**A build profile with no channel receives no updates at all** — expo-updates
ships present but inert, and nothing surfaces the problem until an OTA you
published silently never arrives. `npm run verify:app-update` asserts both
profiles declare one.

Only cut a new APK when native code actually changes — a new native module, an
SDK upgrade, a permission change.

**If you do cut one for a native change, bump `runtimeVersion` in BOTH places:**
`app.config.js` *and*
`android/app/src/main/res/values/strings.xml` (`expo_runtime_version`).
`expo prebuild` would normally keep those in sync, but it is banned in that repo
because `android/` is hand-edited. Changing only `app.config.js` silently leaves
the native build reporting the old runtime version.
