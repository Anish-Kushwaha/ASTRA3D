# Security Policy

## Supported product surface

Security reports are welcome for the ASTRA3D browser Studio and this repository's build, release and persistence configuration.

ASTRA3D Studio is currently a local-first browser editor. Scene files and autosaves remain in the user's browser unless the user explicitly exports a file. Cloud sync, hosted accounts, collaborative editing and remote asset storage are not currently enabled in the browser Studio.

## Reporting a vulnerability

Please use GitHub's **Private vulnerability reporting** for this repository when it is enabled. Do not publish exploit details in a public issue before a fix is available.

Include:
- The affected version, deployment URL or commit.
- Browser and operating system versions.
- Minimal reproduction steps and the expected versus actual behavior.
- A proof-of-concept file only when it is safe and necessary.

Do not include private scene files, credentials, personal data or production secrets in a report.

## Security expectations

- Imported scene and OBJ files are untrusted input and must be size- and structure-validated.
- Uploaded scripts must never be evaluated as arbitrary JavaScript.
- Secrets must not be committed or embedded in browser bundles.
- Changes to Supabase policies must be tested with the repository's schema smoke tests.
- Production releases must pass the automated test, dependency-audit and build gates.

## Scope limitations

The browser editor has not undergone an independent penetration test or formal security audit. This policy does not imply a guaranteed response time or service-level agreement.
