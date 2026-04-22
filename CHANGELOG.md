# Changelog

## [0.11.0](https://github.com/mkuchak/push-to-talk/compare/v0.10.0...v0.11.0) (2026-04-22)

### Features

* **shortcuts:** add two-slot mode toggle with double-tap Right Alt ([bb703f4](https://github.com/mkuchak/push-to-talk/commit/bb703f40f812b5fa3b6d8eb22717677d33068221))
* **transcribe:** auto-retry with preserved-audio manual retry ([9ae89b7](https://github.com/mkuchak/push-to-talk/commit/9ae89b70af7ff14375ac872342950cfdefc02644))

## [0.10.0](https://github.com/mkuchak/push-to-talk/compare/v0.9.0...v0.10.0) (2026-03-20)

### Features

* **prompt:** add intonation-aware punctuation instruction ([0779ded](https://github.com/mkuchak/push-to-talk/commit/0779dedb8383624d6279e6b691b671a2ab17d3da))

## [0.9.0](https://github.com/mkuchak/push-to-talk/compare/v0.8.0...v0.9.0) (2026-03-12)

### Features

* **shortcuts:** simplify toggle UI to Right Alt + Right Shift ([881b06d](https://github.com/mkuchak/push-to-talk/commit/881b06d10b541e24fa2f7cd62110db3e0f9f1b6f))
* **ui:** add pill badges for recording and processing status ([eed6049](https://github.com/mkuchak/push-to-talk/commit/eed604952c985d594b8297301040b4525246717a))

## [0.8.0](https://github.com/mkuchak/push-to-talk/compare/v0.7.1...v0.8.0) (2026-03-12)

### Features

* **context:** add optional context field for transcription ([c57e73c](https://github.com/mkuchak/push-to-talk/commit/c57e73c37998e29a7cd22bc7df1f23e05a3c2cb5))
* **languages:** add language picker and dynamic mode selector ([d4f0f2c](https://github.com/mkuchak/push-to-talk/commit/d4f0f2ca431c76ae52a71f58ca1bf4b3bd643a2b))
* **languages:** add selectable languages with dynamic modes ([1928e2a](https://github.com/mkuchak/push-to-talk/commit/1928e2af3df4abe3554bb2ec58d7a68cd2f65cc3))
* **languages:** persist selected languages in store ([b9581a7](https://github.com/mkuchak/push-to-talk/commit/b9581a7f7a828c65c022ce8854a5dbfee3ec459e))
* **languages:** show "Transcribe" label for same-language modes ([749c912](https://github.com/mkuchak/push-to-talk/commit/749c912e2c52896da8c278e6cb3c7a94262fcc49))
* **paste:** save and restore clipboard around paste ([6e91228](https://github.com/mkuchak/push-to-talk/commit/6e912282e941a8c7ccac86aff6697da27bb9eda6))
* **ui:** add shortcuts help view with keyboard reference ([d111ed6](https://github.com/mkuchak/push-to-talk/commit/d111ed634bfecb6a647198e30cc14bbc460f2450))

### Bug Fixes

* **mac:** enforce accessory policy after window show ([de15d66](https://github.com/mkuchak/push-to-talk/commit/de15d66fe2d3cc71fa2234b53256361d9a684601))
* **mac:** fix entitlements for ad-hoc signing and hide dock ([b1ca9dd](https://github.com/mkuchak/push-to-talk/commit/b1ca9ddc226c58bb97c52b69b9ef0090de0a1a42))
* **mic:** add permission handlers and improve access check ([ce81766](https://github.com/mkuchak/push-to-talk/commit/ce817664549ea7f28c9c14a798315786d0f9c9f3))
* **mic:** fallback to default device on stale device ID ([780dcb3](https://github.com/mkuchak/push-to-talk/commit/780dcb38e7d0ff499b2312d22c356b1e741a57e2))
* **paste:** remove clipboard save/restore to fix ghost image bug ([778c8b8](https://github.com/mkuchak/push-to-talk/commit/778c8b80e8c2626b71c25b02d6ae2132abd2b186))
* **ui:** always show window on app launch ([17975ec](https://github.com/mkuchak/push-to-talk/commit/17975ec58bc293fdef7602d7c9fc692be44be117))

## [0.7.1](https://github.com/mkuchak/push-to-talk/compare/v0.7.0...v0.7.1) (2026-03-10)

### Bug Fixes

* **mac:** add microphone entitlements for packaged app ([0c1eaa9](https://github.com/mkuchak/push-to-talk/commit/0c1eaa94cfbe18e3e8db6ff1cfa9ba082f07f3e5))

## [0.7.0](https://github.com/mkuchak/push-to-talk/compare/v0.6.0...v0.7.0) (2026-03-10)

### Features

* **ui:** increase window width by 20% ([bf1619e](https://github.com/mkuchak/push-to-talk/commit/bf1619e9c1b11069f846e60af28d83347a02e06f))

### Bug Fixes

* **main:** use default import for electron-updater ESM compat ([37f9169](https://github.com/mkuchak/push-to-talk/commit/37f9169cdb30989ad5c365c0f6bdb7c816e1882c))

### Refactoring

* **languages:** extract shared languages map as single source of truth ([fe4412e](https://github.com/mkuchak/push-to-talk/commit/fe4412e00dea3e8c2557643e9ec782aa9a7ef818))
* **store:** use full locale codes for default mode ([36236da](https://github.com/mkuchak/push-to-talk/commit/36236da230b9ab33946505d898b705a9e24cbd68))

## [0.6.0](https://github.com/mkuchak/push-to-talk/compare/v0.5.2...v0.6.0) (2026-03-10)

### Features

* **icon:** redesign app and tray icons with mic and sound waves ([baf0175](https://github.com/mkuchak/push-to-talk/commit/baf0175365ea3859c167195766b4eee848fc4b94))
* **ui:** add audio feedback tones for record/stop/cancel ([eae4e61](https://github.com/mkuchak/push-to-talk/commit/eae4e61aed610b9c402c6f4fc83e76544ff49006))

## [0.5.2](https://github.com/mkuchak/push-to-talk/compare/v0.5.1...v0.5.2) (2026-03-10)

### Bug Fixes

* **ci:** add write permissions and bypass 2h time window ([9e3de73](https://github.com/mkuchak/push-to-talk/commit/9e3de73ab25911bafb16dd880cc81569fa020f41))

## [0.5.1](https://github.com/mkuchak/push-to-talk/compare/v0.5.0...v0.5.1) (2026-03-10)

### Bug Fixes

* **prompts:** enforce output language in translation modes ([520bb4f](https://github.com/mkuchak/push-to-talk/commit/520bb4f01a744467512c961d52b4fbe7d5fc0db5))
* **publish:** set releaseType to avoid draft conflict in CI ([dea9463](https://github.com/mkuchak/push-to-talk/commit/dea94635d3ca1d4830f755e3e94bc333a28bb769))

## [0.5.0](https://github.com/mkuchak/push-to-talk/compare/v0.4.4...v0.5.0) (2026-03-10)

### Features

* **auto-update:** add electron-updater with GitHub publish config ([c9a75af](https://github.com/mkuchak/push-to-talk/commit/c9a75af6a71c3cc29737eda6553a343cf656be9b))
* **settings:** display app version from package.json ([2047cd6](https://github.com/mkuchak/push-to-talk/commit/2047cd66aa2c76b66f19a410da288397bfeab35b))
