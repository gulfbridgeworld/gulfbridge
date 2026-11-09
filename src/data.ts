export type Job = {
  id: string
  title: string
  company: string
  country: string
  city: string
  category: string
  salaryMin: number
  salaryMax: number
  currency: 'SAR' | 'AED' | 'QAR' | 'KWD' | 'OMR' | 'BHD' | 'CAD' | 'USD'
  salaryPeriod: string
  employmentType: string
  description: string
  requirements: string[]
  benefits: string[]
  verified: boolean
  premium: boolean
  whatsapp?: string
  coordinates: [number, number]
  posted: string
}

export const jobs: Job[] = [
  {
    id: 'gb-1001',
    title: 'Registered Nurse',
    company: 'Pearl Crescent Medical Group',
    country: 'United Arab Emirates',
    city: 'Dubai',
    category: 'Healthcare',
    salaryMin: 5500,
    salaryMax: 7200,
    currency: 'AED',
    salaryPeriod: 'month',
    employmentType: 'Full time',
    description:
      'Join a multidisciplinary care team delivering patient-centred services in a modern Dubai clinic. The employer reviews applications directly through GulfBridge.',
    requirements: ['Active nursing qualification', 'Two years of clinical experience', 'English communication skills'],
    benefits: ['Health cover', 'Employer-sponsored visa', 'Annual leave'],
    verified: false,
    premium: true,
    coordinates: [25.2048, 55.2708],
    posted: '2 hours ago',
  },
  {
    id: 'gb-1002',
    title: 'Construction Site Supervisor',
    company: 'Al Noor Infrastructure',
    country: 'Saudi Arabia',
    city: 'Riyadh',
    category: 'Construction',
    salaryMin: 6500,
    salaryMax: 8500,
    currency: 'SAR',
    salaryPeriod: 'month',
    employmentType: 'Full time',
    description:
      'Coordinate daily site activities, maintain safety procedures, and support delivery of a large infrastructure project.',
    requirements: ['Diploma in construction or engineering', 'Three years of site experience', 'Valid travel documents'],
    benefits: ['Accommodation', 'Transport allowance', 'Medical cover'],
    verified: false,
    premium: false,
    coordinates: [24.7136, 46.6753],
    posted: '5 hours ago',
  },
  {
    id: 'gb-1003',
    title: 'Hotel Guest Experience Associate',
    company: 'Azure Bay Hospitality',
    country: 'Qatar',
    city: 'Doha',
    category: 'Hospitality',
    salaryMin: 3400,
    salaryMax: 4400,
    currency: 'QAR',
    salaryPeriod: 'month',
    employmentType: 'Full time',
    description:
      'Welcome guests, support front desk operations, and help create a thoughtful five-star stay in central Doha.',
    requirements: ['Customer service experience', 'Professional English', 'Flexible shift availability'],
    benefits: ['Staff meals', 'Shared accommodation', 'Training programme'],
    verified: false,
    premium: true,
    coordinates: [25.2854, 51.531],
    posted: 'Yesterday',
  },
  {
    id: 'gb-1004',
    title: 'HVAC Maintenance Technician',
    company: 'Northstar Facilities',
    country: 'Kuwait',
    city: 'Kuwait City',
    category: 'Technician',
    salaryMin: 480,
    salaryMax: 620,
    currency: 'KWD',
    salaryPeriod: 'month',
    employmentType: 'Full time',
    description:
      'Maintain commercial HVAC systems and complete planned preventative maintenance across client sites.',
    requirements: ['HVAC trade qualification', 'Two years of maintenance experience', 'Basic report-writing skills'],
    benefits: ['Accommodation support', 'Annual return ticket', 'Medical cover'],
    verified: false,
    premium: false,
    coordinates: [29.3759, 47.9774],
    posted: 'Yesterday',
  },
  {
    id: 'gb-1005',
    title: 'Heavy Vehicle Driver',
    company: 'Harborline Logistics',
    country: 'Oman',
    city: 'Muscat',
    category: 'Driver',
    salaryMin: 420,
    salaryMax: 560,
    currency: 'OMR',
    salaryPeriod: 'month',
    employmentType: 'Full time',
    description:
      'Drive scheduled freight routes and support safe, on-time delivery operations across the Muscat region.',
    requirements: ['Heavy vehicle driving experience', 'Clean driving history', 'Safety-first approach'],
    benefits: ['Accommodation', 'Overtime opportunities', 'Medical cover'],
    verified: false,
    premium: false,
    coordinates: [23.588, 58.3829],
    posted: '2 days ago',
  },
  {
    id: 'gb-1006',
    title: 'Customer Support Specialist',
    company: 'Maple Path Services',
    country: 'Canada',
    city: 'Toronto',
    category: 'Customer service',
    salaryMin: 4200,
    salaryMax: 5100,
    currency: 'CAD',
    salaryPeriod: 'month',
    employmentType: 'Full time',
    description:
      'Support customers through phone and digital channels. Work authorization requirements are explained in the listing details.',
    requirements: ['Customer support experience', 'Strong written English', 'Comfort with CRM tools'],
    benefits: ['Health benefits', 'Paid training', 'Hybrid work options'],
    verified: false,
    premium: false,
    coordinates: [43.6532, -79.3832],
    posted: '3 days ago',
  },
  {
    id: 'gb-1007',
    title: 'Warehouse Associate',
    company: 'Summit Supply Co.',
    country: 'United States',
    city: 'New York',
    category: 'Logistics',
    salaryMin: 19,
    salaryMax: 24,
    currency: 'USD',
    salaryPeriod: 'hour',
    employmentType: 'Full time',
    description:
      'Support receiving, inventory, and order fulfilment in a safety-focused distribution operation.',
    requirements: ['Able to lift safely', 'Reliable attendance', 'Work eligibility requirements apply'],
    benefits: ['Medical plan options', 'Paid time off', 'Shift differential'],
    verified: false,
    premium: false,
    coordinates: [40.7128, -74.006],
    posted: '4 days ago',
  },
  {
    id: 'gb-1008',
    title: 'Hotel Housekeeping Attendant',
    company: 'Pearl Crescent Hospitality',
    country: 'Bahrain',
    city: 'Manama',
    category: 'Hospitality',
    salaryMin: 240,
    salaryMax: 320,
    currency: 'BHD',
    salaryPeriod: 'month',
    employmentType: 'Full time',
    description:
      'Help maintain guest rooms and shared areas to a high standard in a busy city hotel.',
    requirements: ['Housekeeping experience is an advantage', 'Attention to detail', 'Able to work shifts'],
    benefits: ['Staff meals', 'Accommodation', 'Transport'],
    verified: false,
    premium: false,
    coordinates: [26.2285, 50.586],
    posted: '4 days ago',
  },
]

export const destinations = [
  'All destinations',
  'United Arab Emirates',
  'Saudi Arabia',
  'Qatar',
  'Kuwait',
  'Oman',
  'Bahrain',
  'Canada',
  'United States',
]

export const categoryNames = ['All fields', 'Healthcare', 'Driver', 'Construction', 'Hospitality', 'Technician', 'Logistics', 'Customer service']

export const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
