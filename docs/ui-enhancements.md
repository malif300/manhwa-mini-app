# Applying the Manhwa Opehh UI enhancement helper

This helper deliberately does not replace `index.html` or redesign the app. It adjusts only bottom-tab size, splash branding/glitch styling, detail cover reset, initial chapter image priority, and adds a Premium/owner webtoon toggle.

Add this script tag after the app's existing inline `<script>` block and before `</body>` in `index.html`:

```html
<script src="/opehh-ui-enhancements.js"></script>
```

The toggle is presentation-only; the current reader already scrolls vertically. Premium/owner visibility is a client-side UI gate, not a security boundary. The owner ID is set to the Telegram ID supplied by the user (1405846034). The helper requires the account UI to set `#accountPlan[data-premium="true"]` for active Premium readers.

The helper does not change library/history/update UI. The file is not active until the script tag is added to the HTML and the mini app is redeployed.
