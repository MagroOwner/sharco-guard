# Sharco Guard

Local-first prototype for a cross-platform personal-device security product.

Run it with Node 20+:

```powershell
cd sharco-guard
npm start
```

Open `http://localhost:4173`, then enter a folder on the local computer. The scanner never uploads files. It detects the standard EICAR antivirus test string and labels executable/script file types for review.

This is an early scanner prototype, not production antivirus software. A production release needs a signed native agent per operating system, real-time file-system monitoring, a verified threat-intelligence feed, safe quarantine/restore, audit logging, and independent security review.

## Vercel dashboard deployment

Deploy the `sharco-guard` folder as the Vercel project root. Vercel serves the dashboard from `public/` and deploys `api/health.js` as a small health endpoint. The dashboard recognizes its hosted state and does not try to scan a visitor's files: scanning belongs to the signed desktop agent running locally.
