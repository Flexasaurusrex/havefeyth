# ✅ DEPLOYMENT CHECKLIST

Print this out or keep it handy while deploying!

## Before You Start
- [ ] Extract the ZIP file
- [ ] Have your wallet ready (MetaMask, Coinbase Wallet, etc.)
- [ ] Have GitHub account ready
- [ ] Set aside ~20 minutes

---

## GitHub Setup (5 min)
- [ ] Create new GitHub repository
- [ ] Name it `have-feyth` (or your choice)
- [ ] Make it public or private
- [ ] Don't initialize with README
- [ ] Copy the repo URL

---

## Push Code (2 min)
```bash
cd have-feyth-deploy
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_GITHUB_URL
git push -u origin main
```
- [ ] Code pushed successfully

---

## Vercel Deployment (3 min)
- [ ] Go to vercel.com and sign in
- [ ] Click "Add New..." → "Project"
- [ ] Import your GitHub repo
- [ ] Click "Deploy"
- [ ] **Write down your Vercel URL:** _________________
- [ ] Deployment successful

---

## Privy Setup (5 min)
- [ ] Go to privy.io
- [ ] Create account / Sign in
- [ ] Create new app
- [ ] Add domains:
  - [ ] `localhost:3000`
  - [ ] Your Vercel URL
- [ ] Enable login methods:
  - [ ] Twitter
  - [ ] Farcaster
  - [ ] Wallet
- [ ] Set default chain to Base (8453)
- [ ] **Write down App ID:** _________________

---

## Supabase Setup (5 min)
- [ ] Go to supabase.com
- [ ] Create account / Sign in
- [ ] Create new project: `have-feyth`
- [ ] Wait for project to finish setting up (~2 min)
- [ ] Go to SQL Editor
- [ ] Copy/paste contents of `supabase/schema.sql`
- [ ] Click "Run"
- [ ] Verify "Success" message
- [ ] Go to Settings → API
- [ ] **Write down Project URL:** _________________
- [ ] **Write down anon key:** _________________

---

## Add Environment Variables to Vercel (5 min)
Go to Vercel → Your Project → Settings → Environment Variables

Add each of these:

| Variable | Your Value | ✓ |
|----------|-----------|---|
| `NEXT_PUBLIC_PRIVY_APP_ID` | _________________ | [ ] |
| `NEXT_PUBLIC_SUPABASE_URL` | _________________ | [ ] |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | _________________ | [ ] |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | `0x0000000000000000000000000000000000000000` | [ ] |
| `NEXT_PUBLIC_CHAIN_ID` | `8453` | [ ] |
| `NEXT_PUBLIC_RPC_URL` | `https://mainnet.base.org` | [ ] |
| `NEXT_PUBLIC_ADMIN_ADDRESS` | _________________ (your wallet) | [ ] |

**Important:** Select all 3 environments (Production, Preview, Development)

---

## Redeploy (2 min)
- [ ] Go to Vercel → Deployments tab
- [ ] Click "..." on latest deployment
- [ ] Click "Redeploy"
- [ ] Wait for build to complete
- [ ] Check logs for any errors

---

## Test Your Site! (5 min)
- [ ] Visit your Vercel URL
- [ ] See "HAVE FEYTH" title
- [ ] See eye logo
- [ ] Click "Connect Wallet"
- [ ] Privy modal appears
- [ ] Connect wallet successfully
- [ ] Type a test message
- [ ] Eye glows when typing
- [ ] See share buttons (Twitter/Farcaster)

---

## Next Steps (Later)
- [ ] Deploy smart contracts to Base (see contract files)
- [ ] Update `NEXT_PUBLIC_CONTRACT_ADDRESS` in Vercel
- [ ] Fund contract with tokens
- [ ] Test full end-to-end flow
- [ ] Share your site!

---

## 🎉 Success Criteria

Your deployment is successful if:
✅ Site loads at your Vercel URL
✅ Eye logo displays correctly
✅ Connect wallet button works
✅ Privy modal opens
✅ Can connect wallet/Twitter/Farcaster
✅ Typing makes eye glow
✅ No console errors (press F12)

---

## 🆘 Troubleshooting

**Privy not loading:**
→ Double-check App ID in Vercel env vars
→ Verify your domain is whitelisted in Privy dashboard

**"Failed to fetch" errors:**
→ Check Supabase URL and key
→ Verify SQL schema was run

**Build failed:**
→ Check Vercel logs
→ Ensure all env vars are set

**Site loads but nothing works:**
→ Check browser console (F12)
→ Verify env vars are correct
→ Try redeploying

---

## 📞 Need Help?

Check these files in your ZIP:
- `README.md` - Full documentation
- `DEPLOY.md` - Detailed deployment guide

Good luck! 🚀👁️
