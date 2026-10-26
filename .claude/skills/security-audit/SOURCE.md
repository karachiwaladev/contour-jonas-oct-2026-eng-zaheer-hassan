# Source

Vendored unchanged from https://github.com/cloudflare/security-audit-skill
(path `skills/security-audit/`) at commit `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8`, fetched 2026-10-26. MIT licence, see `LICENSE`.

Reviewed before install: the validators (`validate-*.cjs`) only load Node built-ins and only read files.
`child_process` appears only in the test files, which start Node itself and `mkfifo`. There are no network
calls, no URLs and no install commands. To update, re-fetch from the repo and review the diff.
