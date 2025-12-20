# Collaboration Airdrop Process Documentation

## Overview

This system records eligible users for token rewards during collaborations and allows batch airdrops at the end of each campaign. This prevents direct contract calls by farmers and gives you full control over token distribution.

---

## How It Works

### 1. User Claims During Collab
- User shares on social media OR posts confession
- **OpenRank validation runs** (blocks farmers with low scores)
- If eligible → Recorded in `collaboration_claims` table
- User sees: "Claim successful! Tokens will be airdropped at end of collab"
- **NO immediate token transfer** (prevents farming)

### 2. Database Tracking
- Every claim tracked with:
  - Wallet address
  - Token amount
  - Timestamp
  - User profile info
- OpenRank activity logged in `openrank_activity` table

### 3. Admin Export
- At end of collab → Export CSV of all eligible addresses
- Review for suspicious patterns
- Batch airdrop using Disperse.app or custom script

### 4. Token Distribution
- Send tokens in single batch transaction
- Mark collaboration as distributed
- Gas efficient (vs individual claims)

---

## Step-by-Step: Executing an Airdrop

### Step 1: End the Collaboration

```sql
-- In Supabase, deactivate the collab
UPDATE collaborations
SET is_active = false
WHERE partner_name = 'TYSM';
```

Or use the admin panel toggle.

### Step 2: Export Claimers

1. Go to **`/admin/collaborations`**
2. Find the collaboration
3. Click **"📥 Export X Claims for Airdrop"** button
4. CSV downloads with:
   - Wallet Address
   - Total Amount
   - Claim Count
   - Display Name
   - Farcaster Handle
   - First/Last Claim timestamps

**Example CSV:**
```csv
Wallet Address,Total Amount,Claim Count,Display Name,Farcaster Handle,First Claim,Last Claim
0xAbC...123,300000,1,Alice,@alice,2025-12-19 10:00,2025-12-19 10:00
0xDeF...456,600000,2,Bob,@bob,2025-12-19 11:00,2025-12-20 14:30
0xGhI...789,300000,1,Charlie,@charlie,2025-12-19 12:00,2025-12-19 12:00
```

### Step 3: Review & Verify

1. **Open the CSV**
2. **Check totals:**
   ```
   Total Claims: Sum of all amounts
   Total Addresses: Count of unique wallets
   ```
3. **Look for suspicious patterns:**
   - Same address claiming many times in short timespan
   - Very new accounts (check Farcaster handles)
   - Addresses with no display name/handle
4. **Remove suspicious addresses** (optional)
5. **Verify you have enough tokens:**
   ```
   Token Balance >= Total Claims
   ```

### Step 4: Batch Airdrop

#### Option A: Using Disperse.app (Recommended)

1. **Go to** https://disperse.app
2. **Connect wallet** (must have the tokens)
3. **Select token** (paste TYSM token address)
4. **Upload CSV** or paste addresses
   - Format: `address,amount` (one per line)
   - Example:
     ```
     0xAbC...123,300000
     0xDeF...456,600000
     0xGhI...789,300000
     ```
5. **Review transaction details**
6. **Execute** batch send
7. **Wait for confirmation**

#### Option B: Custom Script

```javascript
import { createPublicClient, createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const account = privateKeyToAccount('0x...');
const client = createWalletClient({
  account,
  chain: base,
  transport: http()
});

// Read CSV data
const recipients = [
  { address: '0xAbC...123', amount: 300000n },
  { address: '0xDeF...456', amount: 600000n },
  // ... more
];

// Batch transfer (if token supports it)
await client.writeContract({
  address: TYSM_TOKEN_ADDRESS,
  abi: ERC20_ABI,
  functionName: 'batchTransfer',
  args: [
    recipients.map(r => r.address),
    recipients.map(r => r.amount)
  ]
});

// OR individual transfers in loop
for (const recipient of recipients) {
  await client.writeContract({
    address: TYSM_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [recipient.address, recipient.amount]
  });
}
```

### Step 5: Mark as Distributed (Optional)

```sql
-- Add column to track distribution (run once)
ALTER TABLE collaborations
ADD COLUMN IF NOT EXISTS tokens_distributed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS distribution_date TIMESTAMP;

-- Mark as distributed
UPDATE collaborations
SET 
  tokens_distributed = true,
  distribution_date = NOW()
WHERE partner_name = 'TYSM';
```

---

## Advantages Over Direct Claims

| Direct Claims | Airdrop System |
|--------------|----------------|
| ❌ Farmers can call contract directly | ✅ No contract calls during collab |
| ❌ Can't review before sending | ✅ Full review before distribution |
| ❌ Individual transactions (high gas) | ✅ Batch transaction (low gas) |
| ❌ Hard to track who claimed | ✅ Complete CSV export |
| ❌ Can't pause or adjust | ✅ Can review/adjust before sending |

