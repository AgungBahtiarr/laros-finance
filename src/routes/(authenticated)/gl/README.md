# General Ledger Module for Laros Finance

This module provides a complete accounting system with general ledger functionality for the Laros Finance application.

## Features

- **Chart of Accounts Management**
  - Hierarchical account structure
  - Multiple account types (Asset, Liability, Equity, Revenue, Expense)
  - Account activation/deactivation

- **Journal Entries**
  - Create, edit, post, and reverse entries
  - Automatic balancing verification
  - Support for recurring entries

- **Financial Reports**
  - Balance Sheet
  - Income Statement
  - Cash Flow Statement
  - Custom report templates

- **Fiscal Period Management**
  - Period opening and closing
  - Year-end closing procedures

## Setup Instructions

1. **Initialize the database schema**
   ```bash
   npm run db:push
   ```

2. **Seed initial GL data**
   ```bash
   npm run db:seed:gl
   ```

3. **Access the GL module**
   - Navigate to `/gl` in the application
   - Start with setting up your Chart of Accounts

## Database Structure

The GL module uses the following tables:
- `account_type` - Types of accounts
- `chart_of_account` - Chart of accounts
- `fiscal_period` - Accounting periods
- `journal_entry` - Journal entries
- `journal_entry_line` - Lines within journal entries
- `account_balance` - Account balances per period
- `report_template` - Financial report templates
- `report_template_line` - Report template structure
- `recurring_journal_template` - Templates for recurring entries

## Development Notes

- Account balances are calculated in real-time based on journal entries
- Account codes follow a hierarchical structure (e.g., 1000, 1100, 1110)
- Posting a journal entry updates account balances in the related fiscal period
- Journal entries can only be deleted when in DRAFT status

## Integration with Asset Module

The GL module integrates with the existing asset management module:
- Asset acquisitions generate journal entries
- Depreciation expenses are recorded monthly
- Asset disposals are properly accounted for

## Future Enhancements

- Multi-currency support
- Budget management
- Cost center accounting
- Tax reporting
- Bank reconciliation