import React, { createContext, useContext, useState } from 'react';

interface SecurityContextType {
    isLocked: boolean;
    hasPin: boolean;
    verifyPin: (pin: string) => boolean;
    setPin: (pin: string) => void;
    removePin: () => void;
    unlock: () => void;
    lock: () => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

const PIN_STORAGE_KEY = 'app_pin';

export function SecurityProvider({ children }: { children: React.ReactNode }) {
    // 检查是否有存储的 PIN
    const [hasPin, setHasPin] = useState(() => !!localStorage.getItem(PIN_STORAGE_KEY));

    // 初始状态：如果有 PIN，默认是锁定的
    const [isLocked, setIsLocked] = useState(() => {
        return !!localStorage.getItem(PIN_STORAGE_KEY);
    });

    // 监听 Visibility Change，当应用切回后台再回来时可以自动锁定（可选，暂时不实现太复杂的自动锁定，只做启动时锁定）

    const verifyPin = (inputPin: string): boolean => {
        const storedPin = localStorage.getItem(PIN_STORAGE_KEY);
        return storedPin === inputPin;
    };

    const setPin = (newPin: string) => {
        localStorage.setItem(PIN_STORAGE_KEY, newPin);
        setHasPin(true);
        // 设置完 PIN 后不需要立即锁定，因为是用户刚设置的
    };

    const removePin = () => {
        localStorage.removeItem(PIN_STORAGE_KEY);
        setHasPin(false);
        setIsLocked(false);
    };

    const unlock = () => {
        setIsLocked(false);
    };

    const lock = () => {
        if (hasPin) {
            setIsLocked(true);
        }
    };

    return (
        <SecurityContext.Provider value={{
            isLocked,
            hasPin,
            verifyPin,
            setPin,
            removePin,
            unlock,
            lock
        }}>
            {children}
        </SecurityContext.Provider>
    );
}

export const useSecurity = () => {
    const context = useContext(SecurityContext);
    if (context === undefined) {
        throw new Error('useSecurity must be used within a SecurityProvider');
    }
    return context;
};
