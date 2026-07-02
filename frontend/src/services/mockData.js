export const MOCK_DATA = {
  '/travel-requests': {
    requests: [
      { id: 'tr1', request_number: 'TR-2026-0001', employee_name: 'Sipho Dlamini', department: 'Engineering', trip_type: 'domestic', purpose: 'Client meeting — Standard Bank HQ', destination_city: 'Cape Town', destination_country: 'South Africa', departure_date: '2026-07-15', return_date: '2026-07-17', estimated_cost_zar: 8500, status: 'travel_approved', priority: 'normal', created_at: '2026-06-28T09:00:00Z', policy_violations: [] },
      { id: 'tr2', request_number: 'TR-2026-0002', employee_name: 'Lerato Sithole', department: 'Product', trip_type: 'international', purpose: 'AWS re:Invent conference', destination_city: 'Las Vegas', destination_country: 'United States', departure_date: '2026-11-28', return_date: '2026-12-05', estimated_cost_zar: 85000, status: 'pending', priority: 'normal', created_at: '2026-06-29T10:00:00Z', policy_violations: ['Late booking — less than 14 days before departure'] },
      { id: 'tr3', request_number: 'TR-2026-0003', employee_name: 'Thabo Mokoena', department: 'Finance', trip_type: 'domestic', purpose: 'Audit presentation — Pretoria', destination_city: 'Pretoria', destination_country: 'South Africa', departure_date: '2026-07-08', return_date: '2026-07-08', estimated_cost_zar: 2200, status: 'completed', priority: 'urgent', created_at: '2026-06-25T08:00:00Z', policy_violations: [] },
      { id: 'tr4', request_number: 'TR-2026-0004', employee_name: 'Amahle Nkosi', department: 'Human Resources', trip_type: 'international', purpose: 'SHRM annual conference', destination_city: 'London', destination_country: 'United Kingdom', departure_date: '2026-09-10', return_date: '2026-09-14', estimated_cost_zar: 62000, status: 'manager_approved', priority: 'normal', created_at: '2026-06-27T11:00:00Z', policy_violations: [] },
      { id: 'tr5', request_number: 'TR-2026-0005', employee_name: 'Zanele Khumalo', department: 'Engineering', trip_type: 'domestic', purpose: 'Team offsite — Durban', destination_city: 'Durban', destination_country: 'South Africa', departure_date: '2026-08-05', return_date: '2026-08-07', estimated_cost_zar: 6800, status: 'rejected', priority: 'normal', created_at: '2026-06-20T14:00:00Z', policy_violations: [], rejection_reason: 'Budget freeze on non-essential travel until Q4.' },
    ],
    total: 5,
  },
  '/travel-requests/tr1': {
    id: 'tr1', request_number: 'TR-2026-0001', employee_name: 'Sipho Dlamini', employee_id: 'e1', department: 'Engineering', trip_type: 'domestic', purpose: 'Client meeting — Standard Bank HQ', destination_city: 'Cape Town', destination_country: 'South Africa', departure_date: '2026-07-15', return_date: '2026-07-17', estimated_cost_zar: 8500, status: 'travel_approved', priority: 'normal', notes: 'Need to present Q2 engineering roadmap to the client.', created_at: '2026-06-28T09:00:00Z', policy_violations: [],
    approvals: [
      { id: 'ap1', approver_name: 'Lerato Sithole', approver_role: 'line_manager', status: 'approved', comments: 'Approved. Important client meeting.', actioned_at: '2026-06-28T14:00:00Z' },
      { id: 'ap2', approver_name: 'Travel Coordinator', approver_role: 'travel_coordinator', status: 'approved', comments: 'Flights and hotel arranged.', actioned_at: '2026-06-29T09:00:00Z' },
      { id: 'ap3', approver_name: 'Finance Manager', approver_role: 'finance', status: 'pending', comments: null, actioned_at: null },
    ],
    flights: [
      { id: 'fb1', airline: 'FlySafair', flight_number: 'FA101', departure_airport: 'OR Tambo (JNB)', arrival_airport: 'Cape Town (CPT)', departure_datetime: '2026-07-15T06:30:00Z', arrival_datetime: '2026-07-15T08:45:00Z', flight_class: 'economy', fare_zar: 1850, leg: 'outbound', booking_reference: 'FSA-20260715-001', status: 'confirmed' },
      { id: 'fb2', airline: 'FlySafair', flight_number: 'FA208', departure_airport: 'Cape Town (CPT)', arrival_airport: 'OR Tambo (JNB)', departure_datetime: '2026-07-17T18:00:00Z', arrival_datetime: '2026-07-17T20:15:00Z', flight_class: 'economy', fare_zar: 1650, leg: 'return', booking_reference: 'FSA-20260717-002', status: 'confirmed' },
    ],
    accommodation: [
      { id: 'ab1', hotel_name: 'Protea Hotel Cape Town Waterfront', city: 'Cape Town', country: 'South Africa', check_in: '2026-07-15', check_out: '2026-07-17', nights: 2, rate_per_night_zar: 1850, total_zar: 3700, booking_reference: 'PRO-CPT-20260715', status: 'confirmed' },
    ],
    car_hire: [],
  },
  '/approvals': [
    { id: 'ap10', request_id: 'tr2', request_number: 'TR-2026-0002', employee_name: 'Lerato Sithole', trip_type: 'international', destination: 'Las Vegas, USA', departure_date: '2026-11-28', estimated_cost_zar: 85000, status: 'pending', created_at: '2026-06-29T10:00:00Z', purpose: 'AWS re:Invent conference', policy_violations: ['Late booking — less than 14 days before departure'] },
    { id: 'ap11', request_id: 'tr4', request_number: 'TR-2026-0004', employee_name: 'Amahle Nkosi', trip_type: 'international', destination: 'London, UK', departure_date: '2026-09-10', estimated_cost_zar: 62000, status: 'pending', created_at: '2026-06-27T11:00:00Z', purpose: 'SHRM annual conference', policy_violations: [] },
  ],
  '/bookings': [
    { id: 'fb1', request_number: 'TR-2026-0001', employee_name: 'Sipho Dlamini', airline: 'FlySafair', flight_number: 'FA101', departure_airport: 'OR Tambo (JNB)', arrival_airport: 'Cape Town (CPT)', departure_datetime: '2026-07-15T06:30:00Z', flight_class: 'economy', fare_zar: 1850, leg: 'outbound', booking_reference: 'FSA-20260715-001', status: 'confirmed' },
    { id: 'fb2', request_number: 'TR-2026-0001', employee_name: 'Sipho Dlamini', airline: 'FlySafair', flight_number: 'FA208', departure_airport: 'Cape Town (CPT)', arrival_airport: 'OR Tambo (JNB)', departure_datetime: '2026-07-17T18:00:00Z', flight_class: 'economy', fare_zar: 1650, leg: 'return', booking_reference: 'FSA-20260717-002', status: 'confirmed' },
  ],
  '/bookings/upcoming': [
    { id: 'fb1', employee_name: 'Sipho Dlamini', airline: 'FlySafair', flight_number: 'FA101', departure_airport: 'JNB', arrival_airport: 'CPT', departure_datetime: '2026-07-15T06:30:00Z', flight_class: 'economy', booking_reference: 'FSA-20260715-001' },
  ],
  '/expenses': [
    { id: 'ec1', claim_number: 'EC-2026-0001', employee_name: 'Thabo Mokoena', request_number: 'TR-2026-0003', trip_destination: 'Pretoria', status: 'submitted', total_zar: 1980, submission_date: '2026-07-09', created_at: '2026-07-09T08:00:00Z' },
    { id: 'ec2', claim_number: 'EC-2026-0002', employee_name: 'Sipho Dlamini', request_number: 'TR-2026-0001', trip_destination: 'Cape Town', status: 'draft', total_zar: 3200, submission_date: null, created_at: '2026-07-01T08:00:00Z' },
  ],
  '/expenses/per-diem-rates': [
    { country: 'South Africa', city: null, rate_zar: 452 },
    { country: 'United States', city: 'New York', rate_zar: 4200 },
    { country: 'United States', city: null, rate_zar: 3500 },
    { country: 'United Kingdom', city: 'London', rate_zar: 4800 },
    { country: 'Germany', city: null, rate_zar: 3200 },
    { country: 'Kenya', city: 'Nairobi', rate_zar: 2100 },
    { country: 'UAE', city: 'Dubai', rate_zar: 3600 },
    { country: 'Australia', city: 'Sydney', rate_zar: 3800 },
  ],
  '/documents': [
    { id: 'td1', employee_name: 'Sipho Dlamini', document_type: 'passport', document_number: 'A12345678', issuing_country: 'South Africa', issue_date: '2020-03-15', expiry_date: '2030-03-14', status: 'active' },
    { id: 'td2', employee_name: 'Lerato Sithole', document_type: 'passport', document_number: 'B98765432', issuing_country: 'South Africa', issue_date: '2019-06-01', expiry_date: '2026-09-01', status: 'active' },
    { id: 'td3', employee_name: 'Lerato Sithole', document_type: 'visa', document_number: 'US-VISA-2024', issuing_country: 'United States', issue_date: '2024-01-10', expiry_date: '2026-08-09', status: 'active' },
    { id: 'td4', employee_name: 'Thabo Mokoena', document_type: 'passport', document_number: 'C11223344', issuing_country: 'South Africa', issue_date: '2022-08-20', expiry_date: '2032-08-19', status: 'active' },
    { id: 'td5', employee_name: 'Amahle Nkosi', document_type: 'passport', document_number: 'D55667788', issuing_country: 'South Africa', issue_date: '2018-04-12', expiry_date: '2026-08-12', status: 'active' },
  ],
  '/documents/expiring': [
    { id: 'td2', employee_name: 'Lerato Sithole', document_type: 'passport', document_number: 'B98765432', expiry_date: '2026-09-01', days_until_expiry: 62 },
    { id: 'td3', employee_name: 'Lerato Sithole', document_type: 'visa', document_number: 'US-VISA-2024', expiry_date: '2026-08-09', days_until_expiry: 39 },
    { id: 'td5', employee_name: 'Amahle Nkosi', document_type: 'passport', document_number: 'D55667788', expiry_date: '2026-08-12', days_until_expiry: 42 },
  ],
  '/visa-requirements': [
    { destination_country: 'Zimbabwe', requirement: 'visa_free', max_stay_days: 30, notes: 'Visa free up to 30 days for SA passport holders' },
    { destination_country: 'Botswana', requirement: 'visa_free', max_stay_days: 90, notes: 'Visa free up to 90 days' },
    { destination_country: 'Namibia', requirement: 'visa_free', max_stay_days: 90, notes: 'Visa free up to 90 days' },
    { destination_country: 'Mozambique', requirement: 'visa_on_arrival', max_stay_days: 30, notes: 'Visa on arrival at major ports of entry' },
    { destination_country: 'Kenya', requirement: 'e_visa', max_stay_days: 90, notes: 'Apply at evisa.go.ke before travel' },
    { destination_country: 'UAE', requirement: 'visa_on_arrival', max_stay_days: 30, notes: '30-day visa on arrival for SA passport holders' },
    { destination_country: 'India', requirement: 'e_visa', max_stay_days: 60, notes: 'Apply at indianvisaonline.gov.in' },
    { destination_country: 'United Kingdom', requirement: 'visa_required', max_stay_days: null, notes: 'Standard Visitor Visa — apply at VFS Global, allow 4+ weeks' },
    { destination_country: 'United States', requirement: 'visa_required', max_stay_days: null, notes: 'B1/B2 visitor visa — apply well in advance at US embassy' },
    { destination_country: 'Schengen Zone', requirement: 'visa_required', max_stay_days: 90, notes: 'Schengen short-stay visa — apply at relevant embassy' },
    { destination_country: 'Australia', requirement: 'visa_required', max_stay_days: null, notes: 'ETA or visitor visa required — apply online' },
    { destination_country: 'China', requirement: 'visa_required', max_stay_days: null, notes: 'Tourist or business visa — apply at Chinese embassy' },
  ],
  '/advisories': [
    { id: 'adv1', country: 'Nigeria', city: 'Lagos', level: 'caution', title: 'Exercise Caution in Lagos', description: 'Travellers should exercise heightened caution due to petty crime in some areas. Use company-approved transport only. Ensure travel insurance is in place before departure. Avoid displaying valuables.', issued_by: 'Travel Coordinator', valid_until: '2026-12-31', created_at: '2026-06-01T08:00:00Z' },
    { id: 'adv2', country: 'United Kingdom', city: null, level: 'safe', title: 'UK Travel — Standard Precautions', description: 'Standard travel precautions apply. Visa required — ensure applications submitted at least 4 weeks before travel through VFS Global. Keep copies of all travel documents.', issued_by: 'Travel Coordinator', valid_until: '2026-12-31', created_at: '2026-05-15T08:00:00Z' },
    { id: 'adv3', country: 'United States', city: null, level: 'safe', title: 'USA Travel — Visa Required', description: 'B1/B2 visa required. Apply at US Embassy at least 8 weeks before travel. ESTA not available for South African passport holders. Company policy: business class for flights over 10 hours.', issued_by: 'Travel Coordinator', valid_until: '2026-12-31', created_at: '2026-06-10T08:00:00Z' },
  ],
  '/reports/spend': {
    total_spend_ytd: 156700,
    total_trips_ytd: 8,
    avg_trip_cost: 19587,
    by_department: [
      { department: 'Engineering', spend: 94500, trips: 3 },
      { department: 'Human Resources', spend: 62000, trips: 1 },
      { department: 'Finance', spend: 22000, trips: 2 },
      { department: 'Product', spend: 85000, trips: 2 },
    ],
    by_month: [
      { month: 'Jan 2026', spend: 28000, trips: 2 },
      { month: 'Feb 2026', spend: 15000, trips: 1 },
      { month: 'Mar 2026', spend: 42000, trips: 2 },
      { month: 'Apr 2026', spend: 18000, trips: 1 },
      { month: 'May 2026', spend: 31000, trips: 1 },
      { month: 'Jun 2026', spend: 22700, trips: 1 },
    ],
    by_type: [
      { type: 'Domestic', spend: 44700, trips: 5 },
      { type: 'International', spend: 112000, trips: 3 },
    ],
  },
  '/reports/destinations': [
    { destination: 'Cape Town, South Africa', trips: 3, total_spend: 28500, trip_type: 'domestic' },
    { destination: 'London, United Kingdom', trips: 1, total_spend: 62000, trip_type: 'international' },
    { destination: 'Las Vegas, United States', trips: 1, total_spend: 85000, trip_type: 'international' },
    { destination: 'Pretoria, South Africa', trips: 2, total_spend: 8200, trip_type: 'domestic' },
    { destination: 'Durban, South Africa', trips: 1, total_spend: 6800, trip_type: 'domestic' },
  ],
  '/reports/compliance': {
    policy_violations: 2,
    late_bookings: 1,
    over_budget_trips: 1,
    violations: [
      { request_number: 'TR-2026-0002', employee_name: 'Lerato Sithole', violation: 'Late booking — less than 14 days before departure', severity: 'medium' },
      { request_number: 'TR-2026-0004', employee_name: 'Amahle Nkosi', violation: 'Hotel rate exceeds policy limit by R200/night', severity: 'low' },
    ],
  },
};
