import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BellRing,
  BriefcaseBusiness,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  FileCheck2,
  FileText,
  Globe2,
  Heart,
  Languages,
  LockKeyhole,
  LayoutDashboard,
  BarChart3,
  ClipboardList,
  LogOut,
  Menu as MenuIcon,
  Mail,
  MapPin,
  Moon,
  MessageCircle,
  Plane,
  Sun,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react'
import MapExplorer from './MapExplorer'
import { categoryNames, destinations, formatMoney, jobs as starterJobs } from './data'
import type { Job } from './data'
import { configurationMessage, isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'

type Language = 'en' | 'ar'
type Page = 'home' | 'jobs' | 'map' | 'saved' | 'applications' | 'profile' | 'recruiter' | 'admin' | 'help' | 'guides' | 'alerts'
type Theme = 'dark' | 'light'
type JobAlert = {
  id: string
  user_id: string
  email: string
  keyword: string
  country: string | null
  category: string | null
  employment_type: string | null
  channels: string[]
  enabled: boolean
  created_at: string
}
type JobNotification = {
  id: string
  job_id: string
  title: string
  body: string
  read_at: string | null
  created_at: string
}
type AdminJob = {
  id: string
  job_title: string
  agency_name: string
  country: string
  city: string
  category: string
  employment_type: string
  description: string
  salary_min: number
  salary_max: number
  salary_currency: string
  review_status: string
  payment_status: string
  published_at: string | null
  expires_at: string | null
}
type AdminJobUpdate = Pick<AdminJob, 'job_title' | 'agency_name' | 'country' | 'city' | 'category' | 'employment_type' | 'description' | 'salary_min' | 'salary_max' | 'salary_currency'>
type AdminProfile = { id: string; email: string; full_name: string; phone: string; location: string; created_at: string; disabled: boolean; roles: string[] }
type AdminCategory = { name: string; is_active: boolean }
type AdminNews = { id: string; title: string; summary: string; country: string | null; source_url: string | null; is_published: boolean; published_at: string | null; created_at: string }
type AdminScamReport = { id: string; job_id: string | null; employer_name: string; details: string; status: string; created_at: string }
type Account = {
  id: string
  email: string
  name: string
  phone: string
  location: string
  headline: string
  skills: string
  role: 'seeker' | 'recruiter' | 'admin'
  roles: Array<'seeker' | 'recruiter' | 'admin'>
}
type ApplicationRecord = {
  id: string
  jobId: string
  jobTitle: string
  company: string
  status: string
  updated: string
  city?: string
  country?: string
  appliedAt?: string
}
type EmployerApplication = {
  application_id: string
  job_id: string
  status: string
  applied_at: string
  updated_at: string
  job_title: string
  company: string
  applicant_name: string
  applicant_headline: string
  applicant_location: string
  applicant_skills: string[]
}
type AdminApplication = {
  application_id: string
  job_id: string
  status: string
  updated_at: string
  applicant_name: string
  job_title: string
  company: string
}
type RecruiterSubmission = {
  id: string
  job_title: string
  agency_name: string
  country: string
  city: string
  review_status: string
  review_note: string | null
  payment_status: string
  payment_amount: number
  payment_currency: string
  listing_plan: string
  created_at: string
}
type AdminReview = RecruiterSubmission & { employer_market: string; document_count: number }
type PaymentReview = {
  id: string
  submission_id: string
  employer_id: string
  amount: number
  currency: string
  method: string
  provider_reference: string | null
  status: string
}
type PremiumRequest = {
  id: string
  employer_id: string
  employer_market: string
  payment_amount: number
  payment_currency: string
  payment_method: string | null
  payment_reference: string | null
  status: string
}
type ProfileKey = 'name' | 'phone' | 'location' | 'headline' | 'skills'
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const appPages: Page[] = ['home', 'jobs', 'map', 'saved', 'applications', 'profile', 'recruiter', 'admin', 'help', 'guides', 'alerts']

const countryHighlights = [
  { country: 'United Arab Emirates', city: 'Dubai', flag: '🇦🇪', code: 'UAE' },
  { country: 'Qatar', city: 'Doha', flag: '🇶🇦', code: 'Qatar' },
  { country: 'Saudi Arabia', city: 'Riyadh', flag: '🇸🇦', code: 'Saudi Arabia' },
  { country: 'Canada', city: 'Toronto', flag: '🇨🇦', code: 'Canada' },
  { country: 'United Kingdom', city: 'London', flag: '🇬🇧', code: 'United Kingdom' },
  { country: 'Germany', city: 'Berlin', flag: '🇩🇪', code: 'Germany' },
  { country: 'Australia', city: 'Sydney', flag: '🇦🇺', code: 'Australia' },
  { country: 'Poland', city: 'Warsaw', flag: '🇵🇱', code: 'Poland' },
  { country: 'United States', city: 'New York', flag: '🇺🇸', code: 'USA' },
]

const careerGuides = [
  { icon: BriefcaseBusiness, title: 'How to apply for jobs abroad', description: 'Prepare a clear CV, check the job requirements, and follow each application step.' },
  { icon: MessageCircle, title: 'Interview preparation', description: 'Practice examples from your experience and prepare thoughtful questions for the employer.' },
  { icon: Globe2, title: 'Living and working abroad', description: 'Research local work rules, expected living costs, and the details of your written contract.' },
  { icon: WalletCards, title: 'Understand your salary', description: 'Compare the stated currency, pay period, deductions, accommodation, and other benefits.' },
  { icon: ShieldCheck, title: 'Avoiding job scams', description: 'Verify employers independently and be cautious of requests for unofficial upfront fees.' },
]

function isAppPage(value: unknown): value is Page {
  return typeof value === 'string' && appPages.includes(value as Page)
}

const translations = {
  en: {
    navJobs: 'Find jobs',
    navMap: 'Explore map',
    navEmployers: 'For employers',
    navHelp: 'Help & safety',
    signIn: 'Sign in',
    back: 'Back',
    profile: 'My profile',
    heroEyebrow: 'A safer way to work abroad',
    heroTitleA: 'Your next chapter',
    heroTitleB: 'starts here.',
    heroDescription: 'Explore opportunities abroad with clearer details, reviewed employers, and your application journey in one place.',
    searchPlaceholder: 'Role, skill, company or destination',
    search: 'Search jobs',
    aiPrompt: 'Tell us what you are looking for',
    aiPlaceholder: 'e.g. I am a driver from Kenya looking for work in Riyadh...',
    match: 'Find my matches',
    verifiedOnly: 'Reviewed employers',
    jobsHeading: 'Opportunities worth exploring',
    jobsSubheading: 'Compare the details. Apply securely. Track what happens next.',
    allDestinations: 'All destinations',
    allFields: 'All fields',
    seeAll: 'See all opportunities',
    apply: 'Apply on GulfBridge',
    save: 'Save job',
    saved: 'Saved',
    postJob: 'Post a job',
    stepTitle: 'Your application, clearly tracked',
    stepDescription: 'See updates from the employer, your next step, and the date each update was made.',
    trustTitle: 'Trust should be visible',
    trustDescription: 'We review employer submissions before jobs go public. A platform badge describes our checks—it is not a government endorsement.',
    salaryNote: 'Indicative local-currency conversion. Exchange rates change; confirm final pay and contract terms with the employer.',
    map: 'Map',
    applications: 'Applications',
    savedJobs: 'Saved jobs',
    employerArea: 'Recruiter area',
    adminArea: 'Admin review',
    logout: 'Sign out',
    profileTitle: 'Your profile',
    profileDescription: 'Manage your details, update your skills, and keep your account secure.',
    editProfile: 'Edit profile',
    saveChanges: 'Save changes',
    cancel: 'Cancel',
    name: 'Full name',
    email: 'Email address',
    phone: 'Phone number',
    location: 'Current location',
    headline: 'Professional headline',
    skills: 'Skills',
    updated: 'Profile updated',
    trackerTitle: 'Application tracker',
    emptyApplications: 'Your applications will appear here after you apply.',
    premium: 'Premium employer',
    verified: 'Platform checked',
    sample: 'Example opportunity',
    language: 'العربية',
    loginRequired: 'Sign in to continue',
  },
  ar: {
    navJobs: 'ابحث عن وظائف',
    navMap: 'استكشف الخريطة',
    navEmployers: 'لأصحاب العمل',
    navHelp: 'المساعدة والسلامة',
    signIn: 'تسجيل الدخول',
    back: 'رجوع',
    profile: 'ملفي الشخصي',
    heroEyebrow: 'طريقة أكثر أمانًا للعمل في الخارج',
    heroTitleA: 'فصلك المهني',
    heroTitleB: 'يبدأ من هنا.',
    heroDescription: 'استكشف فرص العمل في الخارج مع تفاصيل واضحة وأصحاب عمل تمت مراجعتهم ومتابعة طلبك في مكان واحد.',
    searchPlaceholder: 'المسمى أو المهارة أو الشركة أو الوجهة',
    search: 'ابحث عن وظائف',
    aiPrompt: 'أخبرنا عن الوظيفة التي تبحث عنها',
    aiPlaceholder: 'مثال: أنا سائق من كينيا وأبحث عن عمل في الرياض...',
    match: 'اعثر على الوظائف المناسبة',
    verifiedOnly: 'أصحاب عمل تمت مراجعتهم',
    jobsHeading: 'فرص تستحق الاستكشاف',
    jobsSubheading: 'قارن التفاصيل. قدّم بأمان. تابع الخطوات التالية.',
    allDestinations: 'كل الوجهات',
    allFields: 'كل المجالات',
    seeAll: 'عرض جميع الفرص',
    apply: 'قدّم عبر GulfBridge',
    save: 'احفظ الوظيفة',
    saved: 'تم الحفظ',
    postJob: 'انشر وظيفة',
    stepTitle: 'تابع طلبك بوضوح',
    stepDescription: 'اطّلع على تحديثات صاحب العمل وخطوتك التالية وتاريخ كل تحديث.',
    trustTitle: 'الثقة يجب أن تكون واضحة',
    trustDescription: 'نراجع بيانات أصحاب العمل قبل نشر الوظائف. شارة المنصة توضّح ما راجعناه ولا تعني اعتمادًا حكوميًا.',
    salaryNote: 'تحويل العملة المحلية تقديري. تتغير أسعار الصرف؛ يرجى تأكيد الأجر وشروط العقد مع صاحب العمل.',
    map: 'الخريطة',
    applications: 'الطلبات',
    savedJobs: 'الوظائف المحفوظة',
    employerArea: 'مساحة أصحاب العمل',
    adminArea: 'مراجعة الإدارة',
    logout: 'تسجيل الخروج',
    profileTitle: 'ملفك الشخصي',
    profileDescription: 'أدر بياناتك وحدّث مهاراتك وحافظ على أمان حسابك.',
    editProfile: 'تعديل الملف الشخصي',
    saveChanges: 'حفظ التغييرات',
    cancel: 'إلغاء',
    name: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    phone: 'رقم الهاتف',
    location: 'الموقع الحالي',
    headline: 'المسمى المهني',
    skills: 'المهارات',
    updated: 'تم تحديث الملف الشخصي',
    trackerTitle: 'متابعة الطلبات',
    emptyApplications: 'ستظهر طلباتك هنا بعد التقديم.',
    premium: 'صاحب عمل مميز',
    verified: 'تمت مراجعته من المنصة',
    sample: 'فرصة توضيحية',
    language: 'English',
    loginRequired: 'سجّل الدخول للمتابعة',
  },
} as const

type TranslationKey = keyof typeof translations.en

const countries: Record<string, string> = {
  'United Arab Emirates': 'AE',
  'Saudi Arabia': 'SA',
  Qatar: 'QA',
  Kuwait: 'KW',
  Oman: 'OM',
  Bahrain: 'BH',
  Canada: 'CA',
  'United States': 'US',
  'United Kingdom': 'UK',
  Germany: 'DE',
  Australia: 'AU',
  Poland: 'PL',
}

const cityCoordinates: Record<string, [number, number]> = {
  Dubai: [25.2048, 55.2708],
  Riyadh: [24.7136, 46.6753],
  Doha: [25.2854, 51.531],
  'Kuwait City': [29.3759, 47.9774],
  Muscat: [23.588, 58.3829],
  Manama: [26.2285, 50.586],
  Toronto: [43.6532, -79.3832],
  'New York': [40.7128, -74.006],
}

const approximateRateEndpoint = import.meta.env.VITE_FX_ENDPOINT || 'https://open.er-api.com/v6/latest/KES'

function useExchangeRates() {
  const [rates, setRates] = useState<Record<string, number>>({})
  const [rateDate, setRateDate] = useState('')

  useEffect(() => {
    let active = true
    const fetchRates = async () => {
      try {
        const response = await fetch(approximateRateEndpoint)
        if (!response.ok) throw new Error('Rate provider unavailable')
        const data = (await response.json()) as {
          result?: string
          time_last_update_utc?: string
          rates?: Record<string, number>
        }
        if (data.result !== 'success' || !data.rates) throw new Error('Rate response was invalid')
        if (active) {
          setRates(data.rates)
          setRateDate(data.time_last_update_utc || '')
        }
      } catch {
        if (active) setRates({})
      }
    }
    void fetchRates()
    return () => {
      active = false
    }
  }, [])

  const toKes = useCallback((amount: number, currency: string) => {
    const kesPerUnit = rates.KES && rates[currency] ? rates[currency] / rates.KES : null
    return kesPerUnit ? amount * kesPerUnit : null
  }, [rates])

  return { toKes, rateDate }
}

function currencyRange(job: Job, toKes: (amount: number, currency: string) => number | null) {
  const base = `${formatMoney(job.salaryMin, job.currency)} – ${formatMoney(job.salaryMax, job.currency)} / ${job.salaryPeriod}`
  const lower = toKes(job.salaryMin, job.currency)
  const upper = toKes(job.salaryMax, job.currency)
  if (!lower || !upper) return base
  return `${base} · ≈ KSh ${Math.round(lower / 100) / 10}k–${Math.round(upper / 100) / 10}k`
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function getLocalDayKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function sessionDayStorageKey(userId: string) {
  return `gulfbridge-session-day:${userId}`
}

async function getFunctionErrorMessage(error: { message: string; name?: string; context?: unknown }) {
  if (error.context instanceof Response) {
    try {
      const body = await error.context.clone().text()
      if (body) {
        try {
          const parsed = JSON.parse(body) as { error?: unknown; message?: unknown }
          if (typeof parsed.error === 'string') return parsed.error
          if (typeof parsed.message === 'string') return parsed.message
        } catch {
          return body
        }
      }
    } catch {
      // Use the function client's message when its response body is unavailable.
    }
  }

  if (error.name === 'FunctionsFetchError' || error.message.toLowerCase().includes('failed to send a request')) {
    return 'The admin-users Edge Function could not be reached. Deploy the function and set its ALLOWED_ORIGINS secret to this exact website origin (https://gulfbridge.onrender.com), with no trailing slash, then check the Supabase function logs.'
  }
  return error.message
}

function App() {
  const [language, setLanguage] = useState<Language>('en')
  const [theme, setTheme] = useState<Theme>('dark')
  const [page, setPage] = useState<Page>('home')
  const [account, setAccount] = useState<Account | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [adminLoginMode, setAdminLoginMode] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [jobSearch, setJobSearch] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [destinationFilter, setDestinationFilter] = useState('All destinations')
  const [categoryFilter, setCategoryFilter] = useState('All fields')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [activeJob, setActiveJob] = useState<Job | null>(null)
  const [applyJob, setApplyJob] = useState<Job | null>(null)
  const [profileEditing, setProfileEditing] = useState(false)
  const [profileDraft, setProfileDraft] = useState<Account | null>(null)
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [applications, setApplications] = useState<ApplicationRecord[]>([])
  const [employerApplications, setEmployerApplications] = useState<EmployerApplication[]>([])
  const [jobs, setJobs] = useState<Job[]>(() => import.meta.env.DEV && !isSupabaseConfigured ? starterJobs : [])
  const [mySubmissions, setMySubmissions] = useState<RecruiterSubmission[]>([])
  const [premiumRequests, setPremiumRequests] = useState<PremiumRequest[]>([])
  const [adminReviews, setAdminReviews] = useState<AdminReview[]>([])
  const [adminPayments, setAdminPayments] = useState<PaymentReview[]>([])
  const [adminPremiumRequests, setAdminPremiumRequests] = useState<PremiumRequest[]>([])
  const [adminApplications, setAdminApplications] = useState<AdminApplication[]>([])
  const [jobAlerts, setJobAlerts] = useState<JobAlert[]>([])
  const [jobNotifications, setJobNotifications] = useState<JobNotification[]>([])
  const [adminJobs, setAdminJobs] = useState<AdminJob[]>([])
  const [adminProfiles, setAdminProfiles] = useState<AdminProfile[]>([])
  const [adminUsersLoading, setAdminUsersLoading] = useState(false)
  const [adminUsersError, setAdminUsersError] = useState('')
  const [adminSearch, setAdminSearch] = useState('')
  const [adminCategories, setAdminCategories] = useState<AdminCategory[]>([])
  const [adminNews, setAdminNews] = useState<AdminNews[]>([])
  const [adminScamReports, setAdminScamReports] = useState<AdminScamReport[]>([])
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [profileDocuments, setProfileDocuments] = useState<Array<{ id: string; storage_path: string; original_filename: string; document_kind: string; created_at: string }>>([])
  const { toKes, rateDate } = useExchangeRates()
  const t = (key: TranslationKey) => translations[language][key]
  const isArabic = language === 'ar'
  const isExampleListing = import.meta.env.DEV && !isSupabaseConfigured

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr'
  }, [language, isArabic])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#080b12' : '#f3f6fb')
  }, [theme])

  useEffect(() => {
    window.history.replaceState({ ...window.history.state, gulfbridgePage: 'home' }, '')
  }, [])

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const nextPage = isAppPage(event.state?.gulfbridgePage) ? event.state.gulfbridgePage : 'home'
      const requiresAccount = ['profile', 'saved', 'applications', 'recruiter'].includes(nextPage)
      if (requiresAccount && !account) {
        setPage('home')
        setAuthError('')
        setAuthNotice('')
        setAuthOpen(true)
        window.history.replaceState({ gulfbridgePage: 'home' }, '')
        return
      }
      if (nextPage === 'admin' && !account?.roles.includes('admin')) {
        setPage('home')
        setNotice('Admin review is available only to authorized admin accounts.')
        window.history.replaceState({ gulfbridgePage: 'home' }, '')
        return
      }
      setPage(nextPage)
      if (nextPage === 'admin') {
        setAdminUsersLoading(true)
        setAdminUsersError('')
      }
      setActiveJob(null)
      setApplyJob(null)
      setAuthOpen(false)
      setProfileEditing(false)
      setDeleteConfirmOpen(false)
      setMenuOpen(false)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [account])

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      if (!('prompt' in event) || typeof event.prompt !== 'function') return
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const onAppInstalled = () => setInstallPrompt(null)

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setAuthError(error.message)
        return
      }
      if (data.session?.user) setAccountFromUser(data.session.user)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAccountFromUser(session.user)
      }
      else setAccount(null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!account) return
    const userId = account.id
    const storageKey = sessionDayStorageKey(userId)
    let loginDay: string
    try {
      loginDay = window.localStorage.getItem(storageKey) || getLocalDayKey()
      window.localStorage.setItem(storageKey, loginDay)
    } catch (error) {
      console.error('Could not read the sign-in date:', error)
      loginDay = getLocalDayKey()
    }

    let expired = false
    const expireSessionAfterMidnight = () => {
      if (expired || getLocalDayKey() === loginDay) return
      expired = true
      try {
        window.localStorage.removeItem(storageKey)
      } catch (error) {
        console.error('Could not clear the expired sign-in date:', error)
      }
      if (supabase && !userId.startsWith('demo-')) {
        void supabase.auth.signOut({ scope: 'local' }).then(({ error }) => {
          if (error) setNotice(`Your session expired at midnight, but the sign-out could not be confirmed: ${error.message}`)
        })
      }
      setAccount(null)
      setSavedIds([])
      setApplications([])
      setEmployerApplications([])
      setMySubmissions([])
      setPremiumRequests([])
      setAdminReviews([])
      setAdminPayments([])
      setAdminPremiumRequests([])
      setAdminApplications([])
      setAdminJobs([])
      setAdminProfiles([])
      setPage('home')
      window.history.replaceState({ gulfbridgePage: 'home' }, '')
      setAuthError('')
      setAuthNotice('Your session ended at midnight. Sign in again to continue.')
      setAdminLoginMode(account.roles.includes('admin'))
      setAuthOpen(true)
      setNotice('Your session ended at midnight. Please sign in again.')
    }
    expireSessionAfterMidnight()
    const nextMidnight = new Date()
    nextMidnight.setHours(24, 0, 0, 0)
    const timeout = window.setTimeout(expireSessionAfterMidnight, nextMidnight.getTime() - Date.now() + 50)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') expireSessionAfterMidnight()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', expireSessionAfterMidnight)
    return () => {
      window.clearTimeout(timeout)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', expireSessionAfterMidnight)
    }
  }, [account])

  useEffect(() => {
    if (!supabase || !account || account.id.startsWith('demo-')) return
    let active = true
    void Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', account.id),
      supabase.from('profiles').select('full_name,phone,location,headline,skills,preferred_language').eq('id', account.id).maybeSingle(),
    ]).then(([rolesResult, profileResult]) => {
      if (!active) return
      if (rolesResult.error) {
        setNotice(`Could not load account permissions: ${rolesResult.error.message}`)
        return
      }
      if (profileResult.error) {
        setNotice(`Could not load your profile: ${profileResult.error.message}`)
        return
      }
      const roles = (rolesResult.data || []).map((item) => item.role).filter((role): role is Account['roles'][number] => ['seeker', 'recruiter', 'admin'].includes(role))
      const nextRoles = Array.from(new Set<Account['roles'][number]>(['seeker', ...roles]))
      setAccount((current) => current && current.id === account.id
        ? {
            ...current,
            name: profileResult.data?.full_name || current.name,
            phone: profileResult.data?.phone || current.phone,
            location: profileResult.data?.location || current.location,
            headline: profileResult.data?.headline || current.headline,
            skills: Array.isArray(profileResult.data?.skills) ? profileResult.data.skills.join(', ') : current.skills,
            roles: nextRoles,
            role: nextRoles.includes('admin') ? 'admin' : nextRoles.includes('recruiter') ? 'recruiter' : 'seeker',
          }
        : current)
    })
    return () => { active = false }
  }, [account?.id])

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return
    let active = true
    void supabase.from('published_jobs').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
      if (!active) return
      if (error) {
        setNotice(`Could not load approved jobs: ${error.message}`)
        return
      }
      const liveJobs: Job[] = (data || []).map((row) => ({
        id: row.id,
        title: row.title,
        company: row.company,
        country: row.country,
        city: row.city,
        category: row.category,
        salaryMin: Number(row.salary_min),
        salaryMax: Number(row.salary_max),
        currency: row.salary_currency,
        salaryPeriod: 'month',
        employmentType: row.employment_type || 'Full time',
        description: row.description,
        requirements: [],
        benefits: [],
        verified: Boolean(row.verification_status),
        premium: row.listing_plan === 'premium',
        whatsapp: row.whatsapp_contact || undefined,
        coordinates: cityCoordinates[row.city] || [25.1, 49.5],
        posted: new Date(row.created_at).toLocaleDateString(),
      }))
      setJobs(liveJobs)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!supabase || !account || account.id.startsWith('demo-')) return
    const client = supabase
    if (page === 'alerts') {
      void Promise.all([
        client.from('job_alerts').select('id,user_id,email,keyword,country,category,employment_type,channels,enabled,created_at').order('created_at', { ascending: false }),
        client.from('user_notifications').select('id,job_id,title,body,read_at,created_at').order('created_at', { ascending: false }).limit(50),
      ]).then(([alertsResult, notificationsResult]) => {
        if (alertsResult.error) setNotice(`Could not load your job alerts: ${alertsResult.error.message}`)
        else setJobAlerts((alertsResult.data || []) as JobAlert[])
        if (notificationsResult.error) setNotice(`Could not load notifications: ${notificationsResult.error.message}`)
        else setJobNotifications((notificationsResult.data || []) as JobNotification[])
      })
    }

    const channel = client.channel(`job-alerts-${account.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${account.id}`,
      }, (payload) => {
        const notification = payload.new as JobNotification
        setJobNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 50))
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notification.title, { body: notification.body, icon: '/icons/app-192.png' })
        }
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setNotice('Live job alerts are temporarily unavailable. Your saved alerts remain active.')
        }
      })
    return () => { void client.removeChannel(channel) }
  }, [page, account?.id])

  useEffect(() => {
    if (!supabase || !account || account.id.startsWith('demo-') || page !== 'recruiter') return
    let active = true
    void Promise.all([
      supabase.from('job_submissions').select('id,job_title,agency_name,country,city,review_status,review_note,payment_status,payment_amount,payment_currency,listing_plan,created_at').eq('employer_id', account.id).order('created_at', { ascending: false }),
      supabase.from('premium_subscriptions').select('id,employer_id,employer_market,payment_amount,payment_currency,payment_method,payment_reference,status').eq('employer_id', account.id).order('created_at', { ascending: false }),
    ]).then(([submissionsResult, premiumResult]) => {
      if (!active) return
      if (submissionsResult.error) setNotice(`Could not load your submissions: ${submissionsResult.error.message}`)
      else setMySubmissions((submissionsResult.data || []) as RecruiterSubmission[])
      if (premiumResult.error) setNotice(`Could not load premium status: ${premiumResult.error.message}`)
      else setPremiumRequests((premiumResult.data || []) as PremiumRequest[])
    })
    return () => { active = false }
  }, [page, account?.id])

  useEffect(() => {
    if (!supabase || !account || !account.roles.includes('admin') || page !== 'admin') return
    const client = supabase
    let active = true
    void Promise.all([
      client.from('job_submissions').select('id,job_title,agency_name,country,city,review_status,review_note,payment_status,payment_amount,payment_currency,listing_plan,employer_market,created_at').in('review_status', ['pending', 'needs_changes']).order('created_at', { ascending: true }),
      client.from('listing_payments').select('id,submission_id,employer_id,amount,currency,method,provider_reference,status').eq('status', 'pending_confirmation').order('created_at', { ascending: true }),
      client.from('premium_subscriptions').select('id,employer_id,employer_market,payment_amount,payment_currency,payment_method,payment_reference,status').eq('status', 'pending_confirmation').order('created_at', { ascending: true }),
    ]).then(async ([reviewResult, paymentResult, premiumResult]) => {
      if (!active) return
      if (reviewResult.error) {
        setNotice(`Could not load admin review queue: ${reviewResult.error.message}`)
        return
      }
      const reviewRows = reviewResult.data || []
      const withCounts = await Promise.all(reviewRows.map(async (row) => {
        const { count, error } = await client.from('job_submission_documents').select('id', { count: 'exact', head: true }).eq('submission_id', row.id)
        if (error) return { ...row, document_count: 0 }
        return { ...row, document_count: count || 0 }
      }))
      if (!active) return
      setAdminReviews(withCounts as AdminReview[])
      if (paymentResult.error) setNotice(`Could not load payment requests: ${paymentResult.error.message}`)
      else setAdminPayments((paymentResult.data || []) as PaymentReview[])
      if (premiumResult.error) setNotice(`Could not load premium payment requests: ${premiumResult.error.message}`)
      else setAdminPremiumRequests((premiumResult.data || []) as PremiumRequest[])
      const { data: appData, error: appError } = await client.from('admin_applications').select('application_id,job_id,status,updated_at,applicant_name,job_title,company').order('updated_at', { ascending: false })
      if (appError) setNotice(`Could not load application oversight: ${appError.message}`)
      else setAdminApplications((appData || []) as AdminApplication[])
    })
    return () => { active = false }
  }, [page, account?.id, account?.roles])

  useEffect(() => {
    if (!supabase || !account?.roles.includes('admin') || page !== 'admin') return
    const client = supabase
    let active = true
    void Promise.all([
      client.from('job_submissions').select('id,job_title,agency_name,country,city,category,employment_type,description,salary_min,salary_max,salary_currency,review_status,payment_status,published_at,expires_at').eq('review_status', 'approved').eq('payment_status', 'paid').not('published_at', 'is', null).order('created_at', { ascending: false }).limit(100),
      client.functions.invoke('admin-users', { body: { action: 'list' } }),
      client.from('job_categories').select('name,is_active').order('name'),
      client.from('overseas_news').select('id,title,summary,country,source_url,is_published,published_at,created_at').order('created_at', { ascending: false }).limit(50),
      client.from('scam_reports').select('id,job_id,employer_name,details,status,created_at').order('created_at', { ascending: false }).limit(100),
    ]).then(async ([jobsResult, usersResult, categoriesResult, newsResult, reportsResult]) => {
      if (!active) return
      if (jobsResult.error) setNotice(`Could not load job management: ${jobsResult.error.message}`)
      else setAdminJobs((jobsResult.data || []) as AdminJob[])
      if (usersResult.error) {
        const message = await getFunctionErrorMessage(usersResult.error)
        if (!active) return
        setAdminUsersError(message)
        setAdminProfiles([])
        setNotice(`Could not load registered users: ${message}`)
      } else {
        setAdminProfiles(((usersResult.data as { users: AdminProfile[] } | null)?.users || []))
      }
      setAdminUsersLoading(false)
      if (categoriesResult.error) setNotice(`Could not load job categories: ${categoriesResult.error.message}`)
      else setAdminCategories((categoriesResult.data || []) as AdminCategory[])
      if (newsResult.error) setNotice(`Could not load overseas news: ${newsResult.error.message}`)
      else setAdminNews((newsResult.data || []) as AdminNews[])
      if (reportsResult.error) setNotice(`Could not load scam reports: ${reportsResult.error.message}`)
      else setAdminScamReports((reportsResult.data || []) as AdminScamReport[])
    })
    return () => {
      active = false
      setAdminUsersLoading(false)
    }
  }, [page, account?.id, account?.roles])

  useEffect(() => {
    if (!supabase || page !== 'profile' || !account || account.id.startsWith('demo-')) return
    let active = true
    void supabase.from('application_documents').select('id,storage_path,original_filename,document_kind,created_at').eq('applicant_id', account.id).order('created_at', { ascending: false }).then(({ data, error }) => {
      if (!active) return
      if (error) {
        setNotice(`Could not load your document list: ${error.message}`)
        return
      }
      setProfileDocuments(data || [])
    })
    return () => { active = false }
  }, [page, account?.id])

  useEffect(() => {
    if (!supabase || !account || account.id.startsWith('demo-')) return
    let active = true
    if (page === 'applications') {
      void supabase.from('application_tracking').select('*').order('applied_at', { ascending: false }).then(async ({ data, error }) => {
        if (!active) return
        if (error) {
          setNotice(`Could not load your application tracker: ${error.message}`)
          return
        }
        const tracked: ApplicationRecord[] = (data || []).map((row) => ({
          id: row.application_id,
          jobId: row.job_id,
          jobTitle: row.job_title,
          company: row.company,
          status: row.status,
          updated: new Date(row.updated_at).toLocaleDateString(),
          appliedAt: new Date(row.applied_at).toLocaleDateString(),
          city: row.city,
          country: row.country,
        }))
        setApplications(tracked)
      })
    }
    if (page === 'recruiter' && account.roles.includes('recruiter')) {
      void supabase.from('employer_applications').select('*').order('applied_at', { ascending: false }).then(({ data, error }) => {
        if (!active) return
        if (error) {
          setNotice(`Could not load applications to your jobs: ${error.message}`)
          return
        }
        setEmployerApplications((data || []) as EmployerApplication[])
      })
    }
    return () => { active = false }
  }, [page, account?.id, account?.roles])

  useEffect(() => {
    if (!supabase || !account || account.id.startsWith('demo-')) return
    let active = true
    void supabase.from('saved_jobs').select('job_id').eq('applicant_id', account.id).then(({ data, error }) => {
      if (!active) return
      if (error) {
        setNotice(`Could not load saved jobs: ${error.message}`)
        return
      }
      setSavedIds((data || []).map((row) => row.job_id))
    })
    return () => { active = false }
  }, [account?.id])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 4500)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const setAccountFromUser = (user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => {
    const name = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : 'GulfBridge member'
    const phone = typeof user.user_metadata?.phone === 'string' ? user.user_metadata.phone : ''
    const role = user.user_metadata?.primary_role === 'recruiter' ? 'recruiter' : 'seeker'
    setAccount({
      id: user.id,
      email: user.email || '',
      name,
      phone,
      location: 'Nairobi, Kenya',
      headline: '',
      skills: '',
      role,
      roles: role === 'recruiter' ? ['seeker', 'recruiter'] : ['seeker'],
    })
  }

  const filteredJobs = useMemo(() => {
    const term = jobSearch.trim().toLocaleLowerCase()
    return jobs.filter((job) => {
      const matchesTerm = !term || [
        job.title, job.company, job.country, job.city, job.category,
        ...job.requirements, ...job.benefits,
      ].join(' ').toLocaleLowerCase().includes(term)
      const matchesCountry = destinationFilter === 'All destinations' || job.country === destinationFilter
      const matchesCategory = categoryFilter === 'All fields' || job.category === categoryFilter
      const matchesVerified = !verifiedOnly || job.verified
      return matchesTerm && matchesCountry && matchesCategory && matchesVerified
    })
  }, [jobs, jobSearch, destinationFilter, categoryFilter, verifiedOnly])

  const requireSignIn = () => {
    if (account) return true
    setAdminLoginMode(false)
    setAuthError('')
    setAuthNotice('')
    setAuthOpen(true)
    return false
  }

  const openAdminAccess = () => {
    if (account?.roles.includes('admin')) {
      navigate('admin')
      return
    }
    setAdminLoginMode(true)
    setAuthError('')
    setAuthNotice('Admin access requires an authorized GulfBridge account.')
    setAuthOpen(true)
  }

  const goBack = () => {
    if (authOpen) {
      setAuthOpen(false)
      setAdminLoginMode(false)
      return
    }
    if (applyJob) {
      setApplyJob(null)
      return
    }
    if (activeJob) {
      setActiveJob(null)
      return
    }
    if (profileEditing) {
      setProfileEditing(false)
      return
    }
    if (deleteConfirmOpen) {
      setDeleteConfirmOpen(false)
      return
    }
    if (isAppPage(window.history.state?.previousGulfbridgePage)) {
      window.history.back()
      return
    }
    navigate('home')
  }

  const navigate = (nextPage: Page) => {
    setMenuOpen(false)
    if (['profile', 'saved', 'applications', 'alerts'].includes(nextPage) && !requireSignIn()) return
    if (nextPage === 'recruiter' && !requireSignIn()) return
    if (nextPage === 'admin' && (!account || !account.roles.includes('admin'))) {
      setNotice('Admin review is available only to authorized admin accounts.')
      return
    }
    if (nextPage !== page) {
      window.history.pushState({
        gulfbridgePage: nextPage,
        previousGulfbridgePage: page,
      }, '')
    }
    if (nextPage === 'admin') {
      setAdminUsersLoading(true)
      setAdminUsersError('')
    }
    setPage(nextPage)
    setActiveJob(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const installApp = async () => {
    if (!installPrompt) return
    try {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      setInstallPrompt(null)
      if (outcome === 'accepted') setNotice('GulfBridge is being installed. Open it from your apps when installation finishes.')
    } catch (error) {
      setNotice(`Could not start app installation: ${error instanceof Error ? error.message : 'Please use Chrome’s Install app menu.'}`)
      setInstallPrompt(null)
    }
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    navigate('jobs')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const createJobAlert = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    if (!supabase || !account || account.id.startsWith('demo-')) {
      setNotice('Sign in with a connected GulfBridge account to save job alerts.')
      return
    }
    const form = new FormData(formElement)
    const channels = form.getAll('channels').map(String)
    if (!channels.length) {
      setNotice('Choose at least one way to receive matching job alerts.')
      return
    }
    const { data, error } = await supabase.from('job_alerts').insert({
      user_id: account.id,
      email: account.email,
      keyword: String(form.get('keyword') || '').trim(),
      country: String(form.get('country') || '') || null,
      category: String(form.get('category') || '') || null,
      employment_type: String(form.get('employmentType') || '') || null,
      channels,
    }).select('id,user_id,email,keyword,country,category,employment_type,channels,enabled,created_at').single()
    if (error) {
      setNotice(`Job alert could not be saved: ${error.message}`)
      return
    }
    setJobAlerts((current) => [data as JobAlert, ...current])
    formElement.reset()
    setNotice('Job alert saved. Matching published opportunities will appear in your notifications.')
  }

  const deleteJobAlert = async (id: string) => {
    if (!supabase) return
    const { error } = await supabase.from('job_alerts').delete().eq('id', id)
    if (error) {
      setNotice(`Job alert could not be deleted: ${error.message}`)
      return
    }
    setJobAlerts((current) => current.filter((alert) => alert.id !== id))
  }

  const markNotificationRead = async (notification: JobNotification) => {
    if (!supabase || notification.read_at) return
    const readAt = new Date().toISOString()
    const { error } = await supabase.from('user_notifications').update({ read_at: readAt }).eq('id', notification.id)
    if (error) {
      setNotice(`Notification could not be marked as read: ${error.message}`)
      return
    }
    setJobNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: readAt } : item))
  }

  const enableWebNotifications = async () => {
    if (!('Notification' in window)) {
      setNotice('Browser notifications are not supported on this device.')
      return
    }
    const permission = await Notification.requestPermission()
    setNotice(permission === 'granted'
      ? 'Browser notifications are enabled for this device.'
      : 'Browser notifications were not enabled. You can still view job alerts in your GulfBridge inbox.')
  }

  const handleAIMatch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = aiPrompt.trim()
    if (!text) {
      setNotice('Describe the role, destination, or skills you want to match.')
      return
    }
    const terms = text.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2)
    const ranked = jobs
      .map((job) => ({
        job,
        score: terms.reduce((sum, term) => sum + ([
          job.title, job.company, job.country, job.city, job.category,
          ...job.requirements, ...job.benefits,
        ].join(' ').toLowerCase().includes(term) ? 1 : 0), 0),
      }))
      .sort((a, b) => b.score - a.score)
    setJobSearch(ranked[0]?.score ? terms.slice(0, 3).join(' ') : '')
    navigate('jobs')
    setNotice('Match preview uses listing keywords. Connect a private AI service for semantic matching; no ID documents are sent to AI.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleSave = (job: Job) => {
    if (!requireSignIn()) return
    const isSaved = savedIds.includes(job.id)
    if (supabase && account && !account.id.startsWith('demo-')) {
      const request = isSaved
        ? supabase.from('saved_jobs').delete().eq('applicant_id', account.id).eq('job_id', job.id)
        : supabase.from('saved_jobs').insert({ applicant_id: account.id, job_id: job.id })
      void request.then(({ error }) => {
        if (error) {
          setNotice(`Saved job could not be updated: ${error.message}`)
          return
        }
        setSavedIds((current) => isSaved ? current.filter((id) => id !== job.id) : [...current, job.id])
        setNotice(isSaved ? 'Removed from saved jobs.' : 'Saved to your profile.')
      })
      return
    }
    setSavedIds((current) => isSaved ? current.filter((id) => id !== job.id) : [...current, job.id])
    setNotice(isSaved ? 'Removed from saved jobs.' : 'Saved to your profile for this demo session.')
  }

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!account || !applyJob) {
      requireSignIn()
      return
    }
    const form = event.currentTarget
    const formData = new FormData(form)
    const cv = formData.get('cv')
    const identity = formData.get('identity')
    if (!(cv instanceof File) || cv.size === 0 || !(identity instanceof File) || identity.size === 0) {
      setNotice('Attach a CV and either a Kenyan national ID or passport image to apply.')
      return
    }
    if (cv.size > 10 * 1024 * 1024 || identity.size > 10 * 1024 * 1024) {
      setNotice('Each document must be 10 MB or smaller.')
      return
    }
    if (!isSupabaseConfigured || !supabase) {
      setNotice('Demo only: configure Supabase to securely submit applications and upload private documents. No files were saved.')
      return
    }

    setIsSubmitting(true)
    let createdApplicationId = ''
    const uploadedApplicationPaths: string[] = []
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) throw userError || new Error('Your sign-in session has expired.')
      const applicationId = crypto.randomUUID()
      const identityKind = String(formData.get('identityKind') || 'passport')
      const { error: appError } = await supabase.from('applications').insert({
        id: applicationId,
        job_id: applyJob.id,
        applicant_id: userData.user.id,
        status: 'applied',
      })
      if (appError) throw appError
      createdApplicationId = applicationId

      for (const [kind, file] of [['cv', cv], [identityKind, identity]] as const) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${userData.user.id}/${applicationId}/${crypto.randomUUID()}-${safeName}`
        const { error: uploadError } = await supabase.storage.from('application-documents').upload(path, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        })
        if (uploadError) throw uploadError
        uploadedApplicationPaths.push(path)
        const { error: documentError } = await supabase.from('application_documents').insert({
          application_id: applicationId,
          applicant_id: userData.user.id,
          document_kind: kind,
          storage_path: path,
          original_filename: file.name,
          mime_type: file.type,
          file_size: file.size,
        })
        if (documentError) throw documentError
      }
      setApplications((current) => [{
        id: applicationId,
        jobId: applyJob.id,
        jobTitle: applyJob.title,
        company: applyJob.company,
        status: 'Applied',
        updated: new Date().toLocaleDateString(),
      }, ...current])
      setApplyJob(null)
      setNotice('Application submitted securely. You can follow updates in your tracker.')
      navigate('applications')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Application could not be completed.'
      if (uploadedApplicationPaths.length) {
        const { error: cleanupError } = await supabase.storage.from('application-documents').remove(uploadedApplicationPaths)
        if (cleanupError) {
          setNotice(`Application could not be completed (${message}); private upload cleanup also failed: ${cleanupError.message}`)
          setIsSubmitting(false)
          return
        }
      }
      if (createdApplicationId) {
        const { error: cleanupError } = await supabase.rpc('cleanup_incomplete_application', { target_application: createdApplicationId })
        if (cleanupError) {
          setNotice(`Application documents could not be saved (${message}); the incomplete application is retained for admin follow-up: ${cleanupError.message}`)
          setIsSubmitting(false)
          return
        }
      }
      setNotice(`Application could not be completed: ${message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitRecruiterListing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!account) {
      requireSignIn()
      return
    }
    const form = event.currentTarget
    const values = new FormData(form)
    const requiredFiles = ['businessDocument', 'recruitmentLicence', 'representativeId']
    if (requiredFiles.some((key) => !(values.get(key) instanceof File) || (values.get(key) as File).size === 0)) {
      setNotice('Attach business registration, applicable recruitment licence, and representative ID for admin review.')
      return
    }
    if (requiredFiles.some((key) => (values.get(key) as File).size > 10 * 1024 * 1024)) {
      setNotice('Each official document must be 10 MB or smaller.')
      return
    }
    if (!isSupabaseConfigured || !supabase) {
      setNotice('Demo only: configure Supabase to submit recruiter documents and listings securely. No files were saved.')
      return
    }

    setIsSubmitting(true)
    const uploadedPaths: string[] = []
    let createdSubmissionId = ''
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) throw userError || new Error('Your sign-in session has expired.')
      const formValues = Object.fromEntries([...values.entries()].filter(([, value]) => typeof value === 'string'))
      const submissionId = crypto.randomUUID()
      const documents = [
        ['business_registration', 'businessDocument'],
        ['recruitment_licence', 'recruitmentLicence'],
        ['representative_id', 'representativeId'],
      ] as const
      const uploadedRecords: Array<{ document_kind: string; storage_path: string; original_filename: string; mime_type: string; file_size: number }> = []
      for (const [documentKind, fieldName] of documents) {
        const file = values.get(fieldName)
        if (!(file instanceof File)) throw new Error(`Missing ${fieldName} file.`)
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${userData.user.id}/${submissionId}/${crypto.randomUUID()}-${safeName}`
        const { error: uploadError } = await supabase.storage.from('agency-documents').upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        })
        if (uploadError) throw uploadError
        uploadedPaths.push(storagePath)
        uploadedRecords.push({
          document_kind: documentKind,
          storage_path: storagePath,
          original_filename: file.name,
          mime_type: file.type || 'application/octet-stream',
          file_size: file.size,
        })
      }

      const { data: submission, error: submissionError } = await supabase.from('job_submissions').insert({
        id: submissionId,
        employer_id: userData.user.id,
        agency_name: formValues.agencyName,
        representative_name: formValues.representativeName,
        contact_email: formValues.contactEmail,
        contact_phone: formValues.contactPhone,
        business_registration_number: formValues.registrationNumber,
        employer_market: formValues.employerMarket,
        listing_plan: formValues.listingPlan,
        whatsapp_contact: formValues.whatsappContact || null,
        job_title: formValues.jobTitle,
        country: formValues.country,
        city: formValues.city,
        category: formValues.category,
        employment_type: formValues.employmentType,
        description: formValues.description,
        salary_min: Number(formValues.salaryMin),
        salary_max: Number(formValues.salaryMax),
        salary_currency: formValues.currency,
        review_status: 'pending',
      }).select('id,job_title,agency_name,country,city,review_status,review_note,payment_status,payment_amount,payment_currency,listing_plan,created_at').single()
      if (submissionError) throw submissionError
      if (!submission) throw new Error('Submission was created but could not be loaded.')
      createdSubmissionId = submission.id
      const { error: documentsError } = await supabase.from('job_submission_documents').insert(
        uploadedRecords.map((record) => ({ ...record, submission_id: submission.id, employer_id: userData.user.id })),
      )
      if (documentsError) throw documentsError
      form.reset()
      setMySubmissions((current) => [submission as RecruiterSubmission, ...current])
      setNotice('Submission sent to admin review. It will not be public until approved, paid, and published.')
    } catch (error) {
      let cleanupFailure = ''
      if (uploadedPaths.length) {
        const { error: cleanupError } = await supabase.storage.from('agency-documents').remove(uploadedPaths)
        if (cleanupError) cleanupFailure = ` Private-file cleanup also failed: ${cleanupError.message}`
      }
      if (createdSubmissionId) {
        const { error: deleteError } = await supabase.from('job_submissions').delete().eq('id', createdSubmissionId)
        if (deleteError) cleanupFailure += ` Incomplete record ${createdSubmissionId} also requires admin cleanup: ${deleteError.message}`
      }
      setNotice(`${error instanceof Error ? `Submission failed: ${error.message}` : 'Submission failed.'}${cleanupFailure}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut()
      if (error) {
        setNotice(`Could not sign out: ${error.message}`)
        return
      }
    }
    if (account) {
      try {
        window.localStorage.removeItem(sessionDayStorageKey(account.id))
      } catch (error) {
        console.error('Could not clear the sign-in date:', error)
      }
    }
    setAccount(null)
    setSavedIds([])
    setApplications([])
    setEmployerApplications([])
    setMySubmissions([])
    setPremiumRequests([])
    setAdminReviews([])
    setAdminPayments([])
    setAdminPremiumRequests([])
    setAdminApplications([])
    setPage('home')
    window.history.replaceState({ gulfbridgePage: 'home' }, '')
    setNotice('You have signed out.')
  }

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthError('')
    setAuthNotice('')
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    const email = String(values.email || '').trim()
    const password = String(values.password || '')
    const mode = String(values.mode || 'signin')
    const fullName = String(values.fullName || '').trim()
    const phone = String(values.phone || '').trim()
    if (!email || !password) {
      setAuthError('Enter your email and password.')
      return
    }
    if (adminLoginMode && mode !== 'signin') {
      setAuthError('Admin access is sign-in only. New admin accounts must be provisioned outside the website.')
      return
    }
    if (mode === 'signup' && (!fullName || !phone)) {
      setAuthError('Name and phone number are required during registration.')
      return
    }
    if (!supabase) {
      if (adminLoginMode) {
        setAuthError('Admin access requires a configured Supabase project and an authorized account.')
        return
      }
      const demoAccount: Account = {
        id: `demo-${Date.now()}`,
        email,
        name: mode === 'signup' ? fullName : (email.split('@')[0] || 'GulfBridge member'),
        phone,
        location: 'Nairobi, Kenya',
        headline: '',
        skills: '',
        role: 'seeker',
        roles: ['seeker'],
      }
      setAccount(demoAccount)
      setAuthOpen(false)
      setNotice('Demo session started. Connect Supabase to enable secure, persistent accounts.')
      return
    }
    const result = mode === 'signup' && !adminLoginMode
      ? await supabase.auth.signUp({
          email,
          password,
        options: {
          data: { full_name: fullName, phone, primary_role: 'seeker' },
          emailRedirectTo: window.location.origin,
        },
      })
      : await supabase.auth.signInWithPassword({ email, password })
    if (result.error) {
      setAuthError(result.error.message)
      return
    }
    if (adminLoginMode) {
      if (!result.data.user) {
        setAuthError('Sign-in succeeded, but the account could not be verified.')
        return
      }
      const { data: roleRows, error: roleError } = await supabase.from('user_roles').select('role').eq('user_id', result.data.user.id)
      if (roleError) {
        await supabase.auth.signOut({ scope: 'local' })
        setAuthError(`Could not verify admin access: ${roleError.message}`)
        return
      }
      const roles = (roleRows || [])
        .map((row) => row.role)
        .filter((role): role is Account['roles'][number] => ['seeker', 'recruiter', 'admin'].includes(role))
      if (!roles.includes('admin')) {
        await supabase.auth.signOut({ scope: 'local' })
        setAuthError('This account does not have admin access. Sign in with the existing authorized admin account.')
        return
      }
      try {
        window.localStorage.setItem(sessionDayStorageKey(result.data.user.id), getLocalDayKey())
      } catch (error) {
        console.error('Could not save the sign-in date:', error)
      }
      setAccountFromUser(result.data.user)
      setAccount((current) => current && current.id === result.data.user?.id
        ? { ...current, role: 'admin', roles: Array.from(new Set<Account['roles'][number]>(['seeker', ...roles])) }
        : current)
      setAuthOpen(false)
      setAdminLoginMode(false)
      window.history.pushState({ gulfbridgePage: 'admin', previousGulfbridgePage: page }, '')
      setAdminUsersLoading(true)
      setAdminUsersError('')
      setPage('admin')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setNotice('Admin access verified.')
      return
    }
    if (result.data.user) {
      try {
        window.localStorage.setItem(sessionDayStorageKey(result.data.user.id), getLocalDayKey())
      } catch (error) {
        console.error('Could not save the sign-in date:', error)
      }
    }
    if (mode === 'signup' && !result.data.session) {
      setAuthNotice('Check your email to confirm your account, then sign in. Your phone is required during registration.')
      return
    }
    if (result.data.user) setAccountFromUser(result.data.user)
    setAuthOpen(false)
    setNotice(mode === 'signup' ? 'Account created.' : 'Welcome back.')
  }

  const openPostJob = () => {
    if (!requireSignIn()) return
    void handleRoleSwitch('recruiter')
  }

  const startApply = (job: Job) => {
    if (!requireSignIn()) return
    setApplyJob(job)
  }

  const openProfileEditor = () => {
    if (!account) {
      requireSignIn()
      return
    }
    setProfileDraft({ ...account })
    setProfileEditing(true)
  }

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profileDraft || !account) return
    if (supabase && account.id) {
      const { error } = await supabase.from('profiles').update({
        full_name: profileDraft.name,
        phone: profileDraft.phone,
        location: profileDraft.location,
        headline: profileDraft.headline,
        skills: profileDraft.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
      }).eq('id', account.id)
      if (error) {
        setNotice(`Profile could not be saved: ${error.message}`)
        return
      }
    } else {
      setNotice('Demo profile updated for this session only.')
    }
    setAccount(profileDraft)
    setProfileEditing(false)
  }

  const downloadProfileDocument = async (documentRecord: (typeof profileDocuments)[number]) => {
    if (!supabase) {
      setNotice('Private downloads require a connected Supabase project.')
      return
    }
    const { data, error } = await supabase.storage.from('application-documents').createSignedUrl(documentRecord.storage_path, 60, {
      download: documentRecord.original_filename,
    })
    if (error) {
      setNotice(`Could not create a private download link: ${error.message}`)
      return
    }
    const link = document.createElement('a')
    link.href = data.signedUrl
    link.download = documentRecord.original_filename
    link.rel = 'noreferrer'
    link.click()
  }

  const handleDeleteAccount = async () => {
    if (!account) return
    if (!supabase || account.id.startsWith('demo-')) {
      setAccount(null)
      setPage('home')
      window.history.replaceState({ gulfbridgePage: 'home' }, '')
      setDeleteConfirmOpen(false)
      setNotice('Demo profile removed from this session. No account data was stored.')
      return
    }
    setIsSubmitting(true)
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
    if (error) {
      setNotice(`Account deletion could not be completed: ${error.message}. Your account remains active; please retry or contact support.`)
      setIsSubmitting(false)
      return
    }
    setProfileDocuments([])
    setAccount(null)
    setPage('home')
    window.history.replaceState({ gulfbridgePage: 'home' }, '')
    setDeleteConfirmOpen(false)
    setIsSubmitting(false)
    setNotice('Your account and associated private documents were deleted.')
  }

  const downloadAgencyDocument = async (submissionId: string, documentKind: string) => {
    if (!supabase) return
    const { data: record, error: recordError } = await supabase
      .from('job_submission_documents')
      .select('storage_path,original_filename')
      .eq('submission_id', submissionId)
      .eq('document_kind', documentKind)
      .maybeSingle()
    if (recordError || !record) {
      setNotice(recordError ? `Could not load verification file: ${recordError.message}` : 'Verification file not found.')
      return
    }
    const { data, error } = await supabase.storage.from('agency-documents').createSignedUrl(record.storage_path, 60, { download: record.original_filename })
    if (error) {
      setNotice(`Could not create a private document link: ${error.message}`)
      return
    }
    const link = document.createElement('a')
    link.href = data.signedUrl
    link.download = record.original_filename
    link.rel = 'noreferrer'
    link.click()
  }

  const handleRoleSwitch = async (role: 'seeker' | 'recruiter') => {
    if (!account) {
      requireSignIn()
      return
    }
    if (role === 'recruiter' && supabase && !account.id.startsWith('demo-') && !account.roles.includes('recruiter')) {
      const { error } = await supabase.from('user_roles').insert({ user_id: account.id, role: 'recruiter' })
      if (error && error.code !== '23505') {
        setNotice(`Could not enable recruiter access: ${error.message}`)
        return
      }
    }
    setAccount({ ...account, role, roles: Array.from(new Set([...account.roles, role])) })
    navigate(role === 'recruiter' ? 'recruiter' : 'home')
  }

  const submitListingPayment = async (event: FormEvent<HTMLFormElement>, submission: RecruiterSubmission) => {
    event.preventDefault()
    if (!account || !supabase) {
      setNotice('Connect Supabase and sign in to request payment confirmation.')
      return
    }
    const values = new FormData(event.currentTarget)
    const method = String(values.get('method') || '')
    const reference = String(values.get('reference') || '').trim()
    if (method !== 'bank_transfer') {
      setNotice('M-Pesa and card checkout are not configured yet. No money was charged; use bank transfer for manual confirmation meanwhile.')
      return
    }
    if (!reference) {
      setNotice('Enter the bank transfer reference so an admin can verify the payment.')
      return
    }
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      setNotice(userError?.message || 'Your sign-in session has expired.')
      return
    }
    const { error } = await supabase.from('listing_payments').insert({
      submission_id: submission.id,
      employer_id: userData.user.id,
      amount: submission.payment_amount,
      currency: submission.payment_currency,
      method,
      provider_reference: reference,
      status: 'pending_confirmation',
    })
    if (error) {
      setNotice(`Payment reference could not be submitted: ${error.message}`)
      return
    }
    setNotice('Payment reference sent for admin confirmation. Your job remains unpublished until confirmation.')
    setMySubmissions((current) => current.map((item) => item.id === submission.id ? { ...item, payment_status: 'pending_confirmation' } : item))
  }

  const submitPremiumPayment = async (event: FormEvent<HTMLFormElement>, subscription: PremiumRequest) => {
    event.preventDefault()
    if (!supabase) {
      setNotice('Premium subscription payment requires a connected Supabase project.')
      return
    }
    const values = new FormData(event.currentTarget)
    const method = String(values.get('method') || '')
    const reference = String(values.get('reference') || '').trim()
    if (method !== 'bank_transfer') {
      setNotice('M-Pesa and card checkout are not configured yet. No money was charged; use bank transfer for manual confirmation meanwhile.')
      return
    }
    if (!reference) {
      setNotice('Enter the bank transfer reference for admin confirmation.')
      return
    }
    const { error } = await supabase.from('premium_subscriptions').update({
      status: 'pending_confirmation',
      payment_method: method,
      payment_reference: reference,
    }).eq('id', subscription.id)
    if (error) {
      setNotice(`Premium payment reference could not be submitted: ${error.message}`)
      return
    }
    setPremiumRequests((current) => current.map((item) => item.id === subscription.id ? { ...item, status: 'pending_confirmation', payment_method: method, payment_reference: reference } : item))
    setNotice('Premium payment reference sent for admin confirmation.')
  }

  const requestPremiumPlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!account || !supabase) {
      setNotice('Connect Supabase and sign in to request a premium company plan.')
      return
    }
    const values = new FormData(event.currentTarget)
    const market = String(values.get('employerMarket') || '')
    const { error } = await supabase.from('premium_subscriptions').insert({
      employer_id: account.id,
      employer_market: market,
      status: 'awaiting_payment',
    })
    if (error) {
      setNotice(`Premium plan request could not be created: ${error.message}`)
      return
    }
    setNotice('Premium plan request created. Submit payment details below; the plan becomes active only after admin confirmation.')
    const { data, error: reloadError } = await supabase.from('premium_subscriptions').select('id,employer_id,employer_market,payment_amount,payment_currency,payment_method,payment_reference,status').eq('employer_id', account.id).order('created_at', { ascending: false }).limit(1)
    if (reloadError) setNotice(`Request was created but could not be refreshed: ${reloadError.message}`)
    else if (data?.[0]) setPremiumRequests((current) => [data[0] as PremiumRequest, ...current])
  }

  const reviewSubmission = async (submission: AdminReview, decision: 'approved' | 'rejected' | 'needs_changes', verified: boolean) => {
    if (!supabase) return
    if (decision === 'approved' && submission.document_count < 3) {
      setNotice('Review all three required official documents before approval.')
      return
    }
    const reason = decision === 'approved' ? null : decision === 'rejected' ? 'Rejected by admin after review.' : 'Please provide additional information and resubmit.'
    const { error } = await supabase.rpc('admin_review_job_submission', {
      target_submission: submission.id,
      decision,
      reason,
      verify_agency: verified,
    })
    if (error) {
      setNotice(`Review action failed: ${error.message}`)
      return
    }
    setAdminReviews((current) => current.filter((item) => item.id !== submission.id))
    setNotice(decision === 'approved'
      ? submission.listing_plan === 'premium'
        ? 'Listing approved and published under the active premium plan.'
        : 'Listing approved. Employer can now submit payment; publication waits for confirmation.'
      : `Submission marked ${decision.replace('_', ' ')}.`)
  }

  const confirmListingPayment = async (payment: PaymentReview) => {
    if (!supabase) return
    const { error } = await supabase.rpc('admin_confirm_listing_payment', { target_payment: payment.id })
    if (error) {
      setNotice(`Payment confirmation failed: ${error.message}`)
      return
    }
    setAdminPayments((current) => current.filter((item) => item.id !== payment.id))
    setNotice('Payment confirmed; the approved listing is now published for 30 days.')
  }

  const confirmPremiumSubscription = async (subscription: PremiumRequest) => {
    if (!supabase) return
    const { error } = await supabase.rpc('admin_confirm_premium_subscription', { target_subscription: subscription.id })
    if (error) {
      setNotice(`Premium payment confirmation failed: ${error.message}`)
      return
    }
    setAdminPremiumRequests((current) => current.filter((item) => item.id !== subscription.id))
    setNotice('Premium company plan is active for one month.')
  }

  const updateApplicationStatus = async (applicationId: string, status: string, asAdmin = false) => {
    if (!supabase) {
      setNotice('Application updates require a connected Supabase project.')
      return
    }
    const update = asAdmin
      ? { status, admin_note: 'Admin reviewed application status.' }
      : { status, employer_note: 'Employer updated application progress.' }
    const { error } = await supabase.from('applications').update(update).eq('id', applicationId)
    if (error) {
      setNotice(`Application status could not be updated: ${error.message}`)
      return
    }
    setEmployerApplications((current) => current.map((item) => item.application_id === applicationId ? { ...item, status, updated_at: new Date().toISOString() } : item))
    setAdminApplications((current) => current.map((item) => item.application_id === applicationId ? { ...item, status, updated_at: new Date().toISOString() } : item))
    setApplications((current) => current.map((item) => item.id === applicationId ? { ...item, status, updated: new Date().toLocaleDateString() } : item))
    setNotice(asAdmin ? 'Admin override recorded in the application timeline.' : 'Application progress updated.')
  }

  const updateAdminJob = async (id: string, values: AdminJobUpdate) => {
    if (!supabase) return
    const { error } = await supabase.from('job_submissions').update(values).eq('id', id)
    if (error) {
      setNotice(`Job could not be updated: ${error.message}`)
      return
    }
    setAdminJobs((current) => current.map((job) => job.id === id ? { ...job, ...values } : job))
    setJobs((current) => current.map((job) => job.id === id ? {
      ...job,
      title: values.job_title,
      company: values.agency_name,
      country: values.country,
      city: values.city,
      category: values.category,
      employmentType: values.employment_type,
      description: values.description,
      salaryMin: values.salary_min,
      salaryMax: values.salary_max,
      currency: values.salary_currency as Job['currency'],
    } : job))
    setNotice('Job listing updated.')
  }

  const archiveAdminJob = async (id: string) => {
    if (!supabase) return
    const { error } = await supabase.from('job_submissions').update({ expires_at: new Date().toISOString() }).eq('id', id)
    if (error) {
      setNotice(`Job could not be removed from public listings: ${error.message}`)
      return
    }
    setAdminJobs((current) => current.filter((job) => job.id !== id))
    setJobs((current) => current.filter((job) => job.id !== id))
    setNotice('Job removed from public listings. Existing application records are preserved.')
  }

  const createAdminCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    if (!supabase) return
    const name = String(new FormData(formElement).get('name') || '').trim()
    if (!name) return
    const { data, error } = await supabase.from('job_categories').insert({ name }).select('name,is_active').single()
    if (error) {
      setNotice(`Category could not be added: ${error.message}`)
      return
    }
    setAdminCategories((current) => [...current, data as AdminCategory].sort((a, b) => a.name.localeCompare(b.name)))
    formElement.reset()
  }

  const toggleAdminCategory = async (category: AdminCategory) => {
    if (!supabase) return
    const { error } = await supabase.from('job_categories').update({ is_active: !category.is_active }).eq('name', category.name)
    if (error) {
      setNotice(`Category could not be updated: ${error.message}`)
      return
    }
    setAdminCategories((current) => current.map((item) => item.name === category.name ? { ...item, is_active: !item.is_active } : item))
  }

  const createOverseasNews = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    if (!supabase || !account) return
    const values = new FormData(formElement)
    const isPublished = values.get('publish') === 'on'
    const { data, error } = await supabase.from('overseas_news').insert({
      title: String(values.get('title') || '').trim(),
      summary: String(values.get('summary') || '').trim(),
      country: String(values.get('country') || '') || null,
      source_url: String(values.get('sourceUrl') || '').trim() || null,
      is_published: isPublished,
      published_at: isPublished ? new Date().toISOString() : null,
      created_by: account.id,
    }).select('id,title,summary,country,source_url,is_published,published_at,created_at').single()
    if (error) {
      setNotice(`News item could not be created: ${error.message}`)
      return
    }
    setAdminNews((current) => [data as AdminNews, ...current])
    formElement.reset()
  }

  const toggleNewsVisibility = async (news: AdminNews) => {
    if (!supabase) return
    const isPublished = !news.is_published
    const { error } = await supabase.from('overseas_news').update({
      is_published: isPublished,
      published_at: isPublished ? new Date().toISOString() : null,
    }).eq('id', news.id)
    if (error) {
      setNotice(`News visibility could not be changed: ${error.message}`)
      return
    }
    setAdminNews((current) => current.map((item) => item.id === news.id ? { ...item, is_published: isPublished, published_at: isPublished ? new Date().toISOString() : null } : item))
  }

  const deleteOverseasNews = async (id: string) => {
    if (!supabase) return
    const { error } = await supabase.from('overseas_news').delete().eq('id', id)
    if (error) {
      setNotice(`News item could not be deleted: ${error.message}`)
      return
    }
    setAdminNews((current) => current.filter((item) => item.id !== id))
  }

  const updateScamReport = async (report: AdminScamReport, status: string) => {
    if (!supabase || !account) return
    const { error } = await supabase.from('scam_reports').update({
      status,
      reviewed_by: account.id,
    }).eq('id', report.id)
    if (error) {
      setNotice(`Scam report could not be updated: ${error.message}`)
      return
    }
    setAdminScamReports((current) => current.map((item) => item.id === report.id ? { ...item, status } : item))
  }

  const setAdminUserDisabled = async (profile: AdminProfile) => {
    if (!supabase) return
    const disabled = !profile.disabled
    const { error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'set-disabled', userId: profile.id, disabled },
    })
    if (error) {
      setNotice(`Account status could not be changed: ${error.message}`)
      return
    }
    setAdminProfiles((current) => current.map((user) => user.id === profile.id ? { ...user, disabled } : user))
    setNotice(disabled ? 'User account access has been suspended.' : 'User account access has been restored.')
  }

  const renderPage = () => {
    if (page === 'alerts') {
      return (
        <main className="page-shell">
          <PageHeading eyebrow="Your opportunities" title="Job alerts & notifications" description="Save the roles and destinations you care about. We’ll show matching new listings in your GulfBridge inbox." onBack={goBack} backLabel={t('back')} />
          <div className="alerts-layout">
            <section className="panel alert-create-panel">
              <div className="panel-heading"><div><span className="eyebrow">Personalize your search</span><h2>Create a job alert</h2></div><BellRing size={20} /></div>
              <form className="stack-form" onSubmit={createJobAlert}>
                <label className="form-label">Job title or keyword<input name="keyword" placeholder="e.g. nurse, driver, hospitality" /></label>
                <div className="form-grid">
                  <label className="form-label">Country<select name="country" defaultValue=""><option value="">Any country</option>{countryHighlights.map(({ country }) => <option key={country} value={country}>{country}</option>)}</select></label>
                  <label className="form-label">Category<select name="category" defaultValue=""><option value="">Any category</option>{categoryNames.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label>
                  <label className="form-label">Job type<select name="employmentType" defaultValue=""><option value="">Any job type</option>{['Full time', 'Contract', 'Seasonal', 'Part time'].map((type) => <option key={type}>{type}</option>)}</select></label>
                </div>
                <fieldset className="alert-channel-options"><legend>Notify me by</legend>
                  <label><input type="checkbox" name="channels" value="web" defaultChecked /> GulfBridge website notifications</label>
                  <label><input type="checkbox" name="channels" value="email" /> Email ({account?.email})</label>
                </fieldset>
                <p className="alert-delivery-note">Website alerts are saved to your account. Email alerts are queued securely; email delivery requires the mail service to be configured.</p>
                <button className="button button-gold" type="submit"><BellRing size={15} /> Save job alert</button>
              </form>
            </section>
            <section className="panel notification-panel">
              <div className="panel-heading"><div><span className="eyebrow">New opportunities</span><h2>Your notifications</h2></div><button className="text-button" type="button" onClick={() => void enableWebNotifications()}><BellRing size={15} /> Enable browser alerts</button></div>
              {jobNotifications.length ? <div className="notification-list">{jobNotifications.map((notification) => {
                const job = jobs.find((item) => item.id === notification.job_id)
                return <article className={`notification-item ${notification.read_at ? '' : 'unread'}`} key={notification.id}>
                  <button className="notification-open" type="button" onClick={() => {
                    if (job) setActiveJob(job)
                    else setNotice('This opportunity is no longer available.')
                    void markNotificationRead(notification)
                  }}>
                    <span className="notification-dot" />
                    <span><strong>{notification.title}</strong><small>{notification.body} · {new Date(notification.created_at).toLocaleDateString()}</small></span>
                  </button>
                  <a className="notification-share" href={`https://wa.me/?text=${encodeURIComponent(`${notification.title} — ${notification.body} ${window.location.origin}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Share job alert on WhatsApp"><MessageCircle size={16} /></a>
                </article>
              })}</div> : <p className="queue-empty-note">New jobs that match your saved alerts will appear here.</p>}
            </section>
            <section className="panel saved-alerts-panel">
              <div className="panel-heading"><div><span className="eyebrow">Your preferences</span><h2>Saved job alerts</h2></div></div>
              {jobAlerts.length ? jobAlerts.map((alert) => <article className="saved-alert-row" key={alert.id}>
                <span className="guide-icon"><BellRing size={17} /></span>
                <span><strong>{alert.keyword || 'Any matching role'}</strong><small>{[alert.country, alert.category, alert.employment_type].filter(Boolean).join(' · ') || 'All countries and categories'} · {alert.channels.join(', ')}</small></span>
                <button className="text-button" type="button" onClick={() => void deleteJobAlert(alert.id)}>Delete</button>
              </article>) : <p className="queue-empty-note">You haven’t saved a job alert yet.</p>}
            </section>
          </div>
        </main>
      )
    }

    if (page === 'guides') {
      return (
        <main className="page-shell">
          <PageHeading eyebrow="Career guides" title="Make your next move with confidence" description="Practical guidance for preparing, applying, and working abroad." onBack={goBack} backLabel={t('back')} />
          <div className="guide-grid">
            {careerGuides.map(({ icon: Icon, title, description }, index) => (
              <article className="panel guide-card" key={title}>
                <span className="guide-icon"><Icon size={20} /></span>
                <span className="guide-number">0{index + 1}</span>
                <h2>{title}</h2>
                <p>{description}</p>
                <button className="text-button" type="button" onClick={() => navigate('help')}>Read safety guidance <ArrowRight size={15} /></button>
              </article>
            ))}
          </div>
        </main>
      )
    }

    if (page === 'help') {
      return (
        <main className="page-shell">
          <PageHeading
            eyebrow={isArabic ? 'نحن هنا للمساعدة' : 'We’re here to help'}
            title={isArabic ? 'المساعدة والسلامة' : 'Help & safety'}
            description={isArabic
              ? 'تواصل مع فريق GulfBridge واحصل على إرشادات للتقديم بأمان.'
              : 'Contact the GulfBridge team and find practical guidance for a safer job search.'}
            onBack={goBack}
            backLabel={t('back')}
          />
          <section className="help-contact-grid" aria-label={isArabic ? 'طرق التواصل' : 'Contact options'}>
            <a className="panel help-contact-card" href="mailto:gulfbridgeworld@gmail.com?subject=GulfBridge%20support">
              <span className="feature-icon"><Mail size={20} /></span>
              <span><strong>{isArabic ? 'راسلنا عبر البريد الإلكتروني' : 'Email our team'}</strong><small>gulfbridgeworld@gmail.com</small></span>
              <ArrowUpRight size={16} />
            </a>
            <a className="panel help-contact-card" href="https://wa.me/254736677630?text=Hello%20GulfBridge%2C%20I%20need%20help." target="_blank" rel="noopener noreferrer">
              <span className="feature-icon"><MessageCircle size={20} /></span>
              <span><strong>{isArabic ? 'تواصل معنا عبر واتساب' : 'Chat with us on WhatsApp'}</strong><small>+254 736 677 630</small></span>
              <ArrowUpRight size={16} />
            </a>
          </section>
          <section className="panel help-safety-panel">
            <div className="panel-heading">
              <span className="feature-icon"><ShieldCheck size={20} /></span>
              <div><span className="eyebrow">{isArabic ? 'قبل قبول أي عرض' : 'Before accepting an offer'}</span><h2>{isArabic ? 'خطوات تساعدك على البقاء بأمان' : 'Keep your job search safe'}</h2></div>
            </div>
            <ul className="help-safety-list">
              {isArabic ? <>
                <li>تحقق من هوية صاحب العمل ووكالة التوظيف عبر قنوات رسمية ومستقلة.</li>
                <li>اطلب عقدًا مكتوبًا يوضح الراتب وساعات العمل والخصومات والسكن والسفر.</li>
                <li>لا ترسل أموالًا إلى أفراد أو حسابات غير رسمية، وتحقق بشكل مستقل من أي رسوم قانونية.</li>
                <li>احتفظ بجواز سفرك ووثائقك الأصلية، وشارك تفاصيل رحلتك مع شخص تثق به.</li>
                <li>مراجعة GulfBridge للمنصة ليست اعتمادًا حكوميًا ولا تضمن سلوك صاحب العمل.</li>
              </> : <>
                <li>Verify the employer and recruitment agency independently through official channels.</li>
                <li>Get a written contract covering pay, working hours, deductions, accommodation, and travel.</li>
                <li>Never send money to an individual or unofficial account; independently verify any lawful fees.</li>
                <li>Keep your passport and original documents, and share your travel plans with someone you trust.</li>
                <li>A GulfBridge platform review is not government endorsement and cannot guarantee an employer’s conduct.</li>
              </>}
            </ul>
            <p className="help-emergency-note">
              {isArabic
                ? 'إذا كنت في خطر فوري، اتصل بخدمات الطوارئ المحلية أو بسفارة بلدك.'
                : 'If you are in immediate danger, contact local emergency services or your country’s embassy.'}
            </p>
          </section>
        </main>
      )
    }

    if (page === 'map') {
      return (
        <main className="page-shell">
          <PageHeading eyebrow="Location discovery" title="Find work where it happens" description="Explore reviewed opportunities across Gulf cities, Canada, and the United States." onBack={goBack} backLabel={t('back')} />
          <MapExplorer jobs={filteredJobs} onSelectJob={setActiveJob} />
        </main>
      )
    }

    if (page === 'jobs' || page === 'saved') {
      const listing = page === 'saved' ? jobs.filter((job) => savedIds.includes(job.id)) : filteredJobs
      return (
        <main className="page-shell">
          <PageHeading eyebrow={page === 'saved' ? 'Your shortlist' : 'Explore opportunities'} title={page === 'saved' ? 'Saved jobs' : t('jobsHeading')} description={page === 'saved' ? 'Return to opportunities you want to review.' : t('jobsSubheading')} action={page === 'jobs' ? <button className="button button-outline" type="button" onClick={() => navigate('alerts')}><BellRing size={15} /> Create job alert</button> : undefined} onBack={goBack} backLabel={t('back')} />
          <FilterBar
            destinations={destinations}
            categories={categoryNames}
            destination={destinationFilter}
            category={categoryFilter}
            verifiedOnly={verifiedOnly}
            onDestination={setDestinationFilter}
            onCategory={setCategoryFilter}
            onVerifiedOnly={setVerifiedOnly}
            onSearch={setJobSearch}
            search={jobSearch}
          />
          <p className="result-count">{listing.length} {listing.length === 1 ? 'opportunity' : 'opportunities'}</p>
          {listing.length ? <div className="job-grid">{listing.map((job, index) => <JobCard key={job.id} job={job} index={index} isSaved={savedIds.includes(job.id)} onOpen={setActiveJob} onSave={toggleSave} t={t} toKes={toKes} isExample={isExampleListing} />)}</div> : page === 'jobs' && jobs.length === 0
            ? <EmptyState title="No new opportunities just yet" description="New listings appear here after review. Check back soon or get in touch with our team." action="Help & safety" onAction={() => navigate('help')} />
            : <EmptyState title="No jobs match these filters" description="Try another destination, category, or search term." action="Clear filters" onAction={() => { setDestinationFilter('All destinations'); setCategoryFilter('All fields'); setVerifiedOnly(false); setJobSearch('') }} />}
        </main>
      )
    }

    if (page === 'applications') {
      return (
        <main className="page-shell">
          <PageHeading eyebrow="Your journey" title={t('trackerTitle')} description="Employer updates are shown here. Admin retains final oversight of application status." onBack={goBack} backLabel={t('back')} />
          {applications.length === 0 ? <EmptyState title="Your next opportunity starts here" description={t('emptyApplications')} action="Browse jobs" onAction={() => navigate('jobs')} /> : (
            <div className="application-list">{applications.map((application) => <ApplicationCard key={application.id} application={application} />)}</div>
          )}
          {applications.length > 0 && <div className="notice-card"><ShieldCheck size={18} /><span>Visa and travel stages reflect reported progress, not an official immigration decision.</span></div>}
        </main>
      )
    }

    if (page === 'profile') {
      return (
        <main className="page-shell">
          <PageHeading eyebrow="Account" title={t('profileTitle')} description={t('profileDescription')} onBack={goBack} backLabel={t('back')} />
          {!account ? <EmptyState title="Sign in to view your account" description="Your profile and downloads are private to you." action="Sign in" onAction={() => setAuthOpen(true)} /> : (
            <div className="profile-layout">
              <section className="profile-card panel">
                <div className="profile-avatar">{getInitials(account.name)}</div>
                <h2>{account.name}</h2><p>{account.headline || 'Job seeker · GulfBridge member'}</p>
                <button className="button button-outline" onClick={openProfileEditor} type="button"><UserRound size={16} /> {t('editProfile')}</button>
                <div className="profile-divider" />
                <InfoRow icon={<Globe2 size={16} />} label="Account roles" value={account.roles.map((role) => role === 'seeker' ? 'Job seeker' : role === 'recruiter' ? 'Recruiter' : 'Admin').join(' · ')} />
                <InfoRow icon={<LockKeyhole size={16} />} label="Documents" value="Added securely per application" />
              </section>
              <section className="panel profile-details">
                <div className="panel-heading"><div><span className="eyebrow">Personal information</span><h2>Profile details</h2></div><button className="text-button" onClick={openProfileEditor} type="button">Edit details <ArrowRight size={15} /></button></div>
                <InfoRow icon={<UserRound size={16} />} label={t('name')} value={account.name} />
                <InfoRow icon={<MessageCircle size={16} />} label={t('email')} value={account.email} />
                <InfoRow icon={<MessageCircle size={16} />} label={t('phone')} value={account.phone || 'Add your phone number'} />
                <InfoRow icon={<MapPin size={16} />} label={t('location')} value={account.location || 'Add your location'} />
                <InfoRow icon={<BriefcaseBusiness size={16} />} label={t('skills')} value={account.skills || 'Add your skills'} />
              </section>
              <section className="panel download-panel">
                <div className="feature-icon"><ArrowDownToLine size={21} /></div>
                <div className="document-list-wrap"><h3>Your application documents</h3><p>Private files remain attached to their application. No automatic expiry is applied.</p>
                  {profileDocuments.length ? profileDocuments.map((record) => <div className="private-document-row" key={record.id}><span><FileText size={14} />{record.original_filename}<small>{record.document_kind.replace('_', ' ')} · {new Date(record.created_at).toLocaleDateString()}</small></span><button className="text-button" type="button" onClick={() => void downloadProfileDocument(record)}><ArrowDownToLine size={14} /> Download</button></div>) : <small className="no-documents">{isSupabaseConfigured ? 'No application documents found on this account.' : 'Documents appear here after Supabase is connected and an application is submitted.'}</small>}
                </div>
              </section>
              <section className="panel danger-zone"><div><h3>Delete account permanently</h3><p>This removes your account and its private documents, subject to applicable legal retention requirements. This cannot be undone.</p></div><button className="button button-danger" type="button" onClick={() => setDeleteConfirmOpen(true)}>Delete account</button></section>
            </div>
          )}
        </main>
      )
    }

    if (page === 'recruiter') {
      return (
        <main className="page-shell">
          <PageHeading eyebrow="Recruiter workspace" title="Submit your agency and job" description="Share your official details and job offer together. Admin reviews every submission before it can be paid for and published." action={<button className="button button-outline" type="button" onClick={() => handleRoleSwitch('seeker')}>Switch to seeker view</button>} onBack={goBack} backLabel={t('back')} />
          <RecruiterForm onSubmit={submitRecruiterListing} isSubmitting={isSubmitting} />
          <section className="panel premium-request-panel"><div><span className="eyebrow">Premium company plan</span><h2>One month of premium visibility</h2><p>Unlimited active job listings during the paid month; each post is still reviewed. Includes homepage logo placement and a direct company WhatsApp contact button on approved listings.</p></div><form onSubmit={requestPremiumPlan}><label className="form-label">Company market<select name="employerMarket" defaultValue="kenyan_agency"><option value="kenyan_agency">Kenyan agency · KSh 20,000 / month</option><option value="gulf_employer">Gulf employer · SAR 578 / month</option></select></label><button className="button button-gold" type="submit">Request premium plan <ArrowRight size={15} /></button></form></section>
          <section className="pricing-row">
            <PriceCard title="Kenyan agency listing" price="KSh 5,000" note="One approved listing · 30 days" />
            <PriceCard title="Gulf employer listing" price="SAR 289" note="One approved listing · 30 days" />
            <PriceCard title="Premium company" price="KSh 20,000 / SAR 578" note="One month · unlimited active listings · homepage logo · direct company WhatsApp contact" />
          </section>
          <p className="fine-print">Premium posts use the active one-month company plan and do not incur a per-job fee. Premium does not bypass admin review. WhatsApp is direct company contact only, not an application channel.</p>
          {premiumRequests.length > 0 && <section className="panel recruiter-submissions"><div className="panel-heading"><div><span className="eyebrow">Company plan</span><h2>Premium payment status</h2></div></div>{premiumRequests.map((item) => <PremiumRequestCard key={item.id} request={item} onSubmit={submitPremiumPayment} />)}</section>}
          {mySubmissions.length > 0 && <section className="panel recruiter-submissions"><div className="panel-heading"><div><span className="eyebrow">Your submissions</span><h2>Job review and payment status</h2></div></div>{mySubmissions.map((item) => <RecruiterSubmissionCard key={item.id} submission={item} onPayment={submitListingPayment} />)}</section>}
          {employerApplications.length > 0 && <section className="panel recruiter-submissions"><div className="panel-heading"><div><span className="eyebrow">Applications</span><h2>People who applied to your jobs</h2></div></div>{employerApplications.map((item) => <EmployerApplicationCard key={item.application_id} application={item} onUpdate={updateApplicationStatus} />)}</section>}
        </main>
      )
    }

    if (page === 'admin') {
      const statusRows = [
        { label: 'Live', value: adminJobs.length, color: '#41a876' },
        { label: 'In review', value: adminReviews.length, color: '#e4ae35' },
        { label: 'Awaiting payment', value: adminPayments.length + adminPremiumRequests.length, color: '#df7057' },
      ]
      const statusTotal = statusRows.reduce((total, item) => total + item.value, 0)
      let statusOffset = 0
      const statusGradient = statusTotal
        ? `conic-gradient(${statusRows.map((item) => {
            const start = statusOffset
            statusOffset += item.value / statusTotal * 100
            return `${item.color} ${start.toFixed(2)}% ${statusOffset.toFixed(2)}%`
          }).join(', ')})`
        : 'conic-gradient(#e9edf3 0% 100%)'
      const categoryCounts = Object.entries(adminJobs.reduce<Record<string, number>>((counts, job) => {
        const category = job.category || 'Other'
        counts[category] = (counts[category] || 0) + 1
        return counts
      }, {})).sort((left, right) => right[1] - left[1]).slice(0, 5)
      const maxCategoryCount = Math.max(...categoryCounts.map(([, count]) => count), 1)
      const matchingJobs = adminJobs.filter((job) => {
        const search = adminSearch.trim().toLocaleLowerCase()
        return !search || `${job.job_title} ${job.agency_name} ${job.city} ${job.country}`.toLocaleLowerCase().includes(search)
      }).slice(0, 7)
      const applicationsByJob = new Map<string, number>()
      for (const application of adminApplications) {
        applicationsByJob.set(application.job_id, (applicationsByJob.get(application.job_id) || 0) + 1)
      }
      const adminNav = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return (
        <main className="admin-shell">
          <aside className="admin-sidebar">
            <button className="admin-brand" type="button" onClick={() => navigate('home')}><span className="admin-brand-mark">GB</span><span><strong>GulfBridge</strong><small>ADMIN CONSOLE</small></span></button>
            <p className="admin-nav-label">Workspace</p>
            <nav className="admin-nav" aria-label="Admin workspace">
              <button className="selected" type="button" onClick={() => adminNav('admin-dashboard')}><LayoutDashboard size={17} /> Dashboard</button>
              <button type="button" onClick={() => adminNav('admin-jobs')}><BriefcaseBusiness size={17} /> Job Management</button>
              <button type="button" onClick={() => adminNav('admin-applications')}><FileCheck2 size={17} /> Applications</button>
              <button type="button" onClick={() => adminNav('admin-users')}><UserRound size={17} /> User Management</button>
            </nav>
            <p className="admin-nav-label">Platform</p>
            <nav className="admin-nav" aria-label="Platform management">
              <button type="button" onClick={() => adminNav('admin-categories')}><BriefcaseBusiness size={17} /> Categories</button>
              <button type="button" onClick={() => adminNav('admin-news')}><Globe2 size={17} /> Overseas News</button>
              <button type="button" onClick={() => adminNav('admin-reports')}><ShieldCheck size={17} /> Safety Reports</button>
            </nav>
            <div className="admin-sidebar-account"><span className="admin-account-avatar">{getInitials(account?.name || 'Admin')}</span><span><strong>{account?.name || 'Admin'}</strong><small>Administrator</small></span><button type="button" onClick={() => void handleSignOut()} aria-label="Sign out"><LogOut size={16} /></button></div>
          </aside>
          <div className="admin-main">
            <header className="admin-topbar">
              <div><p className="admin-breadcrumb">Dashboard <span>/</span> Job Management</p><h1>Job Management</h1></div>
              <div className="admin-topbar-actions">
                <label className="admin-search"><Search size={16} /><input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} placeholder="Search jobs..." /></label>
                <div className="admin-topbar-user"><span>{getInitials(account?.name || 'Admin')}</span><div><strong>{account?.name || 'Admin'}</strong><small>Administrator</small></div></div>
                <button className="admin-topbar-logout" type="button" onClick={() => void handleSignOut()} aria-label="Sign out" title="Sign out"><LogOut size={17} /></button>
              </div>
            </header>
            <div className="admin-content">
              <section className="admin-overview" id="admin-dashboard">
                <div className="admin-overview-heading"><div><span className="admin-eyebrow">OVERVIEW</span><h2>Good to see you, {account?.name.split(' ')[0] || 'Admin'}</h2><p>Here’s what’s happening across your job platform.</p></div><span className="admin-live-indicator"><i /> Live data</span></div>
                <div className="admin-stats">
                  <article className="admin-stat-card"><span className="admin-stat-icon blue"><BriefcaseBusiness size={18} /></span><span className="admin-stat-copy"><small>Active jobs</small><strong>{adminJobs.length.toLocaleString()}</strong><em>Published and visible</em></span></article>
                  <article className="admin-stat-card"><span className="admin-stat-icon green"><ClipboardList size={18} /></span><span className="admin-stat-copy"><small>In review</small><strong>{adminReviews.length.toLocaleString()}</strong><em>Awaiting approval</em></span></article>
                  <article className="admin-stat-card"><span className="admin-stat-icon orange"><WalletCards size={18} /></span><span className="admin-stat-copy"><small>Pending payments</small><strong>{(adminPayments.length + adminPremiumRequests.length).toLocaleString()}</strong><em>Need confirmation</em></span></article>
                  <article className="admin-stat-card"><span className="admin-stat-icon purple"><UserRound size={18} /></span><span className="admin-stat-copy"><small>Registered users</small><strong>{adminUsersLoading ? '…' : adminProfiles.length.toLocaleString()}</strong><em>Platform accounts</em></span></article>
                </div>
                <div className="admin-charts" id="admin-analytics">
                  <section className="admin-chart-card">
                    <div className="admin-chart-heading"><div><h3>Job Status Distribution</h3><p>Current listing pipeline</p></div><BarChart3 size={18} /></div>
                    <div className="admin-donut-layout">
                      <div className="admin-donut" style={{ background: statusGradient }} role="img" aria-label={`Job status distribution: ${statusRows.map((item) => `${item.label} ${item.value}`).join(', ')}`}><span><strong>{statusTotal.toLocaleString()}</strong><small>Listings</small></span></div>
                      <ul className="admin-chart-legend">{statusRows.map((item) => <li key={item.label}><i style={{ background: item.color }} /><span>{item.label}</span><strong>{item.value.toLocaleString()}</strong></li>)}</ul>
                    </div>
                  </section>
                  <section className="admin-chart-card">
                    <div className="admin-chart-heading"><div><h3>Jobs by Industry</h3><p>Active listings by category</p></div><BarChart3 size={18} /></div>
                    {categoryCounts.length ? <div className="admin-bar-chart" role="img" aria-label={`Top job categories: ${categoryCounts.map(([name, count]) => `${name} ${count}`).join(', ')}`}>{categoryCounts.map(([name, count]) => <div className="admin-bar-column" key={name}><span className="admin-bar-value">{count}</span><div className="admin-bar-track"><i style={{ height: `${Math.max(12, count / maxCategoryCount * 100)}%` }} /></div><small title={name}>{name}</small></div>)}</div> : <div className="admin-chart-empty">Category data will appear when jobs are published.</div>}
                  </section>
                </div>
                <section className="admin-jobs-preview" aria-labelledby="admin-recent-jobs-heading">
                  <div className="admin-table-heading"><div><span className="admin-eyebrow">LATEST ACTIVITY</span><h3 id="admin-recent-jobs-heading">Recent Jobs</h3></div><button type="button" onClick={() => adminNav('admin-jobs')}>View all <ArrowRight size={14} /></button></div>
                  {matchingJobs.length ? <div className="admin-table-scroll"><table className="admin-jobs-table"><thead><tr><th>Job title</th><th>Company</th><th>Location</th><th>Salary</th><th>Status</th><th>Applications</th><th>Action</th></tr></thead><tbody>{matchingJobs.map((job) => <tr key={job.id}><td><strong>{job.job_title}</strong><small>{job.published_at ? job.published_at.slice(0, 10) : 'Recently published'}</small></td><td>{job.agency_name}</td><td>{job.city}, {job.country}</td><td>{formatMoney(Number(job.salary_min), job.salary_currency)} – {formatMoney(Number(job.salary_max), job.salary_currency)}</td><td><span className="admin-job-status">Live</span></td><td>{applicationsByJob.get(job.id) || 0}</td><td><button className="admin-manage-button" type="button" onClick={() => adminNav('admin-jobs')}>Manage</button></td></tr>)}</tbody></table></div> : <div className="admin-chart-empty">{adminSearch ? 'No jobs match your search.' : 'No published jobs are available yet.'}</div>}
                </section>
              </section>
              <div className="admin-operations">
                <section className="panel admin-queue" id="admin-review-queue"><div className="panel-heading"><div><span className="eyebrow">Review queue</span><h2>Agency and job submissions</h2></div><span className="status-pill status-pending">Admin approval required</span></div>{adminReviews.length ? adminReviews.map((submission) => <AdminReviewCard key={submission.id} submission={submission} onDocument={downloadAgencyDocument} onReview={reviewSubmission} />) : <EmptyState title="Review queue is clear" description={isSupabaseConfigured ? 'New submissions will appear here after employers submit their official details and job offer.' : 'Connect Supabase and sign in with an admin role to review real submissions.'} action="Back to jobs" onAction={() => navigate('jobs')} />}</section>
                <section className="panel admin-queue"><div className="panel-heading"><div><span className="eyebrow">Payment confirmation</span><h2>Listing payment references</h2></div></div>{adminPayments.length ? adminPayments.map((payment) => <AdminPaymentCard key={payment.id} payment={payment} onConfirm={confirmListingPayment} />) : <p className="queue-empty-note">No standard listing payments await confirmation.</p>}</section>
                <section className="panel admin-queue"><div className="panel-heading"><div><span className="eyebrow">Premium companies</span><h2>Premium plan payment references</h2></div></div>{adminPremiumRequests.length ? adminPremiumRequests.map((request) => <AdminPremiumCard key={request.id} request={request} onConfirm={confirmPremiumSubscription} />) : <p className="queue-empty-note">No premium plan payments await confirmation.</p>}</section>
                <section className="panel admin-queue" id="admin-applications"><div className="panel-heading"><div><span className="eyebrow">Application oversight</span><h2>Admin can review or correct progress</h2></div></div>{adminApplications.length ? adminApplications.map((application) => <AdminApplicationCard key={application.application_id} application={application} onUpdate={updateApplicationStatus} />) : <p className="queue-empty-note">No applications are available for admin oversight.</p>}</section>
                <section className="panel admin-queue" id="admin-jobs">
                  <div className="panel-heading"><div><span className="eyebrow">Live job listings</span><h2>Manage published opportunities</h2></div><div className="panel-heading-actions"><span className="status-pill">{adminJobs.length} shown</span><button className="button button-gold" type="button" onClick={() => void handleRoleSwitch('recruiter')}>Post a job</button></div></div>
                  {adminJobs.length ? adminJobs.map((job) => <AdminJobCard key={job.id} job={job} onSave={updateAdminJob} onArchive={archiveAdminJob} />) : <p className="queue-empty-note">No published jobs are available to manage.</p>}
                </section>
                <section className="panel admin-queue" id="admin-users">
                  <div className="panel-heading"><div><span className="eyebrow">Registered accounts</span><h2>Recent users and access roles</h2></div><span className="status-pill">{adminUsersLoading ? 'Loading…' : `${adminProfiles.length} shown`}</span></div>
                  {adminUsersError ? <div className="admin-inline-error" role="alert"><strong>Registered users could not be loaded</strong><p>{adminUsersError}</p><small>Check that the admin-users Edge Function is deployed and its ALLOWED_ORIGINS secret matches your website origin exactly.</small></div> : adminUsersLoading ? <p className="queue-empty-note">Loading registered accounts…</p> : adminProfiles.length ? <div className="admin-user-list">{adminProfiles.map((profile) => <article className="admin-user-row" key={profile.id}><span className="company-avatar">{getInitials(profile.full_name || 'GB')}</span><span><strong>{profile.full_name || 'GulfBridge member'}</strong><small>{profile.email} · {profile.phone || 'No phone'} · {profile.location || 'Location not set'}</small></span><span className="user-role-list">{profile.roles.join(', ') || 'seeker'}</span>{profile.roles.includes('admin') ? <span className="status-pill">Admin protected</span> : <button className="button button-outline" type="button" onClick={() => void setAdminUserDisabled(profile)}>{profile.disabled ? 'Restore access' : 'Suspend access'}</button>}</article>)}</div> : <p className="queue-empty-note">No registered users were found.</p>}
                  <p className="fine-print">Admin accounts are protected from suspension here. Roles and passwords are never set from this dashboard.</p>
                </section>
                <section className="panel admin-queue" id="admin-categories">
            <div className="panel-heading"><div><span className="eyebrow">Job categories</span><h2>Manage categories</h2></div></div>
            <form className="admin-inline-form" onSubmit={createAdminCategory}><label className="form-label">New category<input name="name" maxLength={80} required placeholder="e.g. Agriculture" /></label><button className="button button-gold" type="submit">Add category</button></form>
            <div className="admin-category-list">{adminCategories.map((category) => <div className="admin-category-row" key={category.name}><span>{category.name}</span><button className="button button-outline" type="button" onClick={() => void toggleAdminCategory(category)}>{category.is_active ? 'Active' : 'Hidden'}</button></div>)}</div>
                </section>
                <section className="panel admin-queue" id="admin-news">
            <div className="panel-heading"><div><span className="eyebrow">Overseas employment news</span><h2>Publish trusted career updates</h2></div></div>
            <form className="stack-form admin-news-form" onSubmit={createOverseasNews}>
              <label className="form-label">Headline<input name="title" minLength={5} maxLength={180} required /></label>
              <label className="form-label">Summary<textarea name="summary" minLength={10} maxLength={1200} rows={3} required /></label>
              <div className="form-grid"><label className="form-label">Country<select name="country" defaultValue=""><option value="">All destinations</option>{countryHighlights.map(({ country }) => <option key={country}>{country}</option>)}</select></label><label className="form-label">Source URL<input name="sourceUrl" type="url" placeholder="https://…" /></label></div>
              <label className="consent-check"><input name="publish" type="checkbox" /><span>Publish immediately</span></label>
              <button className="button button-gold" type="submit">Save news item</button>
            </form>
            {adminNews.map((news) => <article className="submission-card" key={news.id}><div className="submission-card-heading"><div><h3>{news.title}</h3><p>{news.country || 'All destinations'} · {news.is_published ? 'Published' : 'Draft'}</p></div></div><p>{news.summary}</p><div className="review-actions"><button className="button button-outline" type="button" onClick={() => void toggleNewsVisibility(news)}>{news.is_published ? 'Unpublish' : 'Publish'}</button><button className="button button-danger" type="button" onClick={() => void deleteOverseasNews(news.id)}>Delete</button></div></article>)}
                </section>
                <section className="panel admin-queue" id="admin-reports">
            <div className="panel-heading"><div><span className="eyebrow">Community safety</span><h2>Reported scams</h2></div><span className="status-pill">{adminScamReports.length} reports</span></div>
            {adminScamReports.length ? adminScamReports.map((report) => <article className="submission-card" key={report.id}><div className="submission-card-heading"><div><h3>{report.employer_name || 'Reported listing or contact'}</h3><p>Submitted {new Date(report.created_at).toLocaleDateString()} · {report.job_id ? `Job ${report.job_id.slice(0, 8)}` : 'No job reference'}</p></div><span className="status-pill">{report.status}</span></div><p>{report.details}</p><label className="form-label">Review status<select value={report.status} onChange={(event) => void updateScamReport(report, event.target.value)}>{['open', 'investigating', 'resolved', 'dismissed'].map((status) => <option key={status}>{status}</option>)}</select></label></article>) : <p className="queue-empty-note">No scam reports have been submitted.</p>}
                </section>
              </div>
            </div>
          </div>
        </main>
      )
    }

    return (
      <>
        <main>
          <section className="hero-section">
            <div className="hero-grid-pattern" />
            <div className="hero-content">
              <span className="eyebrow hero-eyebrow"><span className="eyebrow-dot" /> {t('heroEyebrow')}</span>
              <h1>{t('heroTitleA')}<br /><span>{t('heroTitleB')}</span></h1>
              <p>{t('heroDescription')}</p>
              <form className="search-bar" onSubmit={handleSearch}>
                <Search size={20} />
                <label className="sr-only" htmlFor="main-job-search">{t('searchPlaceholder')}</label>
                <input id="main-job-search" value={jobSearch} onChange={(event) => setJobSearch(event.target.value)} placeholder={t('searchPlaceholder')} />
                <button className="button button-gold" type="submit">{t('search')} <ArrowRight size={16} /></button>
              </form>
              <form className="ai-box" onSubmit={handleAIMatch}>
                <div className="ai-label"><span className="ai-spark"><Sparkles size={17} /></span><span>{t('aiPrompt')} <small>Keyword matching</small></span></div>
                <div className="ai-input-row"><label className="sr-only" htmlFor="ai-job-prompt">{t('aiPlaceholder')}</label><input id="ai-job-prompt" value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder={t('aiPlaceholder')} /><button type="submit" className="button button-glass"><Sparkles size={16} /> {t('match')}</button></div>
                <p className="ai-disclaimer">Matches your search with listing details. Your identity documents are never sent.</p>
              </form>
              <div className="destination-chips" aria-label="Popular destinations">
                {destinations.slice(1).map((destination) => <button key={destination} className={`destination-chip ${destinationFilter === destination ? 'selected' : ''}`} onClick={() => { setDestinationFilter(destination); navigate('jobs') }} type="button"><span className="country-monogram">{countries[destination]}</span>{destination}</button>)}
              </div>
              <div className="hero-proof"><span><ShieldCheck size={16} /> Admin-reviewed listings</span><span><LockKeyhole size={15} /> Private applications</span><span><Globe2 size={15} /> English & Arabic</span></div>
            </div>
            <div className="hero-decoration hero-decoration-one" /><div className="hero-decoration hero-decoration-two" />
          </section>

          <section className="home-section country-section">
            <div className="country-feature-banner">
              <div><span className="eyebrow"><Globe2 size={14} /> Explore destinations</span><h2>Jobs by country</h2><p>Find opportunities in your preferred destination.</p></div>
              <Plane className="country-feature-plane" size={54} strokeWidth={1.4} aria-hidden="true" />
            </div>
            <div className="country-card-grid">
              {countryHighlights.map(({ country, city, flag, code }) => (
                <button className="country-card panel" key={country} type="button" onClick={() => { setDestinationFilter(country); navigate('jobs') }}>
                  <span className="country-flag" aria-hidden="true">{flag}</span>
                  <strong>{code}</strong>
                  <small>{city}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="home-section jobs-section" id="featured-jobs">
            <div className="section-heading">
              <div><span className="eyebrow">Thoughtfully reviewed</span><h2>{t('jobsHeading')}</h2><p>{t('jobsSubheading')}</p></div>
              <button className="text-button" onClick={() => navigate('jobs')} type="button">{t('seeAll')} <ArrowRight size={16} /></button>
            </div>
            <div className="featured-layout">
              {jobs.length
                ? <div className="job-grid">{jobs.slice(0, 3).map((job, index) => <JobCard key={job.id} job={job} index={index} isSaved={savedIds.includes(job.id)} onOpen={setActiveJob} onSave={toggleSave} t={t} toKes={toKes} isExample={isExampleListing} />)}</div>
                : <div className="panel featured-empty-state"><span className="feature-icon"><BriefcaseBusiness size={20} /></span><h3>No new opportunities just yet</h3><p>New listings appear here after review. Check back soon or get in touch with our team.</p><button className="button button-outline" onClick={() => navigate('help')} type="button">Help & safety <ArrowRight size={15} /></button></div>}
              <aside className="trust-card">
                <div className="trust-icon"><ShieldCheck size={26} /></div>
                <span className="eyebrow">The GulfBridge standard</span>
                <h3>{t('trustTitle')}</h3>
                <p>{t('trustDescription')}</p>
                <button className="button button-outline" onClick={() => navigate('help')} type="button">How verification works <ArrowUpRight size={15} /></button>
              </aside>
            </div>
            <p className="salary-note"><CircleHelp size={15} /> {t('salaryNote')} {rateDate ? `Rate data updated ${new Date(rateDate).toLocaleDateString()}.` : 'KSh estimates appear when a public rate is available.'}</p>
          </section>

          <section className="home-section how-section">
            <div className="section-heading"><div><span className="eyebrow">Made for your journey</span><h2>{t('stepTitle')}</h2><p>{t('stepDescription')}</p></div><button className="button button-outline" type="button" onClick={() => navigate('applications')}>View tracker <ArrowRight size={16} /></button></div>
            <div className="journey-steps">{['Applied', 'Interview', 'Offer', 'Visa', 'Flight'].map((step, index) => <div className="journey-step" key={step}><span className={`journey-number ${index === 0 ? 'current' : ''}`}>{index === 0 ? <Check size={15} /> : `0${index + 1}`}</span><div><strong>{step}</strong><small>{index === 0 ? 'Start your application' : 'Updates from your employer'}</small></div></div>)}</div>
          </section>

          <section className="home-section career-guides-section">
            <div className="section-heading"><div><span className="eyebrow">Plan your next step</span><h2>Career guides</h2><p>Helpful advice for applying and building a life abroad.</p></div><button className="text-button" type="button" onClick={() => navigate('guides')}>Explore guides <ArrowRight size={16} /></button></div>
            <div className="career-guide-teasers">
              {careerGuides.slice(0, 3).map(({ icon: Icon, title }) => <button className="panel career-guide-teaser" key={title} type="button" onClick={() => navigate('guides')}><span className="guide-icon"><Icon size={18} /></span><strong>{title}</strong><ArrowRight size={15} /></button>)}
            </div>
          </section>

          <section className="home-section employer-cta">
            <div><span className="eyebrow">For licensed recruiters and employers</span><h2>Bring your opportunity to GulfBridge.</h2><p>Submit your organization details and job offer for review. Every job is approved before publication.</p></div>
            <button className="button button-gold" onClick={openPostJob} type="button">{t('postJob')} <ArrowRight size={16} /></button>
          </section>
        </main>
      </>
    )
  }

  return (
    <div className={`app-root ${isArabic ? 'is-rtl' : ''} ${page === 'admin' ? 'admin-app' : ''}`}>
      <header className="site-header">
        <a className="brand" href="#admin" onClick={(event) => { event.preventDefault(); openAdminAccess() }} aria-label="GulfBridge admin sign-in" title="Admin sign-in">
          <span className="brand-mark"><span /></span><span className="brand-word">GULF<span>BRIDGE</span><small>KENYA · GLOBAL OPPORTUNITIES</small></span>
        </a>
        <div className="header-actions">
          <button className="language-toggle" onClick={() => setLanguage(isArabic ? 'en' : 'ar')} type="button" aria-label="Switch language"><Languages size={15} /><span>{t('language')}</span></button>
          <button className="theme-toggle" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} type="button" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button>
          {installPrompt && <button className="button button-outline install-button" onClick={() => void installApp()} type="button"><ArrowDownToLine size={15} /><span>Install app</span></button>}
          {account ? <div className="account-menu"><button className="avatar-button" onClick={() => navigate('profile')} type="button" aria-label="Open profile">{getInitials(account.name)}</button><button className="user-name-button" onClick={() => navigate('profile')} type="button">{account.name.split(' ')[0]}<ChevronDown size={14} /></button><div className="account-dropdown"><button type="button" onClick={() => navigate('profile')}>{t('profile')}</button><button type="button" onClick={() => navigate('saved')}>{t('savedJobs')}</button><button type="button" onClick={() => navigate('applications')}>{t('applications')}</button><button type="button" onClick={() => navigate('alerts')}>Job alerts</button><button type="button" onClick={() => handleRoleSwitch(account.role === 'seeker' ? 'recruiter' : 'seeker')}>{account.role === 'seeker' ? t('employerArea') : 'Job seeker view'}</button>{account.roles.includes('admin') && <button type="button" onClick={() => navigate('admin')}>{t('adminArea')}</button>}<button type="button" onClick={() => void handleSignOut()}>{t('logout')}</button></div></div> : <button className="button button-outline sign-in-button" onClick={() => { setAuthError(''); setAuthNotice(''); setAuthOpen(true) }} type="button"><UserRound size={15} /> {t('signIn')}</button>}
          <button className="button button-gold header-post" onClick={openPostJob} type="button">{t('postJob')}</button>
          <button className="mobile-menu-button" onClick={() => setMenuOpen((open) => !open)} type="button" aria-expanded={menuOpen} aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}>{menuOpen ? <X size={21} /> : <MenuIcon size={21} />}</button>
        </div>
      </header>

      {menuOpen && <button className="side-menu-backdrop" type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}
      <nav className={`side-menu ${menuOpen ? 'open' : ''}`} aria-label="Main navigation" aria-hidden={!menuOpen} inert={!menuOpen}>
        <div className="side-menu-heading"><span>Explore GulfBridge</span><button type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)}><X size={18} /></button></div>
        <button type="button" onClick={() => navigate('home')}><Globe2 size={17} /> Home</button>
        <button type="button" onClick={() => navigate('jobs')}><Search size={17} /> Find jobs</button>
        <button type="button" onClick={() => navigate('map')}><MapPin size={17} /> Explore map</button>
        <button type="button" onClick={() => navigate('guides')}><BookOpen size={17} /> Career guides</button>
        <button type="button" onClick={() => navigate('alerts')}><BellRing size={17} /> Job alerts</button>
        <button type="button" onClick={() => navigate('help')}><ShieldCheck size={17} /> Help & safety</button>
        <button type="button" onClick={openPostJob}><BriefcaseBusiness size={17} /> For employers</button>
        {account && <button type="button" onClick={() => navigate('applications')}><FileCheck2 size={17} /> Applications</button>}
        {account?.roles.includes('admin') && <button type="button" onClick={() => navigate('admin')}><LockKeyhole size={17} /> Admin workspace</button>}
        <span className="side-menu-label">Popular destinations</span>
        {countryHighlights.slice(0, 6).map(({ country, flag }) => <button className="side-menu-country" key={country} type="button" onClick={() => { setDestinationFilter(country); navigate('jobs') }}><span>{flag}</span>{country}</button>)}
        <div className="side-menu-bottom"><button type="button" onClick={() => account ? navigate('profile') : setAuthOpen(true)}><UserRound size={17} /> {account ? 'My profile' : 'Sign in'}</button></div>
      </nav>

      {renderPage()}

      <footer className="site-footer">
        <div className="footer-main">
          <a className="brand footer-brand" href="#" onClick={(event) => { event.preventDefault(); navigate('home') }}><span className="brand-mark"><span /></span><span className="brand-word">GULF<span>BRIDGE</span><small>KENYA · GLOBAL OPPORTUNITIES</small></span></a>
          <p>Clearer routes to work abroad. Built for Kenyan job seekers and responsible employers.</p>
          <div className="footer-links"><button onClick={() => navigate('jobs')} type="button">Find jobs</button><button onClick={() => navigate('map')} type="button">Explore map</button><button onClick={openPostJob} type="button">For employers</button><button onClick={() => navigate('help')} type="button">{t('navHelp')}</button></div>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} GulfBridge</span><span>Verify every offer and contract independently</span><span className="footer-secure"><ShieldCheck size={14} /> Privacy-first by design</span></div>
      </footer>

      <div className="mobile-bottom-nav">
        <button className={page === 'home' ? 'active' : ''} onClick={() => navigate('home')} type="button"><Globe2 size={19} /><span>{isArabic ? 'الرئيسية' : 'Home'}</span></button>
        <button className={page === 'jobs' ? 'active' : ''} onClick={() => navigate('jobs')} type="button"><Search size={19} /><span>{isArabic ? 'بحث' : 'Search'}</span></button>
        <button className={page === 'saved' ? 'active' : ''} onClick={() => navigate('saved')} type="button"><Heart size={19} /><span>{isArabic ? 'المحفوظة' : 'Saved'}</span></button>
        <button className={page === 'applications' ? 'active' : ''} onClick={() => navigate('applications')} type="button"><FileCheck2 size={19} /><span>{isArabic ? 'الطلبات' : 'Tracker'}</span></button>
        <button className={page === 'profile' ? 'active' : ''} onClick={() => navigate('profile')} type="button"><UserRound size={19} /><span>{isArabic ? 'الملف' : 'Profile'}</span></button>
      </div>

      {activeJob && <JobModal job={activeJob} onClose={() => setActiveJob(null)} onApply={startApply} onSave={toggleSave} isSaved={savedIds.includes(activeJob.id)} t={t} toKes={toKes} />}
      {applyJob && <ApplyModal job={applyJob} onClose={() => setApplyJob(null)} onSubmit={submitApplication} isSubmitting={isSubmitting} />}
      {authOpen && <AuthModal adminMode={adminLoginMode} onClose={() => { setAuthOpen(false); setAdminLoginMode(false) }} onSubmit={handleAuth} error={authError} notice={authNotice} configurationMessage={configurationMessage} />}
      {profileEditing && profileDraft && <ProfileModal profile={profileDraft} onChange={setProfileDraft} onClose={() => setProfileEditing(false)} onSubmit={saveProfile} t={t} />}
      {deleteConfirmOpen && <DeleteAccountModal onClose={() => setDeleteConfirmOpen(false)} onConfirm={() => void handleDeleteAccount()} isSubmitting={isSubmitting} />}
      {notice && <div className="toast" role="status"><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice('')} type="button"><X size={15} /></button></div>}
    </div>
  )
}