---

## Safety Checks

### Before Export:
- ✅ Collaboration ended (is_active = false)
- ✅ OpenRank threshold was appropriate
- ✅ Activity monitor showed legitimate claims

### Before Airdrop:
- ✅ CSV reviewed for suspicious addresses
- ✅ Total amount ≤ Token balance
- ✅ Addresses look legitimate (have profiles)
- ✅ Test with 1-2 addresses first

### After Airdrop:
- ✅ Verify tokens received (check BaseScan)
- ✅ Mark collaboration as distributed
- ✅ Announce to community

---

## Monitoring & Analytics

### Check Total Claims
```sql
SELECT 
  COUNT(DISTINCT wallet_address) as unique_claimers,
  COUNT(*) as total_claims,
  SUM(token_amount) as total_tokens
FROM collaboration_claims
WHERE collaboration_id = 'COLLAB_ID';
```

### Check OpenRank Distribution
```sql
SELECT 
  cc.wallet_address,
  cc.token_amount,
  oa.score,
  oa.result
FROM collaboration_claims cc
LEFT JOIN openrank_activity oa ON oa.fid = up.farcaster_fid
LEFT JOIN user_profiles up ON up.wallet_address = cc.wallet_address
WHERE cc.collaboration_id = 'COLLAB_ID'
ORDER BY oa.score ASC;
```

### Find Suspicious Claims
```sql
-- Users who claimed many times in short period
SELECT 
  wallet_address,
  COUNT(*) as claim_count,
  MIN(claimed_at) as first_claim,
  MAX(claimed_at) as last_claim,
  EXTRACT(EPOCH FROM (MAX(claimed_at) - MIN(claimed_at)))/3600 as hours_between
FROM collaboration_claims
WHERE collaboration_id = 'COLLAB_ID'
GROUP BY wallet_address
HAVING COUNT(*) > 5
ORDER BY claim_count DESC;
```

---

## User Experience

### What Users See:

**After claiming:**
> "Claim successful! +300,000 TYSM will be airdropped at end of collab! 🎁"

**In their dashboard:**
```
💰 Pending Airdrops
TYSM: 600,000 TYSM
Ends: Dec 25, 2025
✨ Tokens will be airdropped when collaboration ends
```

### Communication Template:

```
🎁 TYSM Airdrop Complete!

Thank you to everyone who participated in the TYSM collaboration!

✅ 547 addresses eligible
✅ 164,100,000 TYSM tokens distributed
✅ Airdrop TX: [BaseScan link]

Check your wallet to see your tokens!
```

---

## Troubleshooting

### "Export shows 0 claims"
- Check if collab is_active = true (only active collabs record claims)
- Verify collaboration_id matches
- Check collaboration_claims table directly

### "User claims but not in export"
- Check if OpenRank blocked them (openrank_activity table)
- Verify wallet address format (should be lowercase)
- Check if claim timestamp is within collab period

### "Total doesn't match budget"
- Some users may have claimed multiple times
- Check remaining_budget column
- Review claims_count vs actual records

### "Disperse.app transaction fails"
- Verify token balance sufficient
- Check token approval (must approve Disperse contract)
- Try smaller batch (split into multiple)

---

## Best Practices

1. **Set Clear End Dates**
   - Communicate when collab ends
   - Set end_date in database
   - Announce airdrop timeline

2. **Monitor During Campaign**
   - Check activity monitor daily
   - Adjust OpenRank threshold if needed
   - Watch for farming patterns

3. **Review Before Sending**
   - Always review CSV
   - Test with 1-2 addresses first
   - Have community moderators verify

4. **Communicate Clearly**
   - Tell users tokens are airdropped (not instant)
   - Give estimated airdrop date
   - Announce when distributed

5. **Keep Records**
   - Save CSV exports
   - Screenshot transaction hashes
   - Document any removals/adjustments

---

## Quick Reference

### Admin Panel Access:
- **Collaborations:** `/admin/collaborations`
- **OpenRank:** `/admin/openrank`
- **Main Admin:** `/admin`

### Key Database Tables:
- **collaborations** - Collab config
- **collaboration_claims** - Who claimed what
- **openrank_activity** - Eligibility logs
- **user_profiles** - User info

### Export Format:
```
Wallet,Amount,Claims,Name,Handle,First,Last
```

### Disperse.app:
https://disperse.app

---

## Summary

1. ✅ Users claim during collab (OpenRank validated)
2. ✅ Database records eligible addresses
3. ✅ Export CSV at end
4. ✅ Review for farmers
5. ✅ Batch airdrop
6. ✅ Announce completion

**No farmers. No contract exploits. Full control.** 🛡️
