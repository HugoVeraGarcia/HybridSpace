import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    useOfficeAssets, useOfficeZones,
    createAsset, deleteAsset, updateAsset,
    createZone, deleteZone, updateZone,
} from '../hooks/useSupabase';
import {
    ArrowLeft, MousePointer, LayoutGrid,
    DoorOpen, Trash2, Plus, Info,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────
const CANVAS_W = 600;
const CANVAS_H = 480;
const SNAP = 20;
const DESK_W = 36;
const DESK_H = 28;
const ROOM_W = 70;
const ROOM_H = 80;

const ZONE_PALETTE = [
    '#6c63ff', '#f59e0b', '#10b981', '#ef4444',
    '#38bdf8', '#ec4899', '#8b5cf6', '#14b8a6',
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const snap = v => Math.round(v / SNAP) * SNAP;

function getSVGPoint(e, svgEl) {
    const rect = svgEl.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
        x: snap((e.clientX - rect.left) * scaleX),
        y: snap((e.clientY - rect.top) * scaleY),
    };
}

function pointInZone(x, y, z) {
    return x >= z.coord_x && x <= z.coord_x + z.coord_w &&
        y >= z.coord_y && y <= z.coord_y + z.coord_h;
}

function nextDeskName(assets) {
    const nums = (assets ?? [])
        .filter(a => a.type === 'desk' && /^D-\d+$/.test(a.name))
        .map(a => parseInt(a.name.slice(2)));
    return `D-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, '0')}`;
}

function nextZoneLabel(zones) {
    const labels = (zones ?? []).map(z => z.label);
    for (let i = 0; i < 26; i++) {
        const l = String.fromCharCode(65 + i);
        if (!labels.includes(l)) return l;
    }
    return 'X';
}

// ── Mode config ──────────────────────────────────────────────────────────────
const MODES = [
    { id: 'select', icon: <MousePointer size={16} />, label: 'Seleccionar' },
    { id: 'addDesk', icon: <LayoutGrid size={16} />, label: 'Escritorio' },
    { id: 'addRoom', icon: <DoorOpen size={16} />, label: 'Sala' },
    { id: 'addZone', icon: <Plus size={16} />, label: 'Zona' },
];

// ── Zone Modal ───────────────────────────────────────────────────────────────
function ZoneModal({ rect, onConfirm, onCancel }) {
    const [name, setName] = useState('Nueva Zona');
    const [color, setColor] = useState(ZONE_PALETTE[0]);

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 360 }}>
                <h3>Configurar Zona</h3>
                <p>Tamaño: {rect.w} × {rect.h} px &nbsp;|&nbsp; Posición: ({rect.x}, {rect.y})</p>
                <div className="input-group" style={{ marginBottom: 16 }}>
                    <label>Nombre</label>
                    <div className="input-wrapper">
                        <input type="text" value={name}
                            onChange={e => setName(e.target.value)} autoFocus />
                    </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                        Color
                    </label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {ZONE_PALETTE.map(c => (
                            <button key={c} onClick={() => setColor(c)}
                                style={{
                                    width: 28, height: 28, borderRadius: 6, background: c,
                                    border: 'none', cursor: 'pointer',
                                    outline: color === c ? '3px solid #fff' : '3px solid transparent',
                                    outlineOffset: 2
                                }} />
                        ))}
                    </div>
                </div>
                <div className="modal-actions">
                    <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
                    <button className="btn btn-primary"
                        onClick={() => onConfirm({ name: name.trim() || 'Zona', color })}>
                        Crear Zona
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Room Modal ───────────────────────────────────────────────────────────────
function RoomModal({ onConfirm, onCancel }) {
    const [name, setName] = useState('Sala Nueva');
    const [cap, setCap] = useState(8);
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 340 }}>
                <h3>Nueva Sala de Reuniones</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="input-group">
                        <label>Nombre</label>
                        <div className="input-wrapper">
                            <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus />
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Capacidad (personas)</label>
                        <div className="input-wrapper">
                            <input type="number" min={1} max={50} value={cap}
                                onChange={e => setCap(parseInt(e.target.value) || 1)}
                                style={{ paddingLeft: 14 }} />
                        </div>
                    </div>
                </div>
                <div className="modal-actions">
                    <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
                    <button className="btn btn-primary"
                        onClick={() => onConfirm({ name: name.trim() || 'Sala', capacity: cap })}>
                        Crear Sala
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Editor ──────────────────────────────────────────────────────────────
export default function OfficeEditor() {
    const { id: officeId } = useParams();
    const navigate = useNavigate();

    const { data: assets, refetch: refetchAssets } = useOfficeAssets(officeId);
    const { data: zones, refetch: refetchZones } = useOfficeZones(officeId);

    const svgRef = useRef(null);

    // Mode & selection
    const [mode, setMode] = useState('select');
    const [selectedId, setSelectedId] = useState(null);
    const [selectedType, setSelectedType] = useState(null);
    const [hoverId, setHoverId] = useState(null);
    const [busy, setBusy] = useState(false);

    // Zone draw drag
    const [isZoneDraw, setIsZoneDraw] = useState(false);
    const [drawStart, setDrawStart] = useState(null);
    const [drawCurrent, setDrawCurrent] = useState(null);
    const [zoneModal, setZoneModal] = useState(null);

    // Room placement
    const [roomPending, setRoomPending] = useState(null);

    // Editable name for selected item
    const [editName, setEditName] = useState('');

    // Item drag (move existing items)
    const [dragItem, setDragItem] = useState(null);
    // { id, type:'asset'|'zone', origX, origY, mouseX, mouseY }
    const [dragPos, setDragPos] = useState(null);
    // tracks whether mouse moved enough to count as drag (not click)
    const didDragRef = useRef(false);

    // ── derived ────────────────────────────────────────────────────────────────
    const desks = (assets ?? []).filter(a => a.type === 'desk');
    const rooms = (assets ?? []).filter(a => a.type === 'room');

    const selectedAsset = selectedType === 'asset' ? (assets ?? []).find(a => a.id === selectedId) : null;
    const selectedZone = selectedType === 'zone' ? (zones ?? []).find(z => z.id === selectedId) : null;

    // Sync editName when selection changes
    useEffect(() => {
        if (selectedAsset) setEditName(selectedAsset.name ?? '');
        else if (selectedZone) setEditName(selectedZone.name ?? '');
        else setEditName('');
    }, [selectedId]); // eslint-disable-line

    // Save name to DB
    const saveEditName = useCallback(async () => {
        if (!editName.trim() || !selectedId) return;
        setBusy(true);
        if (selectedType === 'asset') {
            await updateAsset(selectedId, { name: editName.trim() });
            refetchAssets();
        } else if (selectedType === 'zone') {
            await updateZone(selectedId, { name: editName.trim() });
            refetchZones();
        }
        setBusy(false);
    }, [editName, selectedId, selectedType, refetchAssets, refetchZones]);

    // ── get position of item accounting for drag ──────────────────────────────
    const livePos = (id) => (dragItem?.id === id && dragPos) ? dragPos : null;

    // ── start dragging an existing item ──────────────────────────────────────
    const startItemDrag = useCallback((e, id, type, origX, origY) => {
        if (mode !== 'select') return;
        e.stopPropagation();
        const pt = getSVGPoint(e, svgRef.current);
        setDragItem({ id, type, origX, origY, mouseX: pt.x, mouseY: pt.y });
        setDragPos({ x: origX, y: origY });
        setSelectedId(id);
        setSelectedType(type);
        didDragRef.current = false;
    }, [mode]);

    // ── canvas-level mouse events ─────────────────────────────────────────────
    const handleMouseDown = useCallback((e) => {
        if (!svgRef.current) return;
        if (mode === 'addZone') {
            const pt = getSVGPoint(e, svgRef.current);
            setIsZoneDraw(true);
            setDrawStart(pt);
            setDrawCurrent(pt);
        }
    }, [mode]);

    const handleMouseMove = useCallback((e) => {
        if (!svgRef.current) return;
        const pt = getSVGPoint(e, svgRef.current);

        // Zone drawing preview
        if (isZoneDraw) {
            setDrawCurrent(pt);
            return;
        }

        // Item drag
        if (dragItem) {
            const dx = pt.x - dragItem.mouseX;
            const dy = pt.y - dragItem.mouseY;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) didDragRef.current = true;
            setDragPos({
                x: snap(dragItem.origX + dx),
                y: snap(dragItem.origY + dy),
            });
        }
    }, [isZoneDraw, dragItem]);

    const handleMouseUp = useCallback(async (e) => {
        // Finish zone draw
        if (isZoneDraw && drawStart && drawCurrent) {
            setIsZoneDraw(false);
            const x = Math.min(drawStart.x, drawCurrent.x);
            const y = Math.min(drawStart.y, drawCurrent.y);
            const w = Math.abs(drawCurrent.x - drawStart.x);
            const h = Math.abs(drawCurrent.y - drawStart.y);
            setDrawStart(null); setDrawCurrent(null);
            if (w >= 40 && h >= 40) setZoneModal({ x, y, w, h });
            return;
        }

        // Finish item drag — save new position if moved
        if (dragItem && dragPos && didDragRef.current) {
            setBusy(true);
            if (dragItem.type === 'asset') {
                await updateAsset(dragItem.id, { coord_x: dragPos.x, coord_y: dragPos.y });
                refetchAssets();
            } else {
                await updateZone(dragItem.id, { coord_x: dragPos.x, coord_y: dragPos.y });
                refetchZones();
            }
            setBusy(false);
        }
        setDragItem(null);
        setDragPos(null);
    }, [isZoneDraw, drawStart, drawCurrent, dragItem, dragPos, refetchAssets, refetchZones]);

    // ── canvas click (place desk/room, deselect) ──────────────────────────────
    const handleCanvasClick = useCallback(async (e) => {
        if (!svgRef.current) return;
        if (isZoneDraw || (dragItem && didDragRef.current)) return;

        const pt = getSVGPoint(e, svgRef.current);

        if (mode === 'addDesk') {
            setBusy(true);
            const zoneHit = (zones ?? []).find(z => pointInZone(pt.x, pt.y, z));
            const { error } = await createAsset(officeId, zoneHit?.id ?? null, 'desk', nextDeskName(assets), pt.x, pt.y);
            setBusy(false);
            if (!error) refetchAssets();
            else alert('Error: ' + error.message);
            return;
        }

        if (mode === 'addRoom') {
            setRoomPending(pt);
            return;
        }

        if (mode === 'select') {
            setSelectedId(null);
            setSelectedType(null);
        }
    }, [isZoneDraw, dragItem, mode, zones, assets, officeId, refetchAssets]);

    // ── zone confirm ──────────────────────────────────────────────────────────
    const confirmZone = useCallback(async ({ name, color }) => {
        if (!zoneModal) return;
        setBusy(true);
        const { error } = await createZone(officeId, {
            label: nextZoneLabel(zones), name, color,
            coord_x: zoneModal.x, coord_y: zoneModal.y,
            coord_w: zoneModal.w, coord_h: zoneModal.h,
        });
        setBusy(false);
        setZoneModal(null);
        if (!error) refetchZones();
        else alert('Error: ' + error.message);
    }, [zoneModal, zones, officeId, refetchZones]);

    // ── room confirm ──────────────────────────────────────────────────────────
    const confirmRoom = useCallback(async ({ name, capacity }) => {
        if (!roomPending) return;
        setBusy(true);
        const zoneHit = (zones ?? []).find(z => pointInZone(roomPending.x, roomPending.y, z));
        const { error } = await createAsset(officeId, zoneHit?.id ?? null, 'room', name, roomPending.x, roomPending.y, capacity);
        setBusy(false);
        setRoomPending(null);
        if (!error) refetchAssets();
        else alert('Error: ' + error.message);
    }, [roomPending, zones, officeId, refetchAssets]);

    // ── delete selected ───────────────────────────────────────────────────────
    const deleteSelected = useCallback(async () => {
        if (!selectedId) return;
        const label = selectedAsset?.name ?? selectedZone?.name ?? 'elemento';
        if (!window.confirm(`¿Eliminar "${label}"?`)) return;
        setBusy(true);
        if (selectedType === 'asset') { await deleteAsset(selectedId); refetchAssets(); }
        else { await deleteZone(selectedId); refetchZones(); }
        setSelectedId(null); setSelectedType(null);
        setBusy(false);
    }, [selectedId, selectedType, selectedAsset, selectedZone, refetchAssets, refetchZones]);

    // ── cursor ────────────────────────────────────────────────────────────────
    const isDraggingItem = !!dragItem;
    const canvasCursor = isDraggingItem ? 'grabbing'
        : mode === 'addZone' ? 'crosshair'
            : mode === 'select' ? 'default'
                : 'cell';

    // ── zone draw preview ─────────────────────────────────────────────────────
    const previewRect = isZoneDraw && drawStart && drawCurrent ? {
        x: Math.min(drawStart.x, drawCurrent.x),
        y: Math.min(drawStart.y, drawCurrent.y),
        w: Math.abs(drawCurrent.x - drawStart.x),
        h: Math.abs(drawCurrent.y - drawStart.y),
    } : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Top bar */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
                paddingBottom: 16, borderBottom: '1px solid var(--border)'
            }}>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }}
                    onClick={() => navigate('/admin/offices')}>
                    <ArrowLeft size={15} /> Oficinas
                </button>
                <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px', flex: 1 }}>
                    🗺️ Editor de Layout
                </h2>
                {busy && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Guardando…</span>}
            </div>

            <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>

                {/* Left panel */}
                <div style={{ width: 170, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                        Herramientas
                    </p>
                    {MODES.map(m => (
                        <button key={m.id}
                            onClick={() => { setMode(m.id); setSelectedId(null); setDragItem(null); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                fontSize: 13, fontWeight: 600, textAlign: 'left', width: '100%',
                                background: mode === m.id ? 'var(--accent-dim)' : 'transparent',
                                color: mode === m.id ? 'var(--accent)' : 'var(--text-secondary)',
                                outline: mode === m.id ? '1px solid var(--border-accent)' : '1px solid transparent',
                                transition: 'all 0.15s',
                            }}>
                            {m.icon} {m.label}
                        </button>
                    ))}

                    <div style={{
                        marginTop: 12, padding: '10px 12px', background: 'rgba(108,99,255,0.07)',
                        border: '1px solid rgba(108,99,255,0.15)', borderRadius: 8, fontSize: 11,
                        color: 'var(--text-muted)', lineHeight: 1.5
                    }}>
                        <Info size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {mode === 'select' && 'Haz clic para seleccionar. Arrastra para mover. Escritorios, salas y zonas son movibles.'}
                        {mode === 'addDesk' && 'Haz clic en el mapa para colocar un escritorio.'}
                        {mode === 'addRoom' && 'Haz clic para posicionar la sala.'}
                        {mode === 'addZone' && 'Arrastra un rectángulo para dibujar la zona.'}
                    </div>
                </div>

                {/* Center: canvas */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        background: 'var(--bg-surface)', border: '1px solid var(--border)',
                        borderRadius: 16, overflow: 'hidden', height: '100%', minHeight: 400,
                    }}>
                        <svg
                            ref={svgRef}
                            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                            style={{
                                width: '100%', height: '100%', display: 'block', cursor: canvasCursor,
                                userSelect: 'none'
                            }}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onClick={handleCanvasClick}
                        >
                            {/* Grid dots */}
                            <defs>
                                <pattern id="eg" width={SNAP} height={SNAP} patternUnits="userSpaceOnUse">
                                    <path d={`M ${SNAP} 0 L 0 0 0 ${SNAP}`} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                                </pattern>
                            </defs>
                            <rect width={CANVAS_W} height={CANVAS_H} fill="url(#eg)" />

                            {/* ── Zones ── */}
                            {(zones ?? []).map(z => {
                                const live = livePos(z.id);
                                const zx = live?.x ?? z.coord_x;
                                const zy = live?.y ?? z.coord_y;
                                const isSelected = selectedId === z.id && selectedType === 'zone';
                                const hex = z.color ?? '#6c63ff';
                                const isDraggingThis = dragItem?.id === z.id;
                                return (
                                    <g key={z.id}
                                        style={{ cursor: mode === 'select' ? (isDraggingThis ? 'grabbing' : 'grab') : canvasCursor }}
                                        onMouseDown={e => startItemDrag(e, z.id, 'zone', z.coord_x, z.coord_y)}
                                        onClick={e => { if (!didDragRef.current) { e.stopPropagation(); setSelectedId(z.id); setSelectedType('zone'); } }}
                                    >
                                        <rect
                                            x={zx} y={zy} width={z.coord_w} height={z.coord_h}
                                            fill={`${hex}18`}
                                            stroke={isSelected ? hex : isDraggingThis ? hex : `${hex}40`}
                                            strokeWidth={isSelected || isDraggingThis ? 2 : 1}
                                            rx={10}
                                            onMouseEnter={() => setHoverId(z.id)}
                                            onMouseLeave={() => setHoverId(null)}
                                        />
                                        <text x={zx + 10} y={zy + 18}
                                            fill={`${hex}cc`} fontSize={10} fontWeight={700} pointerEvents="none">
                                            {z.label} — {z.name}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* ── Desks ── */}
                            {desks.map(d => {
                                const live = livePos(d.id);
                                const dx = live?.x ?? d.coord_x;
                                const dy = live?.y ?? d.coord_y;
                                const isSelected = selectedId === d.id && selectedType === 'asset';
                                const isDraggingThis = dragItem?.id === d.id;
                                return (
                                    <g key={d.id}
                                        style={{ cursor: mode === 'select' ? (isDraggingThis ? 'grabbing' : 'grab') : canvasCursor }}
                                        onMouseDown={e => startItemDrag(e, d.id, 'asset', d.coord_x, d.coord_y)}
                                        onClick={e => { if (!didDragRef.current) { e.stopPropagation(); setSelectedId(d.id); setSelectedType('asset'); } }}
                                        onMouseEnter={() => setHoverId(d.id)}
                                        onMouseLeave={() => setHoverId(null)}
                                    >
                                        <rect
                                            x={dx - DESK_W / 2} y={dy - DESK_H / 2}
                                            width={DESK_W} height={DESK_H}
                                            fill={isSelected ? 'rgba(108,99,255,0.35)' : isDraggingThis ? 'rgba(108,99,255,0.25)' : hoverId === d.id ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.12)'}
                                            stroke={isSelected ? '#6c63ff' : isDraggingThis ? '#6c63ff' : hoverId === d.id ? 'rgba(16,185,129,0.8)' : 'rgba(16,185,129,0.4)'}
                                            strokeWidth={isSelected || isDraggingThis ? 2 : 1.5}
                                            rx={4}
                                        />
                                        <text x={dx} y={dy + 3}
                                            textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.5)" pointerEvents="none">
                                            {d.name}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* ── Rooms ── */}
                            {rooms.map(r => {
                                const live = livePos(r.id);
                                const rx = live?.x ?? r.coord_x;
                                const ry = live?.y ?? r.coord_y;
                                const isSelected = selectedId === r.id && selectedType === 'asset';
                                const isDraggingThis = dragItem?.id === r.id;
                                return (
                                    <g key={r.id}
                                        style={{ cursor: mode === 'select' ? (isDraggingThis ? 'grabbing' : 'grab') : canvasCursor }}
                                        onMouseDown={e => startItemDrag(e, r.id, 'asset', r.coord_x, r.coord_y)}
                                        onClick={e => { if (!didDragRef.current) { e.stopPropagation(); setSelectedId(r.id); setSelectedType('asset'); } }}
                                        onMouseEnter={() => setHoverId(r.id)}
                                        onMouseLeave={() => setHoverId(null)}
                                    >
                                        <rect
                                            x={rx} y={ry} width={ROOM_W} height={ROOM_H}
                                            fill={isSelected ? 'rgba(56,189,248,0.2)' : isDraggingThis ? 'rgba(56,189,248,0.18)' : 'rgba(56,189,248,0.08)'}
                                            stroke={isSelected || isDraggingThis ? '#38bdf8' : hoverId === r.id ? 'rgba(56,189,248,0.6)' : 'rgba(56,189,248,0.25)'}
                                            strokeWidth={isSelected || isDraggingThis ? 2 : 1.5}
                                            rx={6}
                                        />
                                        <text x={rx + ROOM_W / 2} y={ry + ROOM_H / 2 - 5}
                                            textAnchor="middle" fontSize={8} fontWeight={600} fill="rgba(56,189,248,0.9)" pointerEvents="none">
                                            {r.name}
                                        </text>
                                        <text x={rx + ROOM_W / 2} y={ry + ROOM_H / 2 + 8}
                                            textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.3)" pointerEvents="none">
                                            Cap. {r.capacity}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Zone draw preview */}
                            {previewRect && previewRect.w > 10 && previewRect.h > 10 && (
                                <rect
                                    x={previewRect.x} y={previewRect.y}
                                    width={previewRect.w} height={previewRect.h}
                                    fill="rgba(108,99,255,0.1)" stroke="#6c63ff"
                                    strokeWidth={1.5} strokeDasharray="6,3" rx={8}
                                    pointerEvents="none"
                                />
                            )}
                        </svg>
                    </div>
                </div>

                {/* Right panel */}
                <div style={{ width: 190, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Propiedades
                    </p>

                    {!selectedId && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            Selecciona un elemento para ver sus propiedades.
                        </div>
                    )}

                    {selectedAsset && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div className="card card-sm" style={{ gap: 8, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Nombre</div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <input
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        onBlur={saveEditName}
                                        onKeyDown={e => e.key === 'Enter' && saveEditName()}
                                        style={{
                                            flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
                                            borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary)',
                                            fontSize: 13, fontWeight: 600, minWidth: 0,
                                        }}
                                    />
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    {selectedAsset.type === 'desk' ? '🪑 Escritorio' : '🚪 Sala'} · x:{selectedAsset.coord_x} y:{selectedAsset.coord_y}
                                </div>
                                {selectedAsset.zones && (
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Zona: {selectedAsset.zones.name}</div>
                                )}
                            </div>
                            <button className="btn btn-danger" style={{ justifyContent: 'center' }}
                                onClick={deleteSelected} disabled={busy}>
                                <Trash2 size={14} /> Eliminar
                            </button>
                        </div>
                    )}

                    {selectedZone && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div className="card card-sm" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <div style={{ width: 12, height: 12, borderRadius: 3, background: selectedZone.color, flexShrink: 0 }} />
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Nombre</div>
                                </div>
                                <input
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    onBlur={saveEditName}
                                    onKeyDown={e => e.key === 'Enter' && saveEditName()}
                                    style={{
                                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                                        borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary)',
                                        fontSize: 13, fontWeight: 600, width: '100%', boxSizing: 'border-box',
                                    }}
                                />
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    {selectedZone.coord_w} × {selectedZone.coord_h} · Cap. {selectedZone.max_capacity}
                                </div>
                            </div>
                            <button className="btn btn-danger" style={{ justifyContent: 'center' }}
                                onClick={deleteSelected} disabled={busy}>
                                <Trash2 size={14} /> Eliminar zona
                            </button>
                        </div>
                    )}

                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
                            Leyenda
                        </p>
                        {[
                            { color: 'rgba(16,185,129,0.4)', label: 'Escritorios' },
                            { color: 'rgba(56,189,248,0.4)', label: 'Salas' },
                            { color: 'rgba(108,99,255,0.15)', label: 'Zonas' },
                        ].map(l => (
                            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                                <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
                                {l.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {zoneModal && <ZoneModal rect={zoneModal} onConfirm={confirmZone} onCancel={() => setZoneModal(null)} />}
            {roomPending && <RoomModal onConfirm={confirmRoom} onCancel={() => setRoomPending(null)} />}
        </div>
    );
}