type JobCardProps = {
  job: Job
  index: number
  isSaved: boolean
  isExample: boolean
  onOpen: (job: Job) => void
  onSave: (job: Job) => void
  t: (key: TranslationKey) => string
  toKes: (amount: number, currency: string) => number | null
}

function JobCard({ job, index, isSaved, isExample, onOpen, onSave, t, toKes }: JobCardProps) {
  return (
    <article className={`job-card job-card-${index % 3}`}>
      <div className="job-card-top">
        <div className="company-avatar">{getInitials(job.company)}</div>
        <div className="job-company"><strong>{job.company}</strong><span><MapPin size={12} />{job.city}, {job.country}</span></div>
        <button className={`icon-button save-button ${isSaved ? 'is-saved' : ''}`} aria-label={isSaved ? 'Remove saved job' : t('save')} onClick={() => onSave(job)} type="button"><Heart size={17} fill={isSaved ? 'currentColor' : 'none'} /></button>
      </div>
      <button className="job-card-title" onClick={() => onOpen(job)} type="button"><h3>{job.title}</h3><ArrowUpRight size={16} /></button>
      <div className="job-tags"><span>{job.category}</span><span>{job.employmentType}</span></div>
      <p className="job-salary">{currencyRange(job, toKes)}</p>
      <div className="job-card-bottom">
        <div className="job-badges">{job.verified ? <span className="badge-verified"><BadgeCheck size={13} /> {t('verified')}</span> : <span className="badge-neutral">Not yet platform-verified</span>}{job.premium && <span className="badge-premium"><Sparkles size={12} /> Premium</span>}</div>
        <span className="posted-time">{job.posted}</span>
      </div>
      <button className="job-card-open" onClick={() => onOpen(job)} type="button">View details <ArrowRight size={14} /></button>
      {isExample && <span className="example-listing">{t('sample')}</span>}
    </article>
  )
}

