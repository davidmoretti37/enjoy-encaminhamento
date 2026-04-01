-- Add 'annual-insurance' to payment_type enum
ALTER TYPE payment_type ADD VALUE IF NOT EXISTS 'annual-insurance';
