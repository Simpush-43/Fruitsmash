# PhotoSafe

## Backend setup

Create `Backend/.env` from `Backend/.env.example`. Set `MONGO_DBURL` to your
MongoDB connection string (the example URI uses a local MongoDB server) and
replace `ACCESS_SECRET`, `REFRESH_SECRET`, and `CLIENT_SECRET` with separate,
random values. Signup and password login now authenticate directly without
email OTP and require the access and refresh secrets.

For image uploads, set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
`CLOUDINARY_API_SECRET` using credentials from the same Cloudinary account.
If uploads fail with `Invalid Signature`, re-copy all three values from that
account's dashboard, check for accidental whitespace, then restart the backend.
If the API secret was exposed, rotate it in Cloudinary and update the `.env`.
Uploads are limited to 10 MB and receive a two-minute Cloudinary request timeout.
If an upload still times out, try a smaller image and a stable network connection.

GIF and animated sticker search use GIPHY's free beta API key, limited to 100 API calls per hour.
Create a key in the [GIPHY Developer Dashboard](https://developers.giphy.com/dashboard/),
copy `Frontend/.env.example` to `Frontend/.env`, and set `VITE_GIPHY_API_KEY`.
Vite exposes this key to the browser, as GIPHY requires search and media requests
to come directly from the client; it is not a secret. Restart the frontend after
adding it. The chat stores GIPHY media IDs rather than media URLs and loads GIFs
and stickers directly from GIPHY. Without a key, text, emoji, voice, and
attachments still work, while GIF and sticker search display a setup message.

On PowerShell, generate a random secret with:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Run this separately for each secret and keep the values private.

If Atlas startup fails with `querySrv ECONNREFUSED`, add this optional line to
`Backend/.env` to make Node use Cloudflare DNS:

```env
MONGO_DNS_SERVERS=1.1.1.1,1.0.0.1
```

Start the backend from the repository root with `npm --prefix Backend start`,
or run `npm start` from `Backend`. The API starts only after MongoDB connects.

### Deploying the backend on Render

Create a **Web Service** with `Backend` as its Root Directory, `npm install` as
the Build Command, and `npm start` as the Start Command. If the service is
already configured to run `npm run build`, the backend now provides that script
as a syntax check. Add the required backend environment variables in Render's
Environment settings; do not upload the local `.env` file. Set `NODE_ENV` to
`production`, `FRONTEND_URL` to the exact deployed Vercel origin (for example
`https://your-app.vercel.app`, without a trailing slash), and set the MongoDB,
JWT, session, and Cloudinary values from `Backend/.env.example`. The backend
uses HTTPS-only cross-site cookies and only permits the configured frontend
origin in production. Redeeming a referral code also returns a signed,
12-hour private-chat access token so browsers that block cross-site cookies
can still open the chat. Redeploy the backend and frontend after pulling this
change.

### Deploying the frontend on Vercel

Set the Vercel **Root Directory** to `Frontend`. Add `VITE_API_URL` with the
value `https://fruitsmash.onrender.com/api` and add `VITE_GIPHY_API_KEY` in the
Vercel project's Environment Variables for the environments you deploy.
Environment variables are embedded at build time, so redeploy after changing
them. Keep the GIPHY key in Vercel settings rather than committing a local
`.env` file.

### Fixing an old `email_1` index

If signup reports a duplicate key for `{ email: null }` on `test.users`, the
Atlas collection has an obsolete lowercase `email_1` index. In MongoDB Atlas,
open **Database → Browse Collections → test → users → Indexes**, confirm there
are separate indexes named `email_1` and `Email_1`, and drop only the obsolete
`email_1` index. Keep `Email_1`, which enforces uniqueness for the current
`Email` field. If only one index is shown or the names differ, inspect the
index key before removing anything.
# Fruitsmash
