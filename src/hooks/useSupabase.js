import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Global override for superadmin impersonation
let overrideCompanyId = null;

export function setOverrideCompanyId(id) {
    overrideCompanyId = id;
}

// Get current auth user ID at call time
async function currentUserId() {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
}

// Helper to get current user's company_id
async function currentCompanyId() {
    if (overrideCompanyId) return overrideCompanyId;

    const uid = await currentUserId();
    if (!uid) return null;
    const { data } = await supabase.from('profiles').select('company_id').eq('id', uid).single();
    return data?.company_id ?? null;
}

// ─── Generic fetch helper ───────────────────────────────────────────────────
function useFetch(fetcher, deps = []) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const { data: d, error: e } = await fetcher();
        if (e) setError(e.message);
        else setData(d);
        setLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    useEffect(() => { load(); }, [load]);
    return { data, loading, error, refetch: load };
}

// ─── ASSETS (desks + rooms for a default office) ────────────────────────────
// NOTE: Now requires an officeId because there is no global OFFICE_ID
export function useAssets(officeId) {
    return useFetch(() => {
        if (!officeId) return { data: [], error: null };
        return supabase
            .from('assets')
            .select('*, zones(id, label, name, color)')
            .eq('office_id', officeId)
            .order('name');
    }, [officeId]);
}

// ─── ASSETS for a specific office (editor) ──────────────────────────────────
export function useOfficeAssets(officeId) {
    return useFetch(() => {
        if (!officeId || officeId === 'none') return { data: [], error: null };
        return supabase
            .from('assets')
            .select('*, zones(id, label, name, color)')
            .eq('office_id', officeId)
            .order('name');
    }, [officeId]);
}

// ─── TODAY'S BOOKINGS ───────────────────────────────────────────────────────
export function useTodayBookings() {
    return useFetch(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { data: [], error: null };
        const { data: prof } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
        if (!prof?.company_id) return { data: [], error: null };

        return supabase
            .from('bookings')
            .select('*, profiles!inner(id, name, email, avatar, team_id, company_id), assets(id, name, type, coord_x, coord_y, zones(label))')
            .eq('date', new Date().toISOString().split('T')[0])
            .eq('profiles.company_id', prof.company_id);
    }, []);
}

