# Releasing the Android APK

The app is distributed from this site as a downloadable APK. This file is the
procedure for cutting one.

## Where things live, and why

| Thing | Where | Why there |
|---|---|---|
| The APK binary | **GitHub Releases on this repo** (`sukablud/seatmate-site`) | This repo is public, so release assets download without a token. `sukablud/ride_share_main_app` is **private** — its release assets 404 for everyone but the owner and are useless for distribution. |
| `latest.json` | This repo, served by Pages at `https://seatmate.com.pk/latest.json` | The app polls it at launch to decide whether to prompt for a native update. |

**Never commit the APK into this repo.** The first build measured **117MB** and
GitHub Pages is not a binary host. It goes on a Release; only the pointer lives
in git.

> **117MB is a lot to ask of a user on mobile data in Islamabad.** The build is
> a single universal APK carrying every ABI. Enabling ABI splits (or shipping
> per-architecture APKs) would cut it substantially. Not done yet — noted here
> because it is a download-conversion problem, not just a hosting detail.

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

   The SHA-1 must be `7fb5eb410396a4d445a415a263b2140779c18b60` — the EAS
   release keystore. If it shows `5e8f16062ea3cd2c4a0d547876baa6f38cabf625`
   that is the **debug** keystore, a publicly known key. **Do not publish it.**

   Confirmed on the first `production-apk` build (2026-09-06): EAS signs with
   the release keystore and the local `signingConfigs.debug` in
   `android/app/build.gradle` is irrelevant to cloud builds — EAS never
   receives that directory (it is gitignored) and prebuilds its own. Check
   anyway on every release; it is ten seconds and it is the one thing that
   cannot be undone after users install.

   `apksigner` lives at `~/Android/Sdk/build-tools/36.0.0/apksigner` — it is
   not on `PATH`.

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
eas update --channel production-web --message "what changed"
```

### Channels — read this once

The two production builds carry **different EAS Update channels**, declared in
`eas.json`:

| Build profile | Channel | Who gets it |
|---|---|---|
| `production-apk` | `production-web` | the APK from this site |
| `production` | `production-play` | a future Play Store listing |

They are deliberately distinct, because the app has to tell them apart at
runtime: the update banner must appear **only** on web installs, and any future
out-of-store payment path must too (Play Billing is mandatory for digital
subscriptions inside a Play binary). The app reads this via `Updates.channel` —
build-time native config that an OTA cannot overwrite.

**EAS creates the channel and a same-named branch automatically** on the first
build using that profile. Verified 2026-09-06: the first `production-apk` build
printed `Created update channel "production-web"`, and `eas channel:list` shows
`production-web → branch production-web`. Nothing needs creating by hand.

`production-play` **does not exist yet** — it appears on the first `production`
build. Until then there is nothing to publish to it.

**Use `--channel`, not `--branch`, unless you know the mapping.** Publishing to
a branch that no channel points at is accepted, succeeds, and reaches nobody —
the single most confusing failure in this system, because everything reports
success. Confirm with:

```bash
eas channel:list
```

**A build profile with no channel at all receives no updates either** —
expo-updates ships present but inert. `npm run verify:app-update` asserts both
production profiles declare one.

Only cut a new APK when native code actually changes — a new native module, an
SDK upgrade, a permission change.

**If you do cut one for a native change, bump `runtimeVersion` in BOTH places:**
`app.config.js` *and*
`android/app/src/main/res/values/strings.xml` (`expo_runtime_version`).
`expo prebuild` would normally keep those in sync, but it is banned in that repo
because `android/` is hand-edited. Changing only `app.config.js` silently leaves
the native build reporting the old runtime version.
