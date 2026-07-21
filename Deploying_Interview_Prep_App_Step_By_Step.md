# Deploying the Interview Prep App to prep.thecommonpeople.co.uk

A complete, click-by-click walkthrough for getting the app live on the internet and
linked to The Com'mon People, using GitHub, Render and Cloudflare. No command line or
prior experience needed — everything below happens in a web browser.

**What we're doing, in one sentence:** put the app's code somewhere GitHub can see it,
have Render run it and give it a web address, then tell Cloudflare that
`prep.thecommonpeople.co.uk` should point at that address.

**Total time:** roughly 30–45 minutes, plus up to an hour of waiting for the internet to
notice the change (this part is normal and out of your control).

---

## Before you start

You'll need:
- The `interview-prep-app.zip` file I gave you, unzipped somewhere on your computer (double-click it, or right-click → Extract/Unzip).
- An email address to sign up with (your usual one is fine).
- About half an hour where you won't be interrupted for the first pass.

---

## Part 1 — Create a GitHub account

GitHub is where the app's code will live so Render can find it.

1. Go to **[github.com](https://github.com)**.
2. Click **Sign up** (top right).
3. Enter your email, create a password, and choose a username (anything's fine — this doesn't need to be professional).
4. Verify your email if GitHub asks you to (check your inbox for a confirmation code or link).
5. You'll land on the GitHub homepage once you're signed in. That's it for this part.

*Already have a GitHub account? Skip to Part 2.*

---

## Part 2 — Create a repository and upload the code

A "repository" (or "repo") is just a project folder on GitHub. We'll create one and
upload the app's files by dragging them into the browser — no command line involved.

1. Once logged in, click the **+** icon in the top right corner, then **New repository**.
2. **Repository name:** type `interview-prep-app`.
3. Leave it set to **Public** (this is fine for a prototype — nothing secret is in the code itself; API keys will be added later in Render, never in the code).
4. **Do not** tick "Add a README file" — leave everything else unticked too.
5. Click **Create repository**.
6. You'll land on a mostly-empty page. Look for the text link that says **uploading an existing file** (it's part of a sentence like "...or **uploading an existing file**.") and click it.
7. Now, on your computer, open the unzipped `interview-prep-app` folder. Select **all the files and folders inside it** (server.js, README.md, package.json, the `public` folder, the `lib` folder — everything *inside* `interview-prep-app`, not the outer folder itself) and drag them onto the GitHub page in your browser.
8. Wait for the upload to finish (a progress bar will show).
9. Scroll down to **Commit changes**. In the box that says "Add files", you can leave the default text or type something like `Initial upload`.
10. Click **Commit changes**.

You should now see all your files listed on the repository's main page. That's your code, safely on GitHub.

> **Note:** don't upload the `node_modules` folder if you happen to see one — it isn't included in the zip I gave you, so this shouldn't come up, but if it does, skip it. Render creates its own copy of it automatically.

---

## Part 3 — Create a Render account and deploy the app

Render is the service that will actually *run* the app and give it a web address.

