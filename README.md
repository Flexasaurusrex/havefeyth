# HAVE FEYTH 👁️

Minimalist social proof-of-goodwill platform. Share messages, receive tokens.

## 🚀 Quick Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/have-feyth.git
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Connect your GitHub repo
4. Click "Deploy"
5. **Save your deployment URL** (e.g., `have-feyth.vercel.app`)

### 3. Set Up Services

#### Privy (Authentication)
1. Go to [privy.io](https://privy.io) → Create account
2. Create new app
3. **Add domains:**
   - `localhost:3000`
   - `your-deployment-url.vercel.app`
4. Enable: **Twitter** + **Farcaster** login methods
5. Set default chain: **Base (8453)**
6. Copy your **App ID**

#### Supabase (Database)
1. Go to [supabase.com](https://supabase.com) → Create account
2. Create new project
3. Go to SQL Editor
4. Paste contents of `supabase/schema.sql` and run it
5. Copy your **Project URL** and **anon key** from Settings → API

#### Smart Contracts (Base Network)
See separate deployment guide for contracts, or contact for assistance.
You'll need:
- Deployed `HaveFeyth.sol` contract address
- Your admin wallet address

### 4. Configure Environment Variables

In Vercel dashboard:
1. Go to your project → Settings → Environment Variables
2. Add these variables:

```
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_ADMIN_ADDRESS=0xYourWalletAddress
```

### 5. Redeploy

After adding environment variables:
- Go to Deployments tab
- Click "..." on latest deployment
- Click "Redeploy"

## ✅ You're Live!

Visit your URL and test:
1. Connect wallet
2. Type a message → Eye glows
3. Share to Twitter/Farcaster
4. Receive tokens
5. Check `/admin` (if you're the admin)

## 🎨 Features

- Minimalist UI with glowing eye
- Privy wallet + social auth
- 24hr cooldown per user
- Automatic token rewards
- Admin panel with analytics
- Twitter & Farcaster integration

## 🔧 Local Development

```bash
npm install
cp .env.example .env.local
# Fill in .env.local with your values
npm run dev
```

Visit http://localhost:3000

## 📁 Key Files

```
app/
├── page.tsx          # Main landing page
├── admin/page.tsx    # Admin dashboard
├── layout.tsx        # Root layout
└── globals.css       # Global styles

components/
└── Providers.tsx     # Privy + Wagmi setup

lib/
├── contract.ts       # Smart contract config
├── supabase.ts       # Database functions
└── utils.ts          # Helper functions

supabase/
└── schema.sql        # Database schema (run this!)
```

## 🐛 Troubleshooting

**Privy not loading?**
- Check App ID in Vercel env vars
- Verify domain is whitelisted in Privy dashboard

**Database errors?**
- Confirm you ran `supabase/schema.sql`
- Check Supabase URL and key are correct

**Can't claim tokens?**
- Verify contract address is correct
- Check contract has token balance
- Confirm 24hr cooldown has passed

**Share buttons not working?**
- Check popup blockers
- Verify social accounts are connected in Privy

## 📞 Support

- **Privy**: [docs.privy.io](https://docs.privy.io)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Base**: [docs.base.org](https://docs.base.org)

## 🎯 Tech Stack

- Next.js 14 + TypeScript
- Tailwind CSS
- Privy (Auth)
- Supabase (Database)
- Base L2 (Blockchain)
- Vercel (Hosting)

---

**Built with faith.** 👁️✨
