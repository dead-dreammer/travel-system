-- ============================================================
-- Travel Management System — Initial Schema
-- PostgreSQL — af-south-1
-- ============================================================

-- Departments and employees (mirror from HR system, read-only reference)
CREATE TABLE employees (
  id VARCHAR PRIMARY KEY,
  employee_number VARCHAR UNIQUE,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  job_title VARCHAR,
  department_name VARCHAR,
  manager_id VARCHAR,
  travel_tier VARCHAR DEFAULT 'standard' -- standard, senior, executive
);

-- Travel policies
CREATE TABLE travel_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  applies_to VARCHAR DEFAULT 'all', -- all, tier:standard, tier:senior, tier:executive
  domestic_flight_class VARCHAR DEFAULT 'economy', -- economy, business
  international_flight_class VARCHAR DEFAULT 'economy',
  international_business_threshold_hours INT DEFAULT 6, -- upgrade to business if flight > N hours
  max_hotel_domestic_zar NUMERIC(10,2) DEFAULT 1500,
  max_hotel_international_usd NUMERIC(10,2) DEFAULT 200,
  per_diem_domestic_zar NUMERIC(10,2) DEFAULT 450,
  advance_booking_days INT DEFAULT 14,
  requires_approval_above_zar NUMERIC(10,2) DEFAULT 5000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Travel requests
CREATE TABLE travel_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_number VARCHAR UNIQUE,
  employee_id VARCHAR NOT NULL,
  trip_type VARCHAR NOT NULL, -- domestic, international
  purpose VARCHAR NOT NULL,
  destination_city VARCHAR NOT NULL,
  destination_country VARCHAR NOT NULL DEFAULT 'South Africa',
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  estimated_cost_zar NUMERIC(10,2),
  status VARCHAR DEFAULT 'pending', -- pending, manager_approved, travel_approved, finance_approved, booked, completed, rejected, cancelled
  priority VARCHAR DEFAULT 'normal', -- normal, urgent
  notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approval steps
CREATE TABLE travel_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES travel_requests(id),
  approver_id VARCHAR,
  approver_name VARCHAR,
  approver_role VARCHAR, -- line_manager, travel_coordinator, finance
  status VARCHAR, -- pending, approved, rejected
  comments TEXT,
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flight bookings
CREATE TABLE flight_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES travel_requests(id),
  booking_reference VARCHAR,
  airline VARCHAR,
  flight_number VARCHAR,
  departure_airport VARCHAR,
  arrival_airport VARCHAR,
  departure_datetime TIMESTAMPTZ,
  arrival_datetime TIMESTAMPTZ,
  flight_class VARCHAR, -- economy, business, first
  fare_zar NUMERIC(10,2),
  is_return BOOLEAN DEFAULT false,
  leg VARCHAR DEFAULT 'outbound', -- outbound, return
  status VARCHAR DEFAULT 'confirmed', -- confirmed, cancelled, changed
  booked_by VARCHAR,
  booked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accommodation bookings
CREATE TABLE accommodation_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES travel_requests(id),
  hotel_name VARCHAR,
  city VARCHAR,
  country VARCHAR,
  check_in DATE,
  check_out DATE,
  nights INT,
  rate_per_night_zar NUMERIC(10,2),
  total_zar NUMERIC(10,2),
  booking_reference VARCHAR,
  status VARCHAR DEFAULT 'confirmed',
  booked_by VARCHAR,
  booked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Car hire
CREATE TABLE car_hire_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES travel_requests(id),
  provider VARCHAR,
  vehicle_category VARCHAR,
  pickup_location VARCHAR,
  dropoff_location VARCHAR,
  pickup_datetime TIMESTAMPTZ,
  dropoff_datetime TIMESTAMPTZ,
  total_zar NUMERIC(10,2),
  booking_reference VARCHAR,
  status VARCHAR DEFAULT 'confirmed'
);

-- Expense claims
CREATE TABLE expense_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES travel_requests(id),
  employee_id VARCHAR NOT NULL,
  claim_number VARCHAR UNIQUE,
  status VARCHAR DEFAULT 'draft', -- draft, submitted, approved, rejected, paid
  total_zar NUMERIC(10,2),
  submission_date DATE,
  approval_date DATE,
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense line items
CREATE TABLE expense_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID REFERENCES expense_claims(id),
  category VARCHAR, -- meals, transport, accommodation, incidentals, visa_fees, other
  description VARCHAR,
  expense_date DATE,
  amount_original NUMERIC(10,2),
  currency VARCHAR DEFAULT 'ZAR',
  exchange_rate NUMERIC(10,6) DEFAULT 1,
  amount_zar NUMERIC(10,2),
  receipt_url VARCHAR,
  is_per_diem BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per diem rates (SARS-aligned)
CREATE TABLE per_diem_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country VARCHAR NOT NULL,
  city VARCHAR,
  rate_zar NUMERIC(10,2) NOT NULL,
  effective_date DATE NOT NULL,
  source VARCHAR DEFAULT 'SARS'
);

