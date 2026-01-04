import {
    Utensils, Car, ShoppingBag, Gamepad2, Heart, Home, GraduationCap,
    Wallet, Briefcase, TrendingUp, Gift, Coffee, Music, Camera,
    Smartphone, Monitor, Plane, Shirt, Trash, Zap, Bell, MoreHorizontal,
    CreditCard, Banknote, HelpCircle,
    // Add other icons if needed, but these cover the defaults and list
} from 'lucide-react';

export const iconMap: Record<string, any> = {
    Utensils, Car, ShoppingBag, Gamepad2, Heart, Home, GraduationCap,
    Wallet, Briefcase, TrendingUp, Gift, Coffee, Music, Camera,
    Smartphone, Monitor, Plane, Shirt, Trash, Zap, Bell, MoreHorizontal,
    CreditCard, Banknote, HelpCircle
};

export const getIcon = (name: string) => {
    return iconMap[name] || HelpCircle;
};
