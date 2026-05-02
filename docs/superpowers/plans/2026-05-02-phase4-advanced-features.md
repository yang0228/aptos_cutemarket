# Phase 4: Advanced Features Implementation Plan

**Goal:** Add market creation UI, claim winnings, and P&L tracking.

**Architecture:** Create market creation form calling `market_core::create_market`, add claim winnings button calling `oracle::claim_winnings`, enhance Portfolio with P&L calculations.

**Tech Stack:** React 18, TypeScript, @aptos-labs/ts-sdk, Tailwind CSS

---

### Task 1: Create Market Creation Page

**Files:**
- Create: `src/pages/CreateMarket.tsx`
- Modify: `src/App.tsx` (add route)

The form calls `market_core::create_market` with these arguments:
```
(name: String, description: String, options: vector<String>, end_timestamp: u64,
 category: u8, resolution_type: u8, pyth_price_id: vector<u8>,
 pyth_threshold: u64, pyth_above_wins: bool, initial_liquidity: u64)
```

- [ ] Create CreateMarket.tsx with form fields
- [ ] Add /create route to App.tsx
- [ ] Verify build, commit

---

### Task 2: Create ClaimWinnings Component + Hook

**Files:**
- Create: `src/components/ClaimButton.tsx`

The button calls `oracle::claim_winnings(market_id)` for settled markets where the user has winning positions.

- [ ] Create ClaimButton component
- [ ] Integrate into Portfolio page
- [ ] Verify build, commit

---

### Task 3: Enhance Portfolio with P&L

**Files:**
- Modify: `src/hooks/useUserPositions.ts` (add currentPrice, P&L)
- Modify: `src/pages/Portfolio.tsx` (show P&L per position)

- [ ] Update useUserPositions to fetch current prices via `amm::get_option_price`
- [ ] Update Portfolio page to show unrealized P&L
- [ ] Verify build, commit

---

### Task 4: Add Navigation Link

**Files:**
- Modify: `src/components/Header.tsx` (add /create and /portfolio links)

- [ ] Add nav links to Header
- [ ] Verify build, commit
