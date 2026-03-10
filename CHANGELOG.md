# Changelog

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
