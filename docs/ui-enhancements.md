# Applying the Manhwa Opehh enhancements without replacing your UI

This standalone helper preserves the existing `index.html` and reader markup. It makes the bottom tabs slightly taller, adds Manhwa Opehh splash branding/glitch styling, clears stale detail state before loading a new title, retries image loads after transient failures, prioritizes the first four chapter images, and adds a continuous vertical Webtoon presentation.

## Install

1. Keep the existing `index.html` unchanged.
2. Confirm `index.html` contains this line after its existing inline app script and before `</body>`:

```html
<script src="/opehh-ui-enhancements.js"></script>
```

3. Confirm `opehh-ui-enhancements.js` is in the same deployed site root as `index.html`.
4. Deploy the latest `main` branch, then open `/opehh-ui-enhancements.js` on your deployed domain to confirm it returns JavaScript rather than 404.

Webtoon mode uses vertical full-width images with no panel gaps and hides the reader bars for immersion; tapping a page brings the controls back. It is shown for the Telegram owner ID configured in the helper and accounts whose app state marks Premium. This browser-side access check is only for the UI, not a security boundary.
