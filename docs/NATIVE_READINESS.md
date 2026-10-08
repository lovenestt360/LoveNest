# LoveNest Native Readiness

## Goal

Ship the existing React/Vite product on Android and iOS with Capacitor without
forking business logic. Web remains supported.

Target application id: `com.lovenest.app`.

## Runtime boundary

Use `src/lib/appRuntime.ts` to distinguish web/PWA from a future Capacitor
runtime. Product components should not import native plugins directly.

## Capability plan

### Push notifications
- Web keeps Firebase Messaging + service worker.
- Native uses Capacitor Push Notifications.
- Supabase remains the shared backend for preferences and delivery metadata.
- Add a platform/provider column to push subscriptions before native beta.

### Location
- Web currently uses `navigator.geolocation`.
- Native foreground location should use a platform adapter.
- Background location is a separate product/privacy decision and must not be
  assumed to work through foreground geolocation APIs.

### Photos and camera
- Web keeps file inputs.
- Native uses a camera/photo-library adapter.
- Supabase Storage remains the shared upload destination.

### Sharing
- Web uses Web Share/clipboard.
- Native uses a Share adapter.
- Features call the adapter, not platform APIs directly.

### Authentication
Current OAuth redirects depend on `window.location.origin`. Before native beta:
1. configure a native return URL/universal link;
2. allow it in Supabase Auth;
3. handle app URL open events in one auth boundary;
4. test Google OAuth, email confirmation, and password reset from cold start.

### App lifecycle
Use a single shell-level adapter for:
- foreground/background refresh;
- deep links;
- Android hardware back;
- app resume.

### PWA
PWA install banners/tutorials must never appear inside the native shell. The
runtime foundation already enforces this.

### Safe areas
Audit Chat, Location, readers, sheets, image viewers, auth, onboarding and
keyboard-open states. The main shell now respects the top safe area and bottom
navigation already respects the bottom safe area.

## Billing boundary

Supabase entitlements stay shared. Payment acquisition is platform-specific:
- web: selected payment gateway(s);
- iOS/Android: store-compliant digital subscription flow;
- backend: one source of truth for plan, expiry, renewal and restore.

Do not let UI or a gateway callback directly decide entitlement without verified
server-side processing.

## Capacitor phase

Only add Capacitor packages when package-lock can be regenerated and CI can
install the exact graph.

Planned base:
- core / CLI / Android / iOS
- App
- Browser
- Camera
- Geolocation
- Keyboard
- Push Notifications
- Share
- Splash Screen
- Status Bar

Add plugins only when a concrete feature consumes them.

## Release order

1. Finish UX V2 core flows.
2. Stabilize notifications and payment entitlement.
3. Add Capacitor config and generated Android/iOS projects.
4. Implement capability adapters.
5. Internal Android build.
6. TestFlight build.
7. Permission/privacy review.
8. Store billing and restore flows.
9. Crash/analytics validation.
10. Closed beta, then store submission.

## Native beta blockers

- OAuth and deep links
- account deletion in app
- privacy/terms reachable
- native push registration and open routing
- denied-permission states
- camera/photo picker
- location permission lifecycle
- keyboard and safe areas
- offline/reconnect and resume
- billing restore
- no PWA prompts
- no demo/development routes exposed