-- Passport and travel documents
CREATE TABLE travel_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id VARCHAR NOT NULL,
  document_type VARCHAR, -- passport, visa, travel_permit
  document_number VARCHAR,
  issuing_country VARCHAR,
  issue_date DATE,
  expiry_date DATE,
  visa_countries TEXT[], -- for visas, which countries it covers
  status VARCHAR DEFAULT 'active', -- active, expired, cancelled
  document_url VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visa requirements reference
CREATE TABLE visa_requirements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  destination_country VARCHAR NOT NULL,
  passport_country VARCHAR NOT NULL DEFAULT 'South Africa',
  requirement VARCHAR, -- visa_free, visa_on_arrival, e_visa, visa_required
  max_stay_days INT,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Travel advisories
CREATE TABLE travel_advisories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country VARCHAR,
  city VARCHAR,
  level VARCHAR, -- safe, caution, high_risk, do_not_travel
  title VARCHAR,
  description TEXT,
  issued_by VARCHAR DEFAULT 'Travel Coordinator',
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Travel reports / analytics cache
CREATE TABLE travel_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_year INT,
  period_month INT,
  department VARCHAR,
  total_trips INT DEFAULT 0,
  total_spend_zar NUMERIC(12,2) DEFAULT 0,
  domestic_trips INT DEFAULT 0,
  international_trips INT DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_travel_requests_employee ON travel_requests(employee_id);
CREATE INDEX idx_travel_requests_status ON travel_requests(status);
CREATE INDEX idx_travel_requests_dates ON travel_requests(departure_date, return_date);
CREATE INDEX idx_expense_claims_employee ON expense_claims(employee_id);
CREATE INDEX idx_travel_documents_employee ON travel_documents(employee_id);
CREATE INDEX idx_travel_documents_expiry ON travel_documents(expiry_date);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER travel_requests_updated_at BEFORE UPDATE ON travel_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed per diem rates (SARS 2024/25)
INSERT INTO per_diem_rates (country, city, rate_zar, effective_date) VALUES
('South Africa', NULL, 452, '2024-03-01'),
('United States', 'New York', 4200, '2024-03-01'),
('United States', NULL, 3500, '2024-03-01'),
('United Kingdom', 'London', 4800, '2024-03-01'),
('United Kingdom', NULL, 3800, '2024-03-01'),
('Germany', NULL, 3200, '2024-03-01'),
('Kenya', 'Nairobi', 2100, '2024-03-01'),
('Nigeria', 'Lagos', 2400, '2024-03-01'),
('Zimbabwe', NULL, 1800, '2024-03-01'),
('Australia', 'Sydney', 3800, '2024-03-01'),
('UAE', 'Dubai', 3600, '2024-03-01'),
('China', NULL, 2800, '2024-03-01'),
('India', NULL, 2000, '2024-03-01');

-- Seed visa requirements (South African passport)
INSERT INTO visa_requirements (destination_country, requirement, max_stay_days, notes) VALUES
('Zimbabwe', 'visa_free', 30, 'South African passport holders — visa free up to 30 days'),
('Botswana', 'visa_free', 90, 'Visa free up to 90 days'),
('Namibia', 'visa_free', 90, 'Visa free up to 90 days'),
('Mozambique', 'visa_on_arrival', 30, 'Visa on arrival available at major ports of entry'),
('Kenya', 'e_visa', 90, 'Apply online at evisa.go.ke before travel'),
('United Kingdom', 'visa_required', NULL, 'Standard Visitor Visa required — apply at VFS Global'),
('United States', 'visa_required', NULL, 'B1/B2 visitor visa or ESTA if qualifying — apply well in advance'),
('Schengen Zone', 'visa_required', 90, 'Schengen short-stay visa — apply at relevant embassy'),
('UAE', 'visa_on_arrival', 30, '30-day visa on arrival for South African passport holders'),
('Australia', 'visa_required', NULL, 'Electronic Travel Authority (ETA) or visitor visa required'),
('India', 'e_visa', 60, 'e-Visa available online — apply at indianvisaonline.gov.in'),
('China', 'visa_required', NULL, 'Tourist or business visa required — apply at Chinese embassy');

-- Seed default travel policies
INSERT INTO travel_policies (name, applies_to, domestic_flight_class, international_flight_class, international_business_threshold_hours, max_hotel_domestic_zar, max_hotel_international_usd, per_diem_domestic_zar, advance_booking_days, requires_approval_above_zar)
VALUES
('Standard Policy', 'tier:standard', 'economy', 'economy', 999, 1500, 150, 452, 14, 5000),
('Senior Policy', 'tier:senior', 'economy', 'economy', 8, 2000, 200, 452, 14, 10000),
('Executive Policy', 'tier:executive', 'business', 'business', 0, 3500, 350, 452, 7, 50000);
