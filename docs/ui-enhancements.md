# Applying the Manhwa Opehh enhancements without replacing your UI

This standalone helper preserves the existing `index.html` and reader markup. It makes the bottom tabs slightly taller, adds Manhwa Opehh splash branding/glitch styling, clears stale detail state before loading a new title, raises priority for only the first four chapter images, and adds a continuous vertical Webtoon mode toggle.

## Install

1. Keep the existing `index.html` and its reader UI unchanged.
2. Add this one script tag after the existing inline app script and before `</body>`:

```html
<script src="/opehh-ui-enhancements.js"></script>
```

3. Commit both files to the mini-app repo and redeploy it.

The Webtoon switch is available to the configured Telegram owner ID and active Premium accounts (`#accountPlan` must have `data-premium="true"`). This is only a UI toggle: the existing reader already presents pages vertically. The helper changes them to a seamless, full-width scroll presentation. Client-side checks are not a security boundary; enforce entitlements on the backend for protected features.
