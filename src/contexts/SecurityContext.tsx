import React, { createContext, useContext, useState } from 'react';
import { registerBiometric, authenticateBiometric } from '../utils/webauthn';

interface SecurityContextType {
    isLocked: boolean;
    hasPin: boolean;
    biometricEnabled: boolean;
    verifyPin: (pin: string) => boolean;
    setPin: (pin: string) => void;
    removePin: () => void;
    unlock: () => void;
    lock: () => void;
    enableBiometric: () => Promise<void>;
    disableBiometric: () => void;
    unlockWithBiometric: () => Promise<boolean>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

const PIN_STORAGE_KEY = 'app_pin';
const BIOMETRIC_FLAG_KEY = 'app_biometric';
const BIOMETRIC_CRED_KEY = 'app_biometric_cred';

export function SecurityProvider({ children }: { children: React.ReactNode }) {
    // 检查是否有存储的 PIN
    const [hasPin, setHasPin] = useState(() => !!localStorage.getItem(PIN_STORAGE_KEY));

    // 初始状态：如果有 PIN，默认是锁定的
    const [isLocked, setIsLocked] = useState(() => {
        return !!localStorage.getItem(PIN_STORAGE_KEY);
    });

    // 生物识别（面容/指纹）快捷解锁是否开启
    const [biometricEnabled, setBiometricEnabled] = useState(() => {
        return localStorage.getItem(BIOMETRIC_FLAG_KEY) === '1' && !!localStorage.getItem(BIOMETRIC_CRED_KEY);
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
        // PIN 没了，快捷解锁一并关闭
        disableBiometric();
    };

    const unlock = () => {
        setIsLocked(false);
    };

    const lock = () => {
        if (hasPin) {
            setIsLocked(true);
        }
    };

    // 开启生物识别：注册平台凭据，成功后持久化
    const enableBiometric = async () => {
        const credId = await registerBiometric();
        localStorage.setItem(BIOMETRIC_CRED_KEY, credId);
        localStorage.setItem(BIOMETRIC_FLAG_KEY, '1');
        setBiometricEnabled(true);
    };

    const disableBiometric = () => {
        localStorage.removeItem(BIOMETRIC_FLAG_KEY);
        localStorage.removeItem(BIOMETRIC_CRED_KEY);
        setBiometricEnabled(false);
    };

    // 用生物识别解锁；成功返回 true 并解锁
    const unlockWithBiometric = async (): Promise<boolean> => {
        const credId = localStorage.getItem(BIOMETRIC_CRED_KEY);
        if (!credId) return false;
        try {
            const ok = await authenticateBiometric(credId);
            if (ok) setIsLocked(false);
            return ok;
        } catch {
            return false;
        }
    };

    return (
        <SecurityContext.Provider value={{
            isLocked,
            hasPin,
            biometricEnabled,
            verifyPin,
            setPin,
            removePin,
            unlock,
            lock,
            enableBiometric,
            disableBiometric,
            unlockWithBiometric,
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