1. Go to **[render.com](https://render.com)**.
2. Click **Get Started** and choose **Sign up with GitHub** — this is the easiest option since it connects the two automatically. Log into GitHub if it asks, and click **Authorize Render**.
3. Once you're in the Render dashboard, click **New** (top right), then **Web Service**.
4. Render will show a list of your GitHub repositories. Find and select **interview-prep-app**. If you don't see it, click **Configure account** and grant Render access to it.
5. You'll now see a settings form. Fill it in as follows:
   - **Name:** `interview-prep-app` (or anything you like — this becomes part of a temporary web address)
   - **Region:** pick whichever is closest to the UK (e.g. Frankfurt)
   - **Branch:** leave as `main` (or `master` — whichever it shows)
   - **Root Directory:** leave blank
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
6. Scroll down to **Instance Type** and choose **Free** for now (it's fine for testing — it goes to sleep after 15 minutes of no visitors and takes about 30 seconds to wake up on the next visit. Once real people are using it, switch this to the $7/month Starter tier so it's always instantly available).
7. Leave **Environment Variables** empty for now — we'll come back to this once you're ready to add real AI/payment keys (see the app's README for exactly which ones).
8. Click **Create Web Service** at the bottom.
9. Render will now build and start the app — you'll see a live log scrolling on screen. This takes 2–5 minutes. Wait for a line that says something like `Your service is live 🎉`.
10. Near the top of the page you'll see a web address like `https://interview-prep-app-xxxx.onrender.com`. Click it — you should see the Interview Prep app open in a new tab. If it loads, deployment worked.

---

## Part 4 — Add the custom domain in Render

Now we tell Render that it should also answer to `prep.thecommonpeople.co.uk`.

1. Still in your Render service, click the **Settings** tab.
2. Scroll to **Custom Domains** and click **Add Custom Domain**.
3. Type `prep.thecommonpeople.co.uk` and click **Save**.
4. Render will show you a **CNAME** record to create — it'll look something like:
   - **Name/Host:** `prep`
   - **Value/Target:** `interview-prep-app-xxxx.onrender.com`
5. Keep this tab open, or copy those two values somewhere — you'll need them in the next part. Render will show the domain as "Pending" until Part 5 is done.

---

## Part 5 — Add the DNS record in Cloudflare

This is the step that actually connects `prep.thecommonpeople.co.uk` to Render.

1. Go to **[dash.cloudflare.com](https://dash.cloudflare.com)** and log in.
2. Click on **thecommonpeople.co.uk** from your list of sites.
3. In the left-hand menu, click **DNS**, then **Records**.
4. Click **Add record**.
5. Fill in:
   - **Type:** `CNAME`
   - **Name:** `prep`
   - **Target:** the `.onrender.com` address Render gave you in Part 4 (e.g. `interview-prep-app-xxxx.onrender.com`)
   - **Proxy status:** make sure it shows the **orange cloud** (Proxied) — this is Cloudflare's default and gives you free SSL and CDN in front of the app
   - **TTL:** leave as `Auto`
6. Click **Save**.

---

## Part 6 — Set Cloudflare's SSL mode

This step avoids a common error ("too many redirects") when Cloudflare sits in front of another host.

1. Still in the Cloudflare dashboard for thecommonpeople.co.uk, click **SSL/TLS** in the left menu, then **Overview**.
2. Make sure the mode is set to **Full** (not "Flexible", and not "Off"). Render already serves the app over valid HTTPS, so Full is correct and secure end-to-end.

---

## Part 7 — Wait, then test

1. DNS changes are usually quick with Cloudflare (a few minutes), but can occasionally take up to an hour to fully settle everywhere.
2. Go back to the Render **Settings → Custom Domains** tab from Part 4 and refresh the page — once it's connected properly, the status next to `prep.thecommonpeople.co.uk` should change from "Pending" to a green "Verified" or "Issued" (Render automatically issues its own SSL certificate for the domain too, on top of Cloudflare's).
3. Open a new browser tab and go to **`https://prep.thecommonpeople.co.uk`**. You should see the Interview Prep app.

If it doesn't load straight away, wait 15–20 minutes and try again — this is almost always just DNS taking time, not something broken.

---

## Part 8 — Later: adding real AI and payment functionality

The app works today with placeholder company research, a basic gap-analysis, and no live
payments (see the README inside the zip for the full breakdown of what's real vs. a
placeholder). When you're ready to switch these on:

1. In Render, go to your service → **Environment** tab.
2. Click **Add Environment Variable** for each of: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY` (only add the ones you're ready to use).
3. Click **Save Changes** — Render will automatically redeploy the app with those keys available to it.
4. The actual code changes needed to *use* those keys (the "AI upgrade points") still need writing — happy to do that with you whenever you're ready for that phase.

**Never** paste API keys into the code itself or into GitHub — always add them here, in Render's Environment tab, where they stay private.

---

## Part 9 — Link to it from the main site

Once `prep.thecommonpeople.co.uk` is live, add a button or link on the relevant guide
pages of the-common-people.com pointing to it — e.g. on the Interview Prep Pack guide,
something like "Want this tailored to your actual interview? Get your personalised
report →" linking to `https://prep.thecommonpeople.co.uk`.

---

## Troubleshooting

- **"This site can't be reached" on prep.thecommonpeople.co.uk** — almost always DNS still propagating. Wait 20–30 minutes, try again. If it's been hours, double-check the CNAME record in Cloudflare exactly matches the target Render gave you.
- **"Too many redirects" error** — check Part 6, the SSL/TLS mode must be Full, not Flexible.
- **Render shows "Deploy failed"** — click into the failed deploy's log and look for a red error line near the bottom; it's almost always a typo in the Build or Start command from Part 3, step 5.
- **The app loads but looks broken (no styling)** — check that the whole `public` folder (with `style.css` and `app.js` inside it) was uploaded in Part 2, not just `index.html`.
