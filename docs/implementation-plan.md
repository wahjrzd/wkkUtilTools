# wkk.tools implementation plan

Goal: implement the approved JSON and timestamp tools locally, ready for static Cloudflare hosting.
Architecture: dependency-free ES modules in public/, Node development server and build script in scripts/. No data leaves the browser. This directory is a new project without an existing Git repository.
Spec: design/design-proposal.md, JSON v4 and timestamp v6 images.

- [x] Core utilities: tests/core.test.mjs exercises formatting, preserved large integers and escapes, invalid JSON, seconds/milliseconds, negative epochs, invalid input and local date validation. Implement public/core.js after the tests fail. Run under Asia/Singapore, UTC and America/New_York.
- [x] Interface: public/index.html, public/style.css and public/app.js implement horizontal navigation, one JSON textarea and a lower-left format button, three timestamp rows, system timezone, live clock and accessible inline errors. Retain input between tools and never overwrite input on failure. Support narrow viewports and keyboard operation.
- [x] Local delivery: scripts/serve.mjs serves only public/ on loopback; scripts/build.mjs copies only deployable files into dist/. package.json exposes dev/build/test. README.md documents local commands and Cloudflare Pages build/output/custom domain setup.
- [x] Verification: run core tests, build, serve locally, exercise both tools with Playwright, verify mobile overflow and system timezone behavior, inspect screenshots, leave the local site running.

Core API: formatJson(text): string; unixToLocal(text): { value: string, unit: '秒' | '毫秒' }; localToUnix(text): string; formatLocal(date): string. Errors throw user-readable Error messages. JSON formatting uses Tab and CRLF without numeric reserialization. Ten-digit timestamps are seconds, thirteen-digit timestamps are milliseconds; zero is explicitly supported, ambiguous lengths rejected. Local date input is YYYY-MM-DD HH:mm:ss. Millisecond output preserves a nonzero fractional part.


Verification: 11 core cases; 11 passed in America/New_York, 10 passed plus one DST-only skip in Asia/Singapore and UTC. Browser checks passed at 1600px and 320/390/768px, with Singapore and UTC timezones. Review issues (output expansion and skip-link route preservation) fixed and regression-tested. Static build completed. Local server: http://127.0.0.1:5173.

