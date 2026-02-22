import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [session, setSession] = useState(undefined); // undefined = loading
    const [profile, setProfile] = useState(null);

    // Fetch profile row from public.profiles for the given auth user.
    // Falls back to auth metadata if the DB row isn't readable yet (RLS timing).
    const fetchProfile = async (userId, authUser = null) => {
        if (!userId) { setProfile(null); return; }
        const { data } = await supabase
            .from('profiles')
            .select('*, teams(name, color), companies(name)')
            .eq('id', userId)
            .maybeSingle();

        if (data) {
            setProfile(data);
        } else {
            // Fallback: build profile from auth.user metadata
            const meta = authUser?.user_metadata ?? {};
            const rawName = meta.name ?? meta.full_name ?? authUser?.email ?? 'Usuario';
            setProfile({
                id: userId,
                name: rawName,
                email: authUser?.email ?? '',
                avatar: rawName.slice(0, 2).toUpperCase(),
                role: meta.role ?? 'employee',
                team_id: null,
                teams: null,
            });
        }
    };

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session: s } }) => {
            setSession(s ?? null);
            fetchProfile(s?.user?.id, s?.user);
        });

        // Listen for auth changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
            setSession(s ?? null);
            fetchProfile(s?.user?.id, s?.user);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = (email, password) =>
        supabase.auth.signInWithPassword({ email, password });

    const signUp = (email, password, name) =>
        supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
        });

    const signInWithMagicLink = (email) =>
        supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: window.location.origin },
        });

    const resetPassword = (email) =>
        supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

    const updatePassword = (newPassword) =>
        supabase.auth.updateUser({ password: newPassword });

    const signOut = () => supabase.auth.signOut();

    const value = {
        session,
        user: session?.user ?? null,
        profile,
        loading: session === undefined,
        signIn,
        signUp,
        signInWithMagicLink,
        resetPassword,
        updatePassword,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
