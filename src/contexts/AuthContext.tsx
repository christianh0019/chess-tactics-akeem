import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
    user: User | null;
    isAdmin: boolean;
    loading: boolean;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    isAdmin: false,
    loading: true,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        // Safety net: always stop loading after 5 seconds max
        const safetyTimeout = setTimeout(() => {
            if (isMounted) setLoading(false);
        }, 5000);

        const checkAdminStatus = async (userId: string) => {
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', userId)
                    .single();
                if (isMounted) setIsAdmin(!!data?.is_admin);
            } catch {
                if (isMounted) setIsAdmin(false);
            }
        };

        // Single source of truth: onAuthStateChange handles INITIAL_SESSION too.
        // This fires immediately on mount with the stored session from localStorage.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!isMounted) return;

            setUser(session?.user ?? null);

            if (session?.user) {
                await checkAdminStatus(session.user.id);
            } else {
                setIsAdmin(false);
            }

            // Mark loading done after first auth event is processed
            setLoading(false);
            clearTimeout(safetyTimeout);
        });

        return () => {
            isMounted = false;
            clearTimeout(safetyTimeout);
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, isAdmin, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
