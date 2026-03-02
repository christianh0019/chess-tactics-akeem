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
    // loading stays true until BOTH auth state AND admin check are done
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        // Safety net: always stop loading after 6 seconds
        const safetyTimeout = setTimeout(() => {
            if (isMounted) setLoading(false);
        }, 6000);

        const checkAdminStatus = async (userId: string): Promise<boolean> => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', userId)
                    .single();
                if (error) throw error;
                return !!data?.is_admin;
            } catch (err) {
                console.error('Admin check failed:', err);
                return false;
            }
        };

        // onAuthStateChange fires immediately with INITIAL_SESSION event —
        // it reads from localStorage so it's synchronous-ish.
        // We await the admin check before marking auth as loaded.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!isMounted) return;

            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                const adminStatus = await checkAdminStatus(currentUser.id);
                if (isMounted) {
                    setIsAdmin(adminStatus);
                }
            } else {
                setIsAdmin(false);
            }

            // Only clear loading after the full auth + admin check cycle completes
            if (isMounted) {
                clearTimeout(safetyTimeout);
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            clearTimeout(safetyTimeout);
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setIsAdmin(false);
    };

    return (
        <AuthContext.Provider value={{ user, isAdmin, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
