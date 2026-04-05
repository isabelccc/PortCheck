-- Optional: run with psql after exporting DATABASE_URL, or:
--   psql "$DATABASE_URL" -f packages/db/seed.sql
--
-- Idempotent: uses fixed UUIDs and ON CONFLICT DO NOTHING.

BEGIN;

INSERT INTO funds (id, name, ticker) VALUES
  ('f0000001-0000-4000-8000-000000000001', 'Corgi Innovation ETF', 'CORGX'),
  ('f0000002-0000-4000-8000-000000000002', 'Tech Anchor Fund', 'TANCH')
ON CONFLICT (id) DO NOTHING;

INSERT INTO documents (id, fund_id, slug, title) VALUES
  ('d0000001-0000-4000-8000-000000000001', 'f0000001-0000-4000-8000-000000000001', 'risk-factors', 'Risk Factors'),
  ('d0000002-0000-4000-8000-000000000002', 'f0000001-0000-4000-8000-000000000001', 'fees-and-expenses', 'Fees and Expenses'),
  ('d0000003-0000-4000-8000-000000000003', 'f0000001-0000-4000-8000-000000000001', 'ai-use-disclosure', 'Use of Artificial Intelligence'),
  ('d0000004-0000-4000-8000-000000000004', 'f0000002-0000-4000-8000-000000000002', 'risk-factors', 'Risk Factors')
ON CONFLICT (fund_id, slug) DO NOTHING;

INSERT INTO document_versions (id, document_id, version, content, status, parent_version_id) VALUES
  (
    'b0000001-0000-4000-8000-000000000001',
    'd0000001-0000-4000-8000-000000000001',
    '2025.03.1',
    E'Principal risks include market risk, sector concentration in technology and innovation themes,\nand the possibility of greater volatility than broad market indices. The Fund may invest in\nsmaller-capitalization companies, which can be more volatile and less liquid.\n\nCybersecurity incidents affecting issuers or service providers may disrupt operations and\nadversely affect Fund performance.',
    'draft',
    NULL
  ),
  (
    'b0000002-0000-4000-8000-000000000002',
    'd0000001-0000-4000-8000-000000000001',
    '2025.04.1',
    E'Principal risks include market risk, sector concentration in technology and innovation themes,\nand the possibility of greater volatility than broad market indices. The Fund may invest in\nsmaller-capitalization companies, which can be more volatile and less liquid.\n\nCybersecurity incidents affecting issuers or service providers may disrupt operations and\nadversely affect Fund performance.\n\nAdded April 2025: The Fund may obtain exposure to digital asset-linked instruments where\npermitted by the prospectus; such exposure may amplify volatility and liquidity risk.',
    'in_review',
    'b0000001-0000-4000-8000-000000000001'
  ),
  (
    'b0000003-0000-4000-8000-000000000003',
    'd0000002-0000-4000-8000-000000000002',
    '2025.04.1',
    E'Management fee: 0.49% per annum of average daily net assets.\nOther expenses (estimated): 0.05%. Total annual fund operating expenses: 0.54%.\n\nExample: A $10,000 investment with a 5% annual return would pay approximately $55 in expenses\nin the first year under the stated assumptions in the prospectus fee table.',
    'approved',
    NULL
  ),
  (
    'b0000004-0000-4000-8000-000000000004',
    'd0000003-0000-4000-8000-000000000003',
    '2025.04.1',
    E'The adviser may use internally developed tools that incorporate statistical and language models\nto support research workflows. Human portfolio managers remain responsible for investment\ndecisions, and model outputs are subject to internal validation and documentation controls.\n\nThere is no guarantee that model-assisted processes will improve results or avoid error.',
    'draft',
    NULL
  ),
  (
    'b0000005-0000-4000-8000-000000000005',
    'd0000004-0000-4000-8000-000000000004',
    '2025.01.1',
    E'Investing involves risk, including possible loss of principal. The Fund is subject to equity\nsecurities risk, foreign investment risk, and currency risk where applicable.',
    'approved',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

COMMIT;
