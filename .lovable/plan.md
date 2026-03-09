

## Fix: React "useEffect null" crash + Test Push Notifications

### Problem
The app shows a blank screen due to a Vite dependency pre-bundling cache issue. The bundled chunk for `@tanstack/react-query` references a stale/separate copy of React, causing `useEffect` to be `null`. The `dedupe` config is already in place but the cached chunks haven't been invalidated.

### Solution

**Step 1: Force Vite cache invalidation**
- Add `optimizeDeps.force: true` temporarily to `vite.config.ts` to force Vite to re-bundle all dependencies with the correct React deduplication.
- This will clear the stale pre-bundled chunks and resolve the null React reference.

```text
// vite.config.ts
optimizeDeps: {
  force: true,
},
resolve: {
  dedupe: ["react", "react-dom"],
  ...
}
```

**Step 2: Verify the app loads**
- Confirm the blank screen is resolved and pages render correctly.

**Step 3: Test Push Notification endpoints**
- Call `GET /send-push` to verify it returns the VAPID public key from secrets.
- Call `POST /send-push` with test data to verify the push delivery flow works (will return `{ sent: 0 }` if no partner subscriptions exist, which is expected).

### Technical Details

| File | Change |
|------|--------|
| `vite.config.ts` | Add `optimizeDeps: { force: true }` to force re-bundling |

