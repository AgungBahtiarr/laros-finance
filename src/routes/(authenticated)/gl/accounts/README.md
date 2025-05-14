# Chart of Accounts Documentation

The Chart of Accounts (COA) structure in Laros Finance is designed to provide a flexible, hierarchical accounting system that follows standard accounting principles while accommodating the specific needs of the business.

## Account Structure Overview

The COA is organized into several layers:

1. **Account Types** - The fundamental classifications (Asset, Liability, Equity, Revenue, Expense)
2. **Account Groups** - Functional groupings within each account type (e.g., Cash and Equivalents, Receivables)
3. **Accounts** - Individual accounts organized hierarchically with parent-child relationships

## Account Types

Account types represent the five fundamental categories in accounting:

- **Asset** (Normal Balance: DEBIT) - Resources owned by the business
- **Liability** (Normal Balance: CREDIT) - Obligations owed to others
- **Equity** (Normal Balance: CREDIT) - Owner's interest in the business
- **Revenue** (Normal Balance: CREDIT) - Income earned from business activities
- **Expense** (Normal Balance: DEBIT) - Costs incurred in business operations

Each account type has a "normal balance" direction (debit or credit) that determines how increases and decreases affect account balances.

## Account Groups

Account groups provide functional classification within each account type. They help organize accounts by their purpose and nature. Examples include:

- **Cash and Equivalents** (Type: Asset) - Highly liquid assets
- **Receivables** (Type: Asset) - Amounts owed to the business
- **Fixed Assets** (Type: Asset) - Long-term tangible assets
- **Retained Earnings** (Type: Equity) - Accumulated earnings retained in the business
- **Current Earnings** (Type: Equity) - Earnings for the current period

Each account group has:
- A unique code (e.g., CASH_AND_EQUIV, RETAINED_EARNING)
- A name
- An associated account type
- A balance type (DEBIT or CREDIT)
- Optional description

## Individual Accounts

Individual accounts are the most granular level in the COA. They can be organized hierarchically, with parent-child relationships forming a tree structure. Each account has:

- A unique numeric code (e.g., 1101, 2301)
- A name
- An account type
- An optional account group
- An optional parent account
- A level indicating its depth in the hierarchy
- An active/inactive status
- An optional balance type override (to handle contra accounts)

## Numbering Convention

The account numbering follows a hierarchical pattern:

- Level 1: Main categories (e.g., 1000 for Assets, 2000 for Liabilities)
- Level 2: Subcategories (e.g., 1100 for Current Assets, 1200 for Fixed Assets)
- Level 3: Detailed accounts (e.g., 1101 for Cash, 1102 for Bank)

## Special Cases

### Contra Accounts
Contra accounts have a balance type opposite to their account type's normal balance. For example, Accumulated Depreciation is an asset account with a credit balance. These accounts use the balance type override field.

### Retained Earnings
Retained Earnings represents accumulated profits/losses from previous periods. It is typically an equity account with a credit balance.

### Current Earnings
Current Earnings or "Laba (Rugi) Tahun Berjalan" represents the net income/loss for the current fiscal period. It is an equity account with a credit balance.

## Best Practices

1. **Consistent Naming**: Use clear, consistent naming conventions
2. **Logical Hierarchy**: Maintain a logical parent-child relationship
3. **Appropriate Classification**: Ensure accounts are assigned to the correct type and group
4. **Code Structure**: Follow the established numbering pattern
5. **Documentation**: Document the purpose of each account in its description

## Technical Implementation

The COA structure is implemented in the database schema with the following tables:

- `account_type`: Defines the fundamental account types
- `account_group`: Defines functional groupings of accounts
- `chart_of_account`: Stores individual account records with hierarchical relationships