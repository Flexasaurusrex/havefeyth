# 🚀 DEPLOYMENT STEPS

## Step-by-Step Guide

### 1️⃣ Push to GitHub (2 minutes)

```bash
# In the project folder
git init
git add .
git commit -m "Initial commit: HAVE FEYTH"
git branch -M main

# Create repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/have-feyth.git
git push -u origin main
```

### 2️⃣ Deploy to Vercel (2 minutes)

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "Add New..." → "Project"
4. Import your `have-feyth` repository
5. Keep all default settings
6. Click "Deploy"
7. **SAVE YOUR URL** (example: `have-feyth-abc123.vercel.app`)

✅ Your site is now live (but not configured yet)!

### 3️⃣ Set Up Privy (5 minutes)

1. Go to https://privy.io
2. Sign up / Log in
3. Create new app → Choose a name
4. **Configure domains:**
   - Go to Settings → General
   - Add domain: `localhost:3000` (for testing)
   - Add domain: `YOUR-VERCEL-URL.vercel.app` (production)
5. **Enable login methods:**
   - Settings → Login Methods
   - Turn ON: Twitter
   - Turn ON: Farcaster
   - Turn ON: Wallet
6. **Set blockchain:**
   - Settings → Wallets → Default chain
   - Select: Base (Chain ID 8453)
7. **Copy App ID:**
   - Settings → General
   - Copy "App ID" (starts with `clp...`)

### 4️⃣ Set Up Supabase (5 minutes)

1. Go to https://supabase.com
2. Sign up / Log in
3. Create new project:
   - Name: `have-feyth`
   - Database password: (choose strong password)
   - Region: Choose closest to users
   - Click "Create new project"
4. **Run SQL:**
   - Wait for project to finish setting up
   - Go to "SQL Editor" in left sidebar
   - Click "New query"
   - Copy entire contents of `supabase/schema.sql` file
   - Paste and click "Run"
   - Should see "Success" message
5. **Get credentials:**
   - Go to Settings (gear icon) → API
   - Copy "Project URL"
   - Copy "anon public" key

### 5️⃣ Get Contract Addresses (Separate Process)

You'll need to deploy smart contracts separately. For now, you can:
- Use a test/placeholder address: `0x0000000000000000000000000000000000000000`
- Or deploy contracts first (see contract deployment guide)

### 6️⃣ Configure Vercel Environment Variables (3 minutes)

1. Go to Vercel dashboard → Your project
2. Click "Settings" → "Environment Variables"
3. Add these one by one:

| Variable Name | Value | Where to get it |
|--------------|-------|-----------------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | `clp...` | Privy dashboard → Settings → General |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase → Settings → API |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | `0x...` | Your deployed contract (or placeholder) |
| `NEXT_PUBLIC_CHAIN_ID` | `8453` | Base mainnet chain ID |
| `NEXT_PUBLIC_RPC_URL` | `https://mainnet.base.org` | Base RPC endpoint |
| `NEXT_PUBLIC_ADMIN_ADDRESS` | `0x...` | Your wallet address |

4. Make sure to select all three environments: Production, Preview, Development

### 7️⃣ Redeploy (1 minute)

1. Go to "Deployments" tab in Vercel
2. Find your latest deployment
3. Click "..." menu → "Redeploy"
4. Wait ~1 minute for build to complete

### 8️⃣ Test! (5 minutes)

1. Visit your Vercel URL
2. Click "Connect Wallet"
3. Should see Privy modal
4. Connect wallet and/or Twitter/Farcaster
5. Type a message → Eye should glow ✨
6. (Sharing won't work until contracts are deployed)

## 🎉 You're Live!

Your frontend is deployed and ready. Next steps:
1. Deploy smart contracts to Base
2. Update `NEXT_PUBLIC_CONTRACT_ADDRESS` in Vercel
3. Fund contract with tokens
4. Test full flow end-to-end

## 🔄 Making Updates

After initial deploy, any changes to GitHub will auto-deploy:

```bash
git add .
git commit -m "Update message"
git push
```

Vercel will automatically build and deploy!

## 🐛 Common Issues

**"Error loading Privy"**
→ Check App ID is correct and domain is whitelisted

**"Database connection failed"**
→ Verify Supabase URL and key, confirm schema was run

**Deploy failed**
→ Check build logs in Vercel, usually missing env vars

**Social auth not working**
→ Verify domain is whitelisted in Privy dashboard

---

**Need help?** Check README.md or reach out!
