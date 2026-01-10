import {
    Utensils, Car, ShoppingBag, Gamepad2, Heart, Home, GraduationCap,
    Wallet, Briefcase, TrendingUp, Gift, Coffee, Music, Camera,
    Smartphone, Monitor, Plane, Shirt, Trash, Zap, Bell, MoreHorizontal,
    CreditCard, Banknote, HelpCircle, PiggyBank, Target, Star, Award,
    Umbrella, Edit3, Trash2,
} from 'lucide-react';

export const iconMap: Record<string, any> = {
    Utensils, Car, ShoppingBag, Gamepad2, Heart, Home, GraduationCap,
    Wallet, Briefcase, TrendingUp, Gift, Coffee, Music, Camera,
    Smartphone, Monitor, Plane, Shirt, Trash, Zap, Bell, MoreHorizontal,
    CreditCard, Banknote, HelpCircle, PiggyBank, Target, Star, Award,
    Umbrella, Edit3, Trash2,
};

export function getIcon(name: string) {
    return iconMap[name] || HelpCircle;
}
