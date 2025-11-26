# Extension Icons

This directory should contain the icons for the Chrome Extension.

To finalize the extension for the Chrome Web Store, please add the following files to this directory:

1.  `icon16.png` (16x16)
2.  `icon48.png` (48x48)
3.  `icon128.png` (128x128)

Once added, update `extension/manifest.json` to include:

```json
"icons": {
  "16": "assets/icon16.png",
  "48": "assets/icon48.png",
  "128": "assets/icon128.png"
}