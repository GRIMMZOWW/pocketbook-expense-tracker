import {
  Utensils, Plane, ShoppingBag, Receipt, Home, Film,
  HeartPulse, GraduationCap, Repeat, Briefcase, Laptop,
  Building2, TrendingUp, Gift, Tag,
} from 'lucide-react';

const ICON_MAP = {
  Food: Utensils,
  Travel: Plane,
  Shopping: ShoppingBag,
  Bills: Receipt,
  Rent: Home,
  Entertainment: Film,
  Health: HeartPulse,
  Education: GraduationCap,
  Subscription: Repeat,
  Salary: Briefcase,
  Freelance: Laptop,
  Business: Building2,
  Investment: TrendingUp,
  Gift: Gift,
};

export function CategoryIcon({ name, size = 16 }) {
  const Icon = ICON_MAP[name] || Tag;
  return <Icon size={size} aria-hidden="true" />;
}
