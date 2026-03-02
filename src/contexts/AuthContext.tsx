import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
    user: User | null;
    isAdmin: boolean;
    loading: boolean;   // true until first auth event fully processed
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

    // Cache admin status per user ID — avoids redundant DB calls on TOKEN_REFRESHED etc.
    const adminCache = useRef<Map<string, boolean>>(new Map());
    const initialLoadDone = useRef(false);

    useEffect(() => {
        let isMounted = true;

        // Safety net: always stop loading after 6 seconds
        const safetyTimeout = setTimeout(() => {
            if (isMounted) setLoading(false);
        }, 6000);

        const resolveAdminStatus = async (userId: string): Promise<boolean> => {
            // Return cached result immediately if we already checked this user
            if (adminCache.current.has(userId)) {
                return adminCache.current.get(userId)!;
            }

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', userId)
                    .single();
                if (error) throw error;
                const result = !!data?.is_admin;
                adminCache.current.set(userId, result);
                return result;
            } catch (err) {
                console.error('Admin check failed:', err);
                // If already cached from a previous call, keep it
                return adminCache.current.get(userId) ?? false;
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!isMounted) return;

            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                const adminStatus = await resolveAdminStatus(currentUser.id);
                if (isMounted) setIsAdmin(adminStatus);
            } else {
                setIsAdmin(false);
                adminCache.current.clear(); // Clear cache on sign out
            }

            // Only call setLoading(false) once — on the very first auth event
            if (!initialLoadDone.current && isMounted) {
                initialLoadDone.current = true;
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
        adminCache.current.clear();
        setUser(null);
        setIsAdmin(false);
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, isAdmin, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