function PageHeading({ eyebrow, title, description, action, onBack, backLabel }: { eyebrow: string; title: string; description: string; action?: ReactNode; onBack: () => void; backLabel: string }) {
  return <div className="page-heading"><button className="button button-outline page-back-button" onClick={onBack} type="button"><ArrowLeft size={15} />{backLabel}</button><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function FilterBar({ destinations: destinationOptions, categories, destination, category, verifiedOnly, onDestination, onCategory, onVerifiedOnly, onSearch, search }: {
  destinations: string[]; categories: string[]; destination: string; category: string; verifiedOnly: boolean;
  onDestination: (value: string) => void; onCategory: (value: string) => void; onVerifiedOnly: (value: boolean) => void; onSearch: (value: string) => void; search: string
}) {
  return (
    <div className="filter-bar">
      <div className="filter-search"><Search size={17} /><label className="sr-only" htmlFor="listing-search">Search opportunities</label><input id="listing-search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search role, company, destination..." /></div>
      <label className="select-wrap"><span className="sr-only">Destination</span><select value={destination} onChange={(event) => onDestination(event.target.value)}>{destinationOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select><ChevronDown size={15} /></label>
      <label className="select-wrap"><span className="sr-only">Job category</span><select value={category} onChange={(event) => onCategory(event.target.value)}>{categories.map((option) => <option key={option} value={option}>{option}</option>)}</select><ChevronDown size={15} /></label>
      <button className={`filter-verified ${verifiedOnly ? 'selected' : ''}`} onClick={() => onVerifiedOnly(!verifiedOnly)} type="button"><ShieldCheck size={15} /> Verified only</button>
    </div>
  )
}

function JobModal({ job, onClose, onApply, onSave, isSaved, t, toKes }: { job: Job; onClose: () => void; onApply: (job: Job) => void; onSave: (job: Job) => void; isSaved: boolean; t: (key: TranslationKey) => string; toKes: (amount: number, currency: string) => number | null }) {
  return (
    <Modal onClose={onClose} className="job-detail-modal">
      <div className="job-modal-header"><div className="company-avatar company-avatar-large">{getInitials(job.company)}</div><button className="icon-button modal-close" type="button" aria-label="Close" onClick={onClose}><X size={20} /></button></div>
      <span className="eyebrow">{job.city}, {job.country} · {job.category}</span>
      <h2>{job.title}</h2><p className="job-modal-company">{job.company}</p>
      <div className="job-badges">{job.verified ? <span className="badge-verified"><BadgeCheck size={13} /> {t('verified')}</span> : <span className="badge-neutral">Verification not confirmed</span>}{job.premium && <span className="badge-premium"><Sparkles size={12} /> Premium employer</span>}</div>
      <div className="job-modal-salary"><WalletCards size={17} /><div><strong>{currencyRange(job, toKes)}</strong><small>{t('salaryNote')}</small></div></div>
      <p className="job-description">{job.description}</p>
      <section><h3>Requirements</h3><ul className="check-list">{job.requirements.map((requirement) => <li key={requirement}><Check size={15} />{requirement}</li>)}</ul></section>
      <section><h3>Benefits listed by employer</h3><ul className="check-list">{job.benefits.map((benefit) => <li key={benefit}><Check size={15} />{benefit}</li>)}</ul></section>
      <div className="privacy-callout"><LockKeyhole size={17} /><span>Your CV and ID/passport stay private and are shared only for this application with authorized parties.</span></div>
      <div className="modal-actions"><button className="button button-gold" onClick={() => onApply(job)} type="button">{t('apply')} <ArrowRight size={16} /></button><button className="button button-outline" onClick={() => onSave(job)} type="button"><Heart size={16} fill={isSaved ? 'currentColor' : 'none'} />{isSaved ? t('saved') : t('save')}</button>{job.premium && job.whatsapp && <a className="button button-whatsapp" href={`https://wa.me/${job.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle size={16} />Contact company on WhatsApp</a>}</div>
      <p className="fine-print">WhatsApp opens a direct conversation with the premium employer. Do not send sensitive identity documents over WhatsApp. GulfBridge applications remain on-platform.</p>
    </Modal>
  )
}

function ApplyModal({ job, onClose, onSubmit, isSubmitting }: { job: Job; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; isSubmitting: boolean }) {
  return (
    <Modal onClose={onClose} className="form-modal">
      <span className="eyebrow">Secure application</span><h2>Apply for {job.title}</h2><p className="modal-description">{job.company} · {job.city}, {job.country}</p>
      <div className="privacy-callout"><LockKeyhole size={17} /><span>Upload your CV and either a Kenyan national ID or passport image. Files are private and attached only to this application.</span></div>
      <form className="stack-form" onSubmit={onSubmit}>
        <label className="file-field"><span><FileText size={17} /> CV <small>PDF, DOC, or DOCX · max 10 MB</small></span><input name="cv" type="file" accept=".pdf,.doc,.docx,application/pdf" required /></label>
        <label className="form-label">Identity document
          <select name="identityKind" required defaultValue="passport"><option value="passport">Passport</option><option value="national_id">Kenyan national ID</option></select>
        </label>
        <label className="file-field"><span><LockKeyhole size={17} /> Identity image <small>JPG, PNG, or PDF · max 10 MB</small></span><input name="identity" type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" required /></label>
        <label className="consent-check"><input type="checkbox" required /><span>I consent to sharing these documents with this job’s employer and authorized GulfBridge admins for recruitment review. <a href="#privacy" onClick={(event) => event.preventDefault()}>Privacy notice</a></span></label>
        <div className="modal-actions"><button className="button button-gold" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting securely…' : 'Submit application'} <ArrowRight size={16} /></button><button className="button button-outline" onClick={onClose} type="button">Cancel</button></div>
        <p className="fine-print">Never pay a recruiter through an unverified personal account. Confirm visa and contract requirements with official sources.</p>
      </form>
    </Modal>
  )
}

function AuthModal({ onClose, onSubmit, error, notice, configurationMessage: configMessage, adminMode = false }: { onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; error: string; notice: string; configurationMessage: string; adminMode?: boolean }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  return (
    <Modal onClose={onClose} className="form-modal auth-modal">
      <span className="eyebrow">{adminMode ? 'Restricted workspace' : 'Your GulfBridge account'}</span><h2>{adminMode ? 'Admin sign in' : mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2><p className="modal-description">{adminMode ? 'Sign in with the existing authorized admin account. Admin account registration is disabled on this website.' : 'One account can include both job seeker and recruiter roles.'}</p>
      {!adminMode && <div className="auth-tabs"><button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>Sign in</button><button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Create account</button></div>}
      <form className="stack-form" onSubmit={onSubmit}>
        <input type="hidden" name="mode" value={adminMode ? 'signin' : mode} />
        {!adminMode && mode === 'signup' && <><label className="form-label">Full name<input name="fullName" autoComplete="name" required /></label><label className="form-label">Phone number<input name="phone" type="tel" autoComplete="tel" placeholder="+254 7XX XXX XXX" required /><small>Required during registration for account security and contact.</small></label></>}
        <label className="form-label">Email address<input name="email" type="email" autoComplete="email" required /></label>
        <label className="form-label">Password<input name="password" type="password" autoComplete={!adminMode && mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} required /><small>Use at least 8 characters.</small></label>
        {(error || notice) && <p className={error ? 'form-error' : 'form-success'} role="status">{error || notice}</p>}
        <button className="button button-gold button-full" type="submit">{adminMode ? 'Sign in to admin workspace' : mode === 'signin' ? 'Sign in securely' : 'Create account'} <ArrowRight size={16} /></button>
      </form>
      <div className="privacy-callout"><ShieldCheck size={17} /><span>{adminMode ? 'Your CV and identity documents are never collected during admin sign-in.' : 'Your CV and identity documents are not collected during registration.'}</span></div>
      {!isSupabaseConfigured && <p className="setup-warning">{configMessage} Sign-in here is demo-only.</p>}
    </Modal>
  )
}

function ProfileModal({ profile, onChange, onClose, onSubmit, t }: { profile: Account; onChange: (value: Account) => void; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; t: (key: TranslationKey) => string }) {
  const update = (key: ProfileKey, value: string) => onChange({ ...profile, [key]: value })
  return (
    <Modal onClose={onClose} className="form-modal">
      <span className="eyebrow">Account settings</span><h2>{t('editProfile')}</h2><p className="modal-description">Your phone number is required. Sensitive documents are requested only when you apply.</p>
      <form className="stack-form" onSubmit={onSubmit}>
        <label className="form-label">{t('name')}<input value={profile.name} onChange={(event) => update('name', event.target.value)} required /></label>
        <label className="form-label">{t('email')}<input value={profile.email} disabled /><small>Change email through account security settings.</small></label>
        <label className="form-label">{t('phone')}<input type="tel" value={profile.phone} onChange={(event) => update('phone', event.target.value)} required /></label>
        <label className="form-label">{t('location')}<input value={profile.location} onChange={(event) => update('location', event.target.value)} /></label>
        <label className="form-label">{t('headline')}<input value={profile.headline} onChange={(event) => update('headline', event.target.value)} placeholder="e.g. Registered nurse · 4 years experience" /></label>
        <label className="form-label">{t('skills')}<textarea value={profile.skills} onChange={(event) => update('skills', event.target.value)} placeholder="Customer service, driving, safety..." rows={3} /></label>
        <div className="modal-actions"><button className="button button-gold" type="submit">{t('saveChanges')}</button><button className="button button-outline" type="button" onClick={onClose}>{t('cancel')}</button></div>
      </form>
    </Modal>
  )
}

function RecruiterForm({ onSubmit, isSubmitting }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; isSubmitting: boolean }) {
  return (
    <form className="panel recruiter-form" onSubmit={onSubmit}>
      <div className="form-section-heading"><span className="step-count">01</span><div><h2>Organization and authorized representative</h2><p>Private documents are visible only to authorized reviewers.</p></div></div>
      <div className="form-grid">
        <label className="form-label">Legal agency / company name<input name="agencyName" required /></label>
        <label className="form-label">Registration number<input name="registrationNumber" required /></label>
        <label className="form-label">Employer market<select name="employerMarket" required defaultValue="kenyan_agency"><option value="kenyan_agency">Kenyan recruitment agency · KSh billing</option><option value="gulf_employer">Gulf employer · SAR billing</option></select></label>
        <label className="form-label">Authorized representative<input name="representativeName" required /></label>
        <label className="form-label">Business email<input name="contactEmail" type="email" required /></label>
        <label className="form-label">Business phone<input name="contactPhone" type="tel" required /></label>
        <label className="form-label">Plan for this job<select name="listingPlan" required defaultValue="standard"><option value="standard">Single listing · 30 days</option><option value="premium">Premium company subscription · requires active plan</option></select></label>
        <label className="form-label">Company WhatsApp number <small>Optional; shown only on approved premium listings.</small><input name="whatsappContact" type="tel" placeholder="+971…" /></label>
      </div>
      <div className="document-upload-grid">
        <DocumentUpload name="businessDocument" title="Business registration" note="Upload official registration evidence" />
        <DocumentUpload name="recruitmentLicence" title="Applicable recruitment authorization" note="Upload current licensing evidence" />
        <DocumentUpload name="representativeId" title="Representative ID" note="Private verification document" />
      </div>
      <div className="form-section-heading second"><span className="step-count">02</span><div><h2>Job offer details</h2><p>Be clear about work, pay, visas, and any fees.</p></div></div>
      <div className="form-grid">
        <label className="form-label">Job title<input name="jobTitle" required /></label>
        <label className="form-label">Destination country<select name="country" required defaultValue=""><option value="" disabled>Select country</option>{destinations.slice(1).map((country) => <option key={country}>{country}</option>)}</select></label>
        <label className="form-label">City<input name="city" required /></label>
        <label className="form-label">Category<select name="category" required defaultValue=""><option value="" disabled>Select category</option>{categoryNames.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="form-label">Salary from<input name="salaryMin" type="number" min="0" required /></label>
        <label className="form-label">Salary to<input name="salaryMax" type="number" min="0" required /></label>
        <label className="form-label">Salary currency<select name="currency" required defaultValue="SAR">{['SAR', 'AED', 'QAR', 'KWD', 'OMR', 'BHD', 'CAD', 'USD'].map((currency) => <option key={currency}>{currency}</option>)}</select></label>
        <label className="form-label">Employment type<select name="employmentType" defaultValue="Full time"><option>Full time</option><option>Part time</option><option>Contract</option><option>Seasonal</option></select></label>
      </div>
      <label className="form-label full-field">Job description<textarea name="description" rows={5} minLength={30} required placeholder="Responsibilities, qualifications, work conditions, visa/sponsorship, benefits, and any worker-paid fees..." /></label>
      <div className="form-consent"><input type="checkbox" required /><span>I confirm these details are accurate and authorize GulfBridge admins to review this submission. This job will not be public until admin approval and payment confirmation.</span></div>
      <div className="recruiter-submit"><p><ShieldCheck size={16} /> Review → approval → payment → publication</p><button className="button button-gold" disabled={isSubmitting} type="submit">{isSubmitting ? 'Submitting…' : 'Submit for admin review'} <ArrowRight size={16} /></button></div>
    </form>
  )
}

function DocumentUpload({ name, title, note }: { name: string; title: string; note: string }) {
  return <label className="document-upload"><FileCheck2 size={19} /><strong>{title}</strong><span>{note}</span><input name={name} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required /><small>PDF, JPG, PNG · max 10 MB</small></label>
}

function PaymentDetailsForm({ amount, currency, onSubmit }: { amount: number; currency: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form className="payment-details-form" onSubmit={onSubmit}>
    <strong>Payment reference · {formatMoney(amount, currency)}</strong>
    <label className="form-label">Payment method<select name="method" defaultValue="bank_transfer"><option value="bank_transfer">Bank transfer · manual confirmation</option><option value="mpesa">M-Pesa · not connected yet</option><option value="card">Card · not connected yet</option></select></label>
    <label className="form-label">Bank transfer reference<input name="reference" required /></label>
    <button className="button button-gold" type="submit">Submit reference for confirmation</button>
  </form>
}

function PremiumRequestCard({ request, onSubmit }: { request: PremiumRequest; onSubmit: (event: FormEvent<HTMLFormElement>, request: PremiumRequest) => void }) {
  return <article className="submission-card"><div className="submission-card-heading"><div><h3>{request.employer_market === 'kenyan_agency' ? 'Kenyan agency' : 'Gulf employer'} premium plan</h3><p>{formatMoney(request.payment_amount, request.payment_currency)} · {request.status.replaceAll('_', ' ')}</p></div><span className="status-pill">{request.status.replaceAll('_', ' ')}</span></div>
    {request.status === 'awaiting_payment' && <PaymentDetailsForm amount={request.payment_amount} currency={request.payment_currency} onSubmit={(event) => onSubmit(event, request)} />}
    {request.status === 'pending_confirmation' && <p className="fine-print">Payment reference submitted. Premium access begins only after admin confirmation.</p>}
    {request.status === 'paid' && <p className="fine-print">Premium company plan is active.</p>}
  </article>
}

function RecruiterSubmissionCard({ submission, onPayment }: { submission: RecruiterSubmission; onPayment: (event: FormEvent<HTMLFormElement>, submission: RecruiterSubmission) => void }) {
  return <article className="submission-card"><div className="submission-card-heading"><div><h3>{submission.job_title}</h3><p>{submission.agency_name} · {submission.city}, {submission.country}</p></div><span className="status-pill">{submission.review_status.replaceAll('_', ' ')}</span></div>
    {submission.review_note && <p className="review-note">{submission.review_note}</p>}
    <p className="fine-print">Payment: {submission.payment_status.replaceAll('_', ' ')} · Listing: {submission.listing_plan}</p>
    {submission.review_status === 'approved' && submission.listing_plan === 'standard' && submission.payment_status === 'awaiting_payment' && <PaymentDetailsForm amount={submission.payment_amount} currency={submission.payment_currency} onSubmit={(event) => onPayment(event, submission)} />}
    {submission.payment_status === 'pending_confirmation' && <p className="fine-print">Payment reference submitted; the listing remains private until admin confirms it.</p>}
  </article>
}

function EmployerApplicationCard({ application, onUpdate }: { application: EmployerApplication; onUpdate: (applicationId: string, status: string) => void }) {
  return <article className="submission-card"><div className="submission-card-heading"><div><h3>{application.applicant_name} · {application.job_title}</h3><p>{application.applicant_headline || application.applicant_location} · Applied {new Date(application.applied_at).toLocaleDateString()}</p></div><span className="status-pill">{application.status}</span></div>
    <p className="application-skills">{application.applicant_skills?.join(' · ') || 'No skills listed'}</p>
    <label className="form-label">Update progress<select value={application.status} onChange={(event) => onUpdate(application.application_id, event.target.value)}>{applicationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
  </article>
}

function AdminReviewCard({ submission, onDocument, onReview }: { submission: AdminReview; onDocument: (submissionId: string, documentKind: string) => void; onReview: (submission: AdminReview, decision: 'approved' | 'rejected' | 'needs_changes', verified: boolean) => void }) {
  const [verified, setVerified] = useState(false)
  return <article className="submission-card"><div className="submission-card-heading"><div><h3>{submission.job_title}</h3><p>{submission.agency_name} · {submission.city}, {submission.country}</p></div><span className="status-pill">{submission.review_status.replaceAll('_', ' ')}</span></div>
    <p className="fine-print">Official documents available: {submission.document_count}/3 · {submission.listing_plan} plan</p>
    <div className="document-review-actions">{[['business_registration', 'Business registration'], ['recruitment_licence', 'Recruitment authorization'], ['representative_id', 'Representative ID']].map(([kind, label]) => <button className="button button-outline" key={kind} type="button" onClick={() => onDocument(submission.id, kind)}><ArrowDownToLine size={14} />{label}</button>)}</div>
    <label className="consent-check"><input type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} /><span>Documents and agency details reviewed; mark as platform-checked (not government endorsement).</span></label>
    <div className="review-actions"><button className="button button-gold" type="button" onClick={() => onReview(submission, 'approved', verified)}>Approve</button><button className="button button-outline" type="button" onClick={() => onReview(submission, 'needs_changes', false)}>Request changes</button><button className="button button-danger" type="button" onClick={() => onReview(submission, 'rejected', false)}>Reject</button></div>
  </article>
}

function AdminPaymentCard({ payment, onConfirm }: { payment: PaymentReview; onConfirm: (payment: PaymentReview) => void }) {
  return <article className="submission-card"><div className="submission-card-heading"><div><h3>{formatMoney(payment.amount, payment.currency)} · {payment.method.replaceAll('_', ' ')}</h3><p>Reference: {payment.provider_reference || 'Not provided'}</p></div><span className="status-pill">{payment.status.replaceAll('_', ' ')}</span></div><button className="button button-gold" type="button" onClick={() => onConfirm(payment)}>Confirm payment and publish</button></article>
}

function AdminPremiumCard({ request, onConfirm }: { request: PremiumRequest; onConfirm: (request: PremiumRequest) => void }) {
  return <article className="submission-card"><div className="submission-card-heading"><div><h3>{request.employer_market === 'kenyan_agency' ? 'Kenyan agency' : 'Gulf employer'} · {formatMoney(request.payment_amount, request.payment_currency)}</h3><p>Reference: {request.payment_reference || 'Not provided'} · {request.payment_method || 'Method not provided'}</p></div><span className="status-pill">{request.status.replaceAll('_', ' ')}</span></div><button className="button button-gold" type="button" onClick={() => onConfirm(request)}>Confirm premium payment</button></article>
}

function AdminJobCard({ job, onSave, onArchive }: { job: AdminJob; onSave: (id: string, values: AdminJobUpdate) => void; onArchive: (id: string) => void }) {
  const [editing, setEditing] = useState(false)

  const saveJob = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    const salaryMin = Number(values.get('salary_min'))
    const salaryMax = Number(values.get('salary_max'))
    if (salaryMax < salaryMin) {
      form.querySelector<HTMLInputElement>('[name="salary_max"]')?.setCustomValidity('Maximum salary must be at least the minimum salary.')
      form.reportValidity()
      return
    }

    onSave(job.id, {
      job_title: String(values.get('job_title') || '').trim(),
      agency_name: String(values.get('agency_name') || '').trim(),
      country: String(values.get('country') || '').trim(),
      city: String(values.get('city') || '').trim(),
      category: String(values.get('category') || '').trim(),
      employment_type: String(values.get('employment_type') || ''),
      description: String(values.get('description') || '').trim(),
      salary_min: salaryMin,
      salary_max: salaryMax,
      salary_currency: String(values.get('salary_currency') || '').trim().toUpperCase(),
    })
    setEditing(false)
  }

  return (
    <article className="submission-card">
      <div className="submission-card-heading">
        <div><h3>{job.job_title}</h3><p>{job.agency_name} · {job.city}, {job.country} · {job.salary_currency} {job.salary_min}–{job.salary_max}</p></div>
        <span className="status-pill">{job.employment_type}</span>
      </div>
      {editing ? (
        <form className="stack-form" onSubmit={saveJob}>
          <div className="form-grid">
            <label className="form-label">Job title<input name="job_title" defaultValue={job.job_title} required maxLength={180} /></label>
            <label className="form-label">Employer or agency<input name="agency_name" defaultValue={job.agency_name} required maxLength={180} /></label>
            <label className="form-label">Country<input name="country" defaultValue={job.country} required maxLength={100} /></label>
            <label className="form-label">City<input name="city" defaultValue={job.city} required maxLength={100} /></label>
            <label className="form-label">Category<input name="category" defaultValue={job.category} required maxLength={80} /></label>
            <label className="form-label">Employment type<select name="employment_type" defaultValue={job.employment_type} required>{['Full time', 'Part time', 'Contract', 'Seasonal'].map((type) => <option key={type}>{type}</option>)}</select></label>
            <label className="form-label">Salary from<input name="salary_min" type="number" min="0" defaultValue={job.salary_min} required onChange={(event) => event.currentTarget.form?.querySelector<HTMLInputElement>('[name="salary_max"]')?.setCustomValidity('')} /></label>
            <label className="form-label">Salary to<input name="salary_max" type="number" min="0" defaultValue={job.salary_max} required onChange={(event) => event.currentTarget.setCustomValidity('')} /></label>
            <label className="form-label">Currency<input name="salary_currency" defaultValue={job.salary_currency} required maxLength={3} minLength={3} /></label>
          </div>
          <label className="form-label">Description<textarea name="description" rows={4} defaultValue={job.description} required minLength={30} maxLength={8000} /></label>
          <div className="review-actions"><button className="button button-gold" type="submit">Save changes</button><button className="button button-outline" type="button" onClick={() => setEditing(false)}>Cancel</button></div>
        </form>
      ) : (
        <>
          <p className="fine-print">{job.description}</p>
          <div className="review-actions"><button className="button button-outline" type="button" onClick={() => setEditing(true)}>Edit listing</button><button className="button button-danger" type="button" onClick={() => { if (window.confirm(`Remove "${job.job_title}" from public listings? Existing applications will be preserved.`)) onArchive(job.id) }}>Archive listing</button></div>
        </>
      )}
    </article>
  )
}

function AdminApplicationCard({ application, onUpdate }: { application: AdminApplication; onUpdate: (applicationId: string, status: string, asAdmin: boolean) => void }) {
  return <article className="submission-card"><div className="submission-card-heading"><div><h3>{application.applicant_name} · {application.job_title}</h3><p>{application.company}</p></div><span className="status-pill">{application.status}</span></div><label className="form-label">Admin status override<select value={application.status} onChange={(event) => onUpdate(application.application_id, event.target.value, true)}>{applicationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label></article>
}

const applicationStatuses = ['applied', 'interview', 'offer', 'medical', 'visa', 'travel', 'flight', 'rejected', 'withdrawn']

function DeleteAccountModal({ onClose, onConfirm, isSubmitting }: { onClose: () => void; onConfirm: () => void; isSubmitting: boolean }) {
  return <Modal onClose={onClose} className="form-modal"><span className="eyebrow">Permanent action</span><h2>Delete your account?</h2><p className="modal-description">This permanently deletes your account and private application documents. This action cannot be undone. Data subject to legal-retention requirements may be retained where required.</p><div className="modal-actions"><button className="button button-danger" type="button" disabled={isSubmitting} onClick={onConfirm}>{isSubmitting ? 'Deleting…' : 'Permanently delete account'}</button><button className="button button-outline" type="button" disabled={isSubmitting} onClick={onClose}>Cancel</button></div></Modal>
}

function ApplicationCard({ application }: { application: ApplicationRecord }) {
  const steps = ['Applied', 'Interview', 'Offer', 'Visa', 'Flight']
  const current = Math.max(0, steps.findIndex((step) => step.toLowerCase() === application.status.toLowerCase()))
  return <article className="application-card panel"><div className="application-head"><div className="company-avatar">{getInitials(application.company)}</div><div><h3>{application.jobTitle}</h3><p>{application.company} · Reference {application.id.slice(0, 8).toUpperCase()}</p></div><span className="status-pill status-progress">{application.status}</span></div><div className="tracker-steps">{steps.map((step, index) => <div className={`tracker-step ${index < current ? 'complete' : ''} ${index === current ? 'current' : ''}`} key={step}><span>{index < current ? <Check size={13} /> : index + 1}</span><small>{step}</small></div>)}</div><p className="tracker-update">Last update: {application.updated} · Employer-reported progress</p></article>
}

function PriceCard({ title, price, note }: { title: string; price: string; note: string }) {
  return <div className="price-card"><span className="eyebrow">{title}</span><strong>{price}</strong><p>{note}</p></div>
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="info-row"><span className="info-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>
}

function EmptyState({ title, description, action, onAction }: { title: string; description: string; action: string; onAction: () => void }) {
  return <div className="empty-state"><span className="empty-icon"><BriefcaseBusiness size={23} /></span><h3>{title}</h3><p>{description}</p><button className="button button-outline" type="button" onClick={onAction}>{action} <ArrowRight size={15} /></button></div>
}

function Modal({ children, onClose, className = '' }: { children: ReactNode; onClose: () => void; className?: string }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className={`modal ${className}`} role="dialog" aria-modal="true">{children}</section></div>
}

export default App
