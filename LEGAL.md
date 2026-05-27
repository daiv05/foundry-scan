# Legal Notice & Disclaimer

## Not Legal Advice

This document provides general information only. It is not legal advice. If you have specific legal concerns about running FoundryScan in your jurisdiction or use case, consult a qualified attorney.

---

## How FoundryScan Works

FoundryScan is open-source software that users install and operate entirely on their own infrastructure. Contributors to this project do not operate any shared data collection infrastructure, do not store collected data on behalf of users, and do not have access to any data collected by a user's deployment.

**Users independently configure and operate the software on their own infrastructure and are solely responsible for their data collection activities.**

---

## Data Collection — Third-Party Terms of Service

FoundryScan retrieves publicly available data from third-party platforms to assist with personal market research. Users are solely responsible for ensuring their use of this software complies with the terms of service of any platform from which data is retrieved.

### Platform-specific notes

| Source | Method | Notes |
|---|---|---|
| **Reddit** | Public JSON API (`old.reddit.com`) | Reddit's ToS restricts automated access. The risk profile is generally lower for personal, low-volume, self-hosted use without monetisation or data redistribution — but ToS violations remain a possibility. |
| **Hacker News** | Official Firebase API | Publicly documented, free API. No known restrictions for personal use. |
| **Google Trends** | PyTrends (unofficial) | Google's ToS restricts automated querying. Data is aggregated and anonymised by Google. |
| **Product Hunt** | Official API (with token) | Requires a free developer token. Subject to Product Hunt's API terms. |

### On the hiQ v. LinkedIn precedent

The US Ninth Circuit held in *hiQ Labs v. LinkedIn* (2022) that accessing publicly available data may not violate the Computer Fraud and Abuse Act in that specific context. However, this ruling:

- was specific to the facts of that case and that jurisdiction
- does not constitute a universal licence to access any platform programmatically
- does not override contractual obligations (ToS agreements)
- may be interpreted differently in other countries

It is one relevant data point, not a guarantee of legality.

### Personal data and GDPR

Publicly available user-generated content — including usernames, post text, comments, and associated metadata — may constitute personal data under the GDPR and similar privacy regulations in other jurisdictions, even when that content is publicly accessible.

FoundryScan may temporarily process such data solely for the purpose of constructing an analysis prompt. The software is not designed to profile individuals, build persistent user records, or maintain long-term archives of personal data. The default configuration deletes raw collection data after 30 days.

Users operating FoundryScan in jurisdictions subject to the GDPR or similar regulations should evaluate their obligations as a data controller for any data their deployment processes.

### Fair use and research exceptions

Some jurisdictions recognise exceptions to copyright or data protection rules for research, analysis, or journalistic purposes. Whether any such exception applies depends on the specific jurisdiction, the nature of the use, and the applicable law. These are legal defences, not automatic permissions.

---

## Intended Use

FoundryScan is designed for:

- **Personal market research** — individual developers, founders, and researchers exploring business opportunities
- **Self-hosted, private use** — the software runs entirely on the user's own infrastructure; no data is sent to any third-party service operated by FoundryScan contributors

FoundryScan is **not** designed or intended for:

- High-volume automated collection at scale
- Reselling or republishing collected data
- Building or distributing datasets from retrieved content
- Circumventing paywalls, authentication systems, or access controls
- Any use that may violate applicable laws or regulations

---

## Content Removal and Platform Requests

If any platform, rights holder, or content owner requests restriction of access patterns associated with their content, users should comply promptly with such requests. If you receive a legal notice related to your use of this software, you should seek qualified legal advice.

---

## Contact

If you are a platform representative or rights holder with concerns regarding this project, please open a private issue or contact the maintainers directly at [david@deras.dev](mailto:david@deras.dev).

---

## No Warranty

FoundryScan is provided "as is" under the [MIT License](LICENSE), without warranty of any kind. Contributors are not liable for any damages or legal consequences arising from your use of this software.

---

## Responsible Use

To reduce legal and ethical risk when running FoundryScan:

1. **Use reasonable request delays** — the default `COLLECTOR_REQUEST_DELAY_MS=1200` is intentionally conservative; increase it if needed
2. **Use official APIs where available** — Product Hunt and Hacker News both have official APIs; prefer them
3. **Keep use personal and low-volume** — the risk profile changes significantly at commercial or multi-user scale
4. **Do not bypass access controls** — if a platform blocks your IP or returns a 403, do not use proxies, rotating IPs, or other circumvention techniques
5. **Do not republish raw content** — using signals to generate analysis is different from redistributing retrieved posts verbatim
