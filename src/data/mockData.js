export const currentUser = {
  id: 'u1',
  name: 'Alex Rivera',
  email: 'alex.rivera@corp.com',
  role: 'employee',
  team_id: 'team-eng',
  avatar: 'AR',
};

export const teams = [
  { id: 'team-eng',  name: 'Engineering',  color: '#6c63ff', zone: 'A' },
  { id: 'team-mkt',  name: 'Marketing',    color: '#f59e0b', zone: 'B' },
  { id: 'team-hr',   name: 'HR',           color: '#10b981', zone: 'C' },
  { id: 'team-prod', name: 'Product',      color: '#ef4444', zone: 'D' },
];

export const users = [
  { id: 'u1',  name: 'Alex Rivera',    email: 'alex.rivera@corp.com',    team_id: 'team-eng',  avatar: 'AR', status: 'office',  desk: 'D-01' },
  { id: 'u2',  name: 'Sofia Morales',  email: 'sofia.morales@corp.com',  team_id: 'team-eng',  avatar: 'SM', status: 'office',  desk: 'D-03' },
  { id: 'u3',  name: 'Carlos Vega',    email: 'carlos.vega@corp.com',    team_id: 'team-eng',  avatar: 'CV', status: 'remote',  desk: null   },
  { id: 'u4',  name: 'Lucia Perez',    email: 'lucia.perez@corp.com',    team_id: 'team-eng',  avatar: 'LP', status: 'remote',  desk: null   },
  { id: 'u5',  name: 'Rocio Herrera',  email: 'rocio.herrera@corp.com',  team_id: 'team-eng',  avatar: 'RH', status: 'none',    desk: null   },
  { id: 'u6',  name: 'Juan Torres',    email: 'juan.torres@corp.com',    team_id: 'team-mkt',  avatar: 'JT', status: 'office',  desk: 'D-09' },
  { id: 'u7',  name: 'Maya Castillo',  email: 'maya.castillo@corp.com',  team_id: 'team-mkt',  avatar: 'MC', status: 'office',  desk: 'D-10' },
  { id: 'u8',  name: 'Diego Ramos',    email: 'diego.ramos@corp.com',    team_id: 'team-hr',   avatar: 'DR', status: 'remote',  desk: null   },
];

// Desks on the SVG floor plan
export const desks = [
  { id: 'D-01', zone: 'A', x: 80,  y: 90,  status: 'reserved', bookedBy: 'u1' },
  { id: 'D-02', zone: 'A', x: 80,  y: 140, status: 'free',     bookedBy: null },
  { id: 'D-03', zone: 'A', x: 80,  y: 190, status: 'reserved', bookedBy: 'u2' },
  { id: 'D-04', zone: 'A', x: 80,  y: 240, status: 'free',     bookedBy: null },
  { id: 'D-05', zone: 'A', x: 160, y: 90,  status: 'free',     bookedBy: null },
  { id: 'D-06', zone: 'A', x: 160, y: 140, status: 'reserved', bookedBy: null },
  { id: 'D-07', zone: 'A', x: 160, y: 190, status: 'free',     bookedBy: null },
  { id: 'D-08', zone: 'A', x: 160, y: 240, status: 'free',     bookedBy: null },
  { id: 'D-09', zone: 'B', x: 310, y: 90,  status: 'reserved', bookedBy: 'u6' },
  { id: 'D-10', zone: 'B', x: 310, y: 140, status: 'reserved', bookedBy: 'u7' },
  { id: 'D-11', zone: 'B', x: 310, y: 190, status: 'free',     bookedBy: null },
  { id: 'D-12', zone: 'B', x: 310, y: 240, status: 'free',     bookedBy: null },
  { id: 'D-13', zone: 'B', x: 390, y: 90,  status: 'free',     bookedBy: null },
  { id: 'D-14', zone: 'B', x: 390, y: 140, status: 'free',     bookedBy: null },
  { id: 'D-15', zone: 'C', x: 80,  y: 380, status: 'free',     bookedBy: null },
  { id: 'D-16', zone: 'C', x: 80,  y: 430, status: 'free',     bookedBy: null },
  { id: 'D-17', zone: 'C', x: 160, y: 380, status: 'free',     bookedBy: null },
  { id: 'D-18', zone: 'C', x: 160, y: 430, status: 'free',     bookedBy: null },
  { id: 'D-19', zone: 'D', x: 310, y: 380, status: 'free',     bookedBy: null },
  { id: 'D-20', zone: 'D', x: 310, y: 430, status: 'free',     bookedBy: null },
  { id: 'D-21', zone: 'D', x: 390, y: 380, status: 'free',     bookedBy: null },
];

export const rooms = [
  { id: 'R-01', name: 'Sala Alpha',   capacity: 8,  zone: 'A', x: 230, y: 90,  w: 60, h: 80, status: 'reserved' },
  { id: 'R-02', name: 'Sala Beta',    capacity: 4,  zone: 'B', x: 450, y: 90,  w: 60, h: 80, status: 'free'     },
  { id: 'R-03', name: 'Sala Gamma',   capacity: 12, zone: 'C', x: 230, y: 380, w: 60, h: 80, status: 'free'     },
  { id: 'R-04', name: 'Sala Delta',   capacity: 4,  zone: 'D', x: 450, y: 380, w: 60, h: 80, status: 'reserved' },
];

export const zones = [
  { id: 'A', name: 'Zona Ingeniería', team_id: 'team-eng',  color: '#6c63ff', maxCapacity: 20, currentOccupancy: 8,  x: 55,  y: 65,  w: 250, h: 220 },
  { id: 'B', name: 'Zona Marketing',  team_id: 'team-mkt',  color: '#f59e0b', maxCapacity: 15, currentOccupancy: 10, x: 285, y: 65,  w: 240, h: 220 },
  { id: 'C', name: 'Zona RRHH',       team_id: 'team-hr',   color: '#10b981', maxCapacity: 10, currentOccupancy: 2,  x: 55,  y: 350, w: 250, h: 120 },
  { id: 'D', name: 'Zona Producto',   team_id: 'team-prod', color: '#ef4444', maxCapacity: 12, currentOccupancy: 5,  x: 285, y: 350, w: 240, h: 120 },
];

export const analyticsData = [
  { day: 'Lun', ocupacion: 82, reservas: 45 },
  { day: 'Mar', ocupacion: 54, reservas: 30 },
  { day: 'Mié', ocupacion: 91, reservas: 52 },
  { day: 'Jue', ocupacion: 76, reservas: 42 },
  { day: 'Vie', ocupacion: 38, reservas: 21 },
];

export const weeklyTrend = [
  { week: 'Sem 1', promedio: 65 },
  { week: 'Sem 2', promedio: 72 },
  { week: 'Sem 3', promedio: 68 },
  { week: 'Sem 4', promedio: 80 },
  { week: 'Sem 5', promedio: 59 },
  { week: 'Sem 6', promedio: 85 },
];

export const userBooking = {
  id: 'B-1001',
  deskId: 'D-01',
  date: '2026-02-18',
  startTime: '09:00',
  endTime: '18:00',
  checkedIn: false,
};