// ─── BOOKINGS for a specific office + date (REALTIME) ────────────────────────
export function useBookingsByOfficeDate(officeId, date) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastChangeAssetId, setLastChangeAssetId] = useState(null);

    const load = useCallback(async () => {
        if (!officeId || officeId === 'none' || !date) { setData([]); setLoading(false); return; }
        setLoading(true);
        const { data: d, error: e } = await supabase
            .from('bookings')
            .select('*, profiles(id, name, email, avatar, team_id), assets(id, name, type, office_id, zones(label))')
            .eq('date', date);
        if (e) setError(e.message);
        else setData((d ?? []).filter(b => b.assets?.office_id === officeId));
        setLoading(false);
    }, [officeId, date]);

    useEffect(() => {
        load();

        const channel = supabase
            .channel(`bookings-realtime-${officeId}-${date}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'bookings',
                filter: `date=eq.${date}`
            }, async (payload) => {
                // Fetch just the nested info for the new single booking
                const { data: newBk, error } = await supabase
                    .from('bookings')
                    .select('*, profiles(id, name, email, avatar, team_id), assets(id, name, type, office_id, zones(label))')
                    .eq('id', payload.new.id)
                    .single();

                if (!error && newBk.assets?.office_id === officeId) {
                    setData(prev => [...(prev ?? []), newBk]);
                    setLastChangeAssetId(newBk.asset_id);
                    setTimeout(() => setLastChangeAssetId(null), 2000);
                }
            })
            .on('postgres_changes', {
                event: 'DELETE', schema: 'public', table: 'bookings',
                filter: `date=eq.${date}`
            }, (payload) => {
                // Determine which booking was deleted to trigger the pulse
                const deletedBookingId = payload.old.id;
                setData(prev => {
                    const deletedBk = (prev ?? []).find(b => b.id === deletedBookingId);
                    if (deletedBk) {
                        setLastChangeAssetId(deletedBk.asset_id);
                        setTimeout(() => setLastChangeAssetId(null), 2000);
                    }
                    return (prev ?? []).filter(b => b.id !== deletedBookingId);
                });
            })
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'bookings',
                filter: `date=eq.${date}`
            }, () => load()) // For updates (check-ins), just re-fetch for simplicity
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [load, officeId, date]);

    return { data, loading, error, refetch: load, lastChangeAssetId };
}

// keep old name as alias for QR/TeamView
export function useTodayBookingsByOffice(officeId) {
    return useBookingsByOfficeDate(officeId, new Date().toISOString().split('T')[0]);
}

// ─── BOOK a desk or room ────────────────────────────────────────────────────
export async function createBooking(assetId, date = null) {
    const uid = await currentUserId();
    const today = date ?? new Date().toISOString().split('T')[0];

    // Check if user already has a booking today
    const { data: userBooking } = await supabase
        .from('bookings')
        .select('id, assets(name)')
        .eq('user_id', uid)
        .eq('date', today)
        .maybeSingle();

    if (userBooking) {
        return {
            data: null,
            error: { message: `Ya tienes una reserva hoy (${userBooking.assets?.name ?? 'otro sitio'}). Cancélala primero.` },
        };
    }

    // Check if the specific asset is already booked by someone else
    const { data: assetBooking } = await supabase
        .from('bookings')
        .select('id, profiles(name)')
        .eq('asset_id', assetId)
        .eq('date', today)
        .maybeSingle();

    if (assetBooking) {
        return {
            data: null,
            error: { message: `Este sitio ya está reservado por ${assetBooking.profiles?.name ?? 'otro usuario'}.` },
        };
    }

    const { data, error } = await supabase
        .from('bookings')
        .insert({ user_id: uid, asset_id: assetId, date: today })
        .select()
        .single();
    return { data, error };
}


// ─── CHECK-IN ───────────────────────────────────────────────────────────────
export async function checkIn(bookingId) {
    const { data, error } = await supabase
        .from('bookings')
        .update({ check_in_status: 'checked_in', checked_in_at: new Date().toISOString() })
        .eq('id', bookingId)
        .select()
        .single();
    return { data, error };
}

// ─── CANCEL BOOKING ──────────────────────────────────────────────────────────
export async function cancelBooking(bookingId) {
    return supabase.from('bookings').delete().eq('id', bookingId);
}

// ─── WHO'S IN TODAY ─────────────────────────────────────────────────────────
export function useTeamToday(selectedDate) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const queryDate = selectedDate || new Date().toISOString().split('T')[0];

    const load = useCallback(async () => {
        setLoading(true);
        const cid = await currentCompanyId();
        if (!cid) { setData([]); setLoading(false); return; }

        const { data: profiles, error: pErr } = await supabase
            .from('profiles')
            .select('id, name, email, avatar, team_id, company_id, teams(name, color)')
            .eq('company_id', cid);
        if (pErr) { setError(pErr.message); setLoading(false); return; }

        const { data: bookings, error: bErr } = await supabase
            .from('bookings').select('user_id, check_in_status, assets(name)').eq('date', queryDate);
        if (bErr) { setError(bErr.message); setLoading(false); return; }

        const bookingMap = Object.fromEntries((bookings ?? []).map(b => [b.user_id, b]));
        const merged = (profiles ?? []).map(p => {
            const booking = bookingMap[p.id];
            return { ...p, status: booking ? 'office' : 'none', desk: booking?.assets?.name ?? null, checkInStatus: booking?.check_in_status ?? null };
        });
        setData(merged);
        setLoading(false);
    }, [queryDate]);

    useEffect(() => { load(); }, [load]);
    return { data, loading, error, refetch: load };
}

// ─── MY BOOKING TODAY ────────────────────────────────────────────────────────
export function useMyBookingToday() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        const uid = await currentUserId();
        if (!uid) { setLoading(false); return; }
        const { data: d, error: e } = await supabase
            .from('bookings')
            .select('*, assets(name, type, zones(label, name))')
            .eq('user_id', uid)
            .eq('date', new Date().toISOString().split('T')[0])
            .maybeSingle();
        if (e) setError(e.message);
        else setData(d);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);
    return { data, loading, error, refetch: load };
}

// ─── ZONES (for a default office) ───────────────────────────────────────────
export function useZones(officeId) {
    return useFetch(() => {
        if (!officeId) return { data: [], error: null };
        return supabase.from('zones')
            .select('*, teams(id, name, color)')
            .eq('office_id', officeId)
            .order('label');
    }, [officeId]);
}

// ─── ZONES for a specific office ────────────────────────────────────────────
export function useOfficeZones(officeId) {
    return useFetch(() => {
        if (!officeId || officeId === 'none') return { data: [], error: null };
        return supabase.from('zones')
            .select('*, teams(id, name, color)')
            .eq('office_id', officeId)
            .order('label');
    }, [officeId]);
}

export async function updateZoneTeam(zoneId, teamId) {
    return supabase.from('zones').update({ team_id: teamId || null }).eq('id', zoneId);
}

export async function updateZoneCapacity(zoneId, maxCapacity) {
    return supabase.from('zones').update({ max_capacity: maxCapacity }).eq('id', zoneId);
}

export async function updateZone(id, patch) {
    return supabase.from('zones').update(patch).eq('id', id).select().single();
}

export async function createZone(officeId, { label, name, color, coord_x, coord_y, coord_w, coord_h, max_capacity = 20 }) {
    return supabase.from('zones')
        .insert({ office_id: officeId, label, name, color: color ?? '#6c63ff', coord_x, coord_y, coord_w, coord_h, max_capacity })
        .select().single();
}

export async function deleteZone(id) {
    return supabase.from('zones').delete().eq('id', id);
}

// ─── ASSETS CRUD (editor) ───────────────────────────────────────────────────
export async function createAsset(officeId, zoneId, type, name, coord_x, coord_y, capacity = 1) {
    return supabase.from('assets')
        .insert({ office_id: officeId, zone_id: zoneId || null, type, name, coord_x, coord_y, capacity })
        .select().single();
}

export async function updateAsset(id, patch) {
    return supabase.from('assets').update(patch).eq('id', id).select().single();
}

export async function deleteAsset(id) {
    return supabase.from('assets').delete().eq('id', id);
}

// ─── TEAMS ──────────────────────────────────────────────────────────────────
export function useTeams() {
    return useFetch(async () => {
        const cid = await currentCompanyId();
        if (!cid) return { data: [], error: null };
        return supabase.from('teams').select('*').eq('company_id', cid);
    }, []);
}

// ─── OFFICES ────────────────────────────────────────────────────────────────
export function useOffices() {
    return useFetch(async () => {
        const cid = await currentCompanyId();
        if (!cid) return { data: [], error: null };
        return supabase.from('offices')
            .select('id, name, address, created_at')
            .eq('company_id', cid)
            .order('created_at');
    }, []);
}

export async function createOffice(name, address) {
    const cid = await currentCompanyId();
    if (!cid) return { data: null, error: { message: 'No company associated' } };

    return supabase.from('offices')
        .insert({ company_id: cid, name, address })
        .select().single();
}

export async function deleteOffice(id) {
    return supabase.from('offices').delete().eq('id', id);
}

// ─── COMPANIES ───────────────────────────────────────────────────────────────
export function useCompanies() {
    return useFetch(() =>
        supabase.from('companies')
            .select('id, name, plan, timezone, active, created_at')
            .order('created_at'),
        []);
}

export async function createCompany(name, plan = 'free', timezone = 'UTC') {
    return supabase.from('companies')
        .insert({ name, plan, timezone })
        .select().single();
}

export async function updateCompany(id, patch) {
    return supabase.from('companies')
        .update(patch)
        .eq('id', id)
        .select().single();
}

// ─── ANALYTICS: bookings per weekday ────────────────────────────────────────
export function useAnalytics() {
    return useFetch(async () => {
        const cid = await currentCompanyId();
        if (!cid) return { data: [], error: null };
        return supabase.from('analytics_by_weekday').select('*').eq('company_id', cid);
    }, []);
}

// ─── ANALYTICS: weekly trend ────────────────────────────────────────────────
export function useWeeklyTrend() {
    return useFetch(async () => {
        const cid = await currentCompanyId();
        if (!cid) return { data: [], error: null };

        // Fetch bookings only for the current company
        const { data, error } = await supabase
            .from('bookings')
            .select('date, profiles!inner(company_id)')
            .eq('profiles.company_id', cid)
            .gte('date', new Date(Date.now() - 42 * 86400000).toISOString().split('T')[0]);

        if (error) return { data: null, error };

        const weekMap = {};
        (data ?? []).forEach(b => {
            const d = new Date(b.date);
            const week = `Sem ${getISOWeek(d)}`;
            weekMap[week] = (weekMap[week] ?? 0) + 1;
        });
        const rows = Object.entries(weekMap).slice(-6).map(([week, count]) => ({ week, promedio: count }));
        return { data: rows, error: null };
    }, []);
}

function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ─── COMPANY REGISTRATION ────────────────────────────────────────────────────
// Called right after supabase.auth.signUp() to create the company and set the
// new user as admin. Uses SECURITY DEFINER RPC so it bypasses RLS.
export async function registerCompany(companyName, userName) {
    const { data, error } = await supabase.rpc('register_company', {
        p_company_name: companyName,
        p_user_name: userName,
    });
    return { data, error };
}

// ─── INVITATIONS ─────────────────────────────────────────────────────────────
export async function createInvitation(email, role = 'employee') {
    const cid = await currentCompanyId();
    if (!cid) return { data: null, error: { message: 'Sin empresa asociada' } };

    // Get the max_users for this company (even if impersonated)
    const { data: company } = await supabase
        .from('companies')
        .select('max_users')
        .eq('id', cid)
        .single();

    // Check user limit before creating invite
    const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', cid);

    if (count >= (company?.max_users ?? 10)) {
        return { data: null, error: { message: 'Límite de usuarios alcanzado. Actualiza tu plan.' } };
    }

    const { data, error } = await supabase
        .from('invitations')
        .insert({ company_id: cid, email, role })
        .select()
        .single();
    return { data, error };
}

export async function acceptInvite(token, name) {
    const { data, error } = await supabase.rpc('accept_invite', {
        p_token: token,
        p_name: name,
    });
    return { data, error };
}

export function useCompanyUsers() {
    return useFetch(async () => {
        const cid = await currentCompanyId();
        if (!cid) return { data: [], error: null };
        return supabase
            .from('profiles')
            .select('id, name, email, role, active, companies(name, max_users)')
            .eq('company_id', cid)
            .order('name');
    }, []);
}

export async function setUserActiveStatus(userId, active) {
    const { data, error } = await supabase
        .from('profiles')
        .update({ active })
        .eq('id', userId);
    return { data, error };
}


export function useCompanyInvitations() {
    return useFetch(async () => {
        const cid = await currentCompanyId();
        if (!cid) return { data: [], error: null };
        const { data, error } = await supabase
            .from('invitations')
            .select('*')
            .eq('company_id', cid)
            .order('created_at', { ascending: false });
        return { data, error };
    }, []);
}

// ─── SAAS ADMIN (Superadmin only) ───────────────────────────────────────────
export function useSaasCompanies() {
    return useFetch(() =>
        supabase.from('companies')
            .select('*, profiles(count)')
            .order('created_at', { ascending: false }),
        []);
}

export function useSaasStats() {
    return useFetch(async () => {
        const [comps, profs, bks] = await Promise.all([
            supabase.from('companies').select('id', { count: 'exact', head: true }),
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            supabase.from('bookings').select('id', { count: 'exact', head: true })
                .gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
        ]);

        return {
            data: {
                totalCompanies: comps.count || 0,
                totalUsers: profs.count || 0,
                monthlyBookings: bks.count || 0
            },
            error: comps.error || profs.error || bks.error
        };
    }, []);
}
