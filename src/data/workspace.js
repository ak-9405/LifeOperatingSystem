import { BarChart3, BookOpenCheck, BriefcaseBusiness, CircleDollarSign, Compass, Flower2, HeartHandshake, HeartPulse, LibraryBig, MessageSquare, NotebookPen, Quote, Sparkles, Target, TrendingUp, WalletCards, Zap } from 'lucide-react';

export const navigation = [
{href:'/',label:'Your day',icon:Compass},
{href:'/progress',label:'Progress',icon:TrendingUp},
{href:'/life-areas',label:'Life areas',icon:Flower2},
{href:'/notebook',label:'Notebook',icon:NotebookPen},
{href:'/philosophy',label:'Philosophy',icon:Quote},
{href:'/plus',label:'Life OS Plus',icon:Sparkles},
{href:'/contact',label:'Contact us',icon:MessageSquare},
];
export const areas = [
  { slug: 'money', title: 'Money', value: '$12,460', detail: 'Your monthly cushion', change: '+8.2%', icon: WalletCards, tone: 'moss', progress: 72 },
  { slug: 'health', title: 'Health', value: '4 of 5', detail: 'Movement days this week', change: 'On track', icon: HeartPulse, tone: 'coral', progress: 80 },
  { slug: 'learning', title: 'Learning', value: '6.5 hrs', detail: 'Curiosity, in hours', change: '+1.5 hrs', icon: BookOpenCheck, tone: 'lilac', progress: 64 },
  { slug: 'goals', title: 'Goals', value: '3 in motion', detail: 'One step at a time', change: 'On track', icon: Target, tone: 'sun', progress: 68 },
  { slug: 'reading', title: 'Reading', value: '24 pages', detail: 'A little every day', change: 'This week', icon: LibraryBig, tone: 'sky', progress: 46 },
  { slug: 'habits', title: 'Habits', value: '12 days', detail: 'Your longest streak yet', change: 'A new record', icon: Zap, tone: 'apricot', progress: 86 },
  { slug: 'career', title: 'Career', value: '2 priorities', detail: 'A thoughtful next move', change: 'In focus', icon: BriefcaseBusiness, tone: 'blue', progress: 58 },
  { slug: 'business', title: 'Business', value: 'Growing well', detail: 'The important work', change: '+12%', icon: BarChart3, tone: 'mint', progress: 76 },
  { slug: 'relationships', title: 'Relationships', value: '4 check-ins', detail: 'Meaningful time together', change: 'This week', icon: HeartHandshake, tone: 'rose', progress: 70 },
];

export const steps = [
  {
    number: '01',
    href: '/life-areas',
    title: 'Bring the whole picture together',
    detail: 'Keep your money, health, goals, learning, and the people you love in one calm place.',
    icon: CircleDollarSign,
    tone: 'step-sage',
  },
  {
    number: '02',
    href: '/life-areas',
    title: 'Make room for what is on your mind',
    detail: 'Write freely in a life-area journal, and return whenever you need to.',
    icon: BookOpenCheck,
    tone: 'step-lilac',
  },
  {
    number: '03',
    href: '/',
    title: 'Build a life that feels in sync',
    detail: 'Log check-ins and adjust your intentions as life changes.',
    icon: TrendingUp,
    tone: 'step-peach',
  },
];
