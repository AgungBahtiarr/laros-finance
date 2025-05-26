# General Ledger Setup Guide

## Prerequisites

1. PostgreSQL database running
2. Environment variables configured in `.env`:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/laros_finance
   ```

## Database Setup

### 1. Push Database Schema
```bash
npm run db:push
```

### 2. Seed Chart of Accounts
```bash
npm run db:seed:coa
```

### 3. Seed Fiscal Periods
```bash
npm run db:seed:gl
```

### 4. Seed Account Balances (Sample Data)
```bash
npm run db:seed:balances
```

### 5. Seed All GL Data (One Command)
```bash
npm run db:seed:all-gl
```

## Account Structure

### Account Types
- **ASSET**: Balance (Asset) - DEBIT balance
- **LIABILITY**: Balance (Liabilities) - CREDIT balance  
- **RETAINED_EARNING**: Retained Earning - CREDIT balance
- **PROFIT&LOSS**: Profit & Loss - CREDIT balance

### Account Groups (Examples)
- **PDP**: Pendapatan (Revenue accounts)
- **COGS**: Harga Pokok (Cost of Goods Sold)
- **BAU**: Biaya Administrasi & Umum (Admin & General Expenses)
- **BOP**: Biaya Operasional (Operational Expenses)
- **AL**: Aktiva Lancar (Current Assets)
- **AT**: Aktiva Tetap (Fixed Assets)
- **HL**: Hutang Lancar (Current Liabilities)

## Profit & Loss Report

### Features
- **Date Range Filter**: Select start and end dates
- **Period Comparison**: Compare with previous period
- **Percentage Analysis**: Show percentages relative to revenue
- **Print Support**: Print-friendly layout
- **URL State Management**: Filters saved in URL parameters

### Sample Data Included
- Revenue accounts with sample balances (Rp 180,000,000 total)
- Expense accounts with sample balances (Rp 63,000,000 total)
- Previous period data for comparison
- Net Income calculation (Revenue - Expenses)

### Accessing the Report
1. Navigate to `/gl/ledger/reports/profit-loss`
2. Select date range
3. Toggle comparison and percentage options
4. View real-time calculated results

## Data Flow

1. **Chart of Accounts** → Defines account structure
2. **Fiscal Periods** → Monthly periods for current year
3. **Account Balances** → Opening balance + movements = closing balance
4. **Reports** → Query account balances and calculate totals

## Troubleshooting

### No Data Showing
1. Verify fiscal periods exist for selected date range
2. Check account balances are seeded for the period
3. Ensure account types and groups are properly linked

### Incorrect Account Classification
1. Check account group codes (PDP for revenue, B* for expenses)
2. Verify account type assignments
3. Review account naming conventions

### Period Comparison Not Working
1. Ensure previous period has fiscal period record
2. Verify account balances exist for previous period
3. Check date range calculation logic

## Database Scripts Reference

```bash
# Reset and rebuild everything
npm run db:push

# Individual seed commands
npm run db:seed:coa     # Chart of accounts structure
npm run db:seed:gl      # Fiscal periods
npm run db:seed:balances # Sample account balances

# All-in-one GL setup
npm run db:seed:all-gl
```