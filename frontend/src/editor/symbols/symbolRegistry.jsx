import { Arrow, Circle, Group, Line, Rect, Text } from 'react-konva';

const SYMBOL_SIZE = 48;
const green = '#168449';
const red = '#dc2626';

const sign = (fill, children) => <Group><Rect width={48} height={48} fill={fill} cornerRadius={3} />{children}</Group>;

export const SYMBOL_DEFINITIONS = {
  emergencyExit: {
    id: 'emergencyExit', label: 'Salida de emergencia', icon: 'bi-box-arrow-right', category: 'evacuación',
    render: () => sign(green, <><Text x={4} y={3} width={40} text="SALIDA" fill="white" fontSize={8} fontStyle="bold" align="center" /><Circle x={16} y={22} radius={4} fill="white" /><Line points={[16, 27, 23, 31, 29, 25]} stroke="white" strokeWidth={4} lineCap="round" lineJoin="round" /><Arrow points={[27, 37, 41, 37]} stroke="white" fill="white" strokeWidth={3} pointerLength={6} pointerWidth={6} /></>),
  },
  evacuationRoute: {
    id: 'evacuationRoute', label: 'Ruta de evacuación', icon: 'bi-sign-turn-right', category: 'evacuación',
    render: () => sign(green, <><Text x={3} y={4} width={42} text="RUTA" fill="white" fontSize={9} fontStyle="bold" align="center" /><Arrow points={[8, 34, 25, 34, 25, 21, 39, 21]} stroke="white" fill="white" strokeWidth={5} pointerLength={7} pointerWidth={7} lineJoin="round" /></>),
  },
  extinguisher: {
    id: 'extinguisher', label: 'Extintor', icon: 'bi-fire', category: 'incendio',
    render: () => sign(red, <><Text x={3} y={3} width={42} text="EXTINTOR" fill="white" fontSize={7} fontStyle="bold" align="center" /><Rect x={15} y={19} width={18} height={23} fill="white" cornerRadius={5} /><Rect x={20} y={14} width={8} height={7} fill="white" /><Line points={[28, 16, 36, 19, 36, 27]} stroke="white" strokeWidth={3} lineCap="round" /></>),
  },
  fireHose: {
    id: 'fireHose', label: 'Boca de incendio', icon: 'bi-record-circle', category: 'incendio',
    render: () => sign(red, <><Text x={2} y={3} width={44} text="HIDRANTE" fill="white" fontSize={7} fontStyle="bold" align="center" /><Circle x={24} y={29} radius={13} stroke="white" strokeWidth={4} /><Circle x={24} y={29} radius={5} stroke="white" strokeWidth={3} /><Line points={[29, 33, 38, 40]} stroke="white" strokeWidth={4} lineCap="round" /></>),
  },
  alarm: {
    id: 'alarm', label: 'Alarma de incendio', icon: 'bi-bell-fill', category: 'incendio',
    render: () => sign(red, <><Text x={2} y={3} width={44} text="ALARMA" fill="white" fontSize={7} fontStyle="bold" align="center" /><Circle x={24} y={29} radius={10} fill="white" /><Line points={[10, 20, 5, 16, 10, 13, 5, 9]} stroke="white" strokeWidth={2} /><Line points={[38, 20, 43, 16, 38, 13, 43, 9]} stroke="white" strokeWidth={2} /></>),
  },
  firstAid: {
    id: 'firstAid', label: 'Primeros auxilios', icon: 'bi-plus-square-fill', category: 'emergencia',
    render: () => sign(green, <><Rect x={20} y={11} width={8} height={27} fill="white" /><Rect x={11} y={20} width={27} height={8} fill="white" /></>),
  },
  assemblyPoint: {
    id: 'assemblyPoint', label: 'Punto de encuentro', icon: 'bi-people-fill', category: 'evacuación',
    render: () => sign(green, <><Text x={2} y={3} width={44} text="ENCUENTRO" fill="white" fontSize={7} fontStyle="bold" align="center" /><Circle x={18} y={24} radius={5} fill="white" /><Circle x={31} y={24} radius={5} fill="white" /><Line points={[10, 40, 12, 32, 18, 29, 24, 34, 30, 29, 37, 33, 39, 40]} stroke="white" strokeWidth={3} lineCap="round" lineJoin="round" /></>),
  },
  youAreHere: {
    id: 'youAreHere', label: 'Usted está aquí', icon: 'bi-geo-alt-fill', category: 'evacuación',
    render: () => sign('#2563eb', <><Text x={2} y={3} width={44} text="USTED ESTÁ" fill="white" fontSize={7} fontStyle="bold" align="center" /><Circle x={24} y={27} radius={9} fill="white" /><Circle x={24} y={27} radius={4} fill="#2563eb" /><Line points={[24, 36, 24, 43]} stroke="white" strokeWidth={3} lineCap="round" /></>),
  },
  stairs: {
    id: 'stairs', label: 'Escalera de emergencia', icon: 'bi-ladder', category: 'evacuación',
    render: () => sign(green, <><Text x={2} y={3} width={44} text="ESCALERA" fill="white" fontSize={7} fontStyle="bold" align="center" /><Line points={[7, 40, 15, 40, 15, 33, 23, 33, 23, 26, 31, 26, 31, 19, 40, 19]} stroke="white" strokeWidth={4} lineJoin="round" /></>),
  },
  aed: {
    id: 'aed', label: 'DEA', icon: 'bi-heart-pulse-fill', category: 'emergencia',
    render: () => sign(green, <><Text x={2} y={3} width={44} text="DEA" fill="white" fontSize={10} fontStyle="bold" align="center" /><Line points={[8, 27, 15, 27, 19, 19, 25, 37, 29, 27, 40, 27]} stroke="white" strokeWidth={3} lineJoin="round" /></>),
  },
  emergencyLight: {
    id: 'emergencyLight', label: 'Luz de emergencia', icon: 'bi-lightbulb-fill', category: 'evacuación',
    render: () => sign(green, <><Text x={2} y={3} width={44} text="LUZ" fill="white" fontSize={8} fontStyle="bold" align="center" /><Circle x={24} y={25} radius={9} stroke="white" strokeWidth={3} /><Line points={[18, 35, 30, 35, 28, 41, 20, 41, 18, 35]} fill="white" stroke="white" strokeWidth={2} /></>),
  },
  electricalHazard: {
    id: 'electricalHazard', label: 'Riesgo eléctrico', icon: 'bi-lightning-fill', category: 'riesgos',
    render: () => sign('#facc15', <><Text x={2} y={3} width={44} text="RIESGO" fill="#111827" fontSize={7} fontStyle="bold" align="center" /><Line points={[27, 13, 16, 29, 24, 29, 20, 42, 34, 23, 26, 23, 27, 13]} fill="#111827" closed /></>),
  },
  gasShutoff: {
    id: 'gasShutoff', label: 'Llave de gas', icon: 'bi-valve', category: 'riesgos',
    render: () => sign('#facc15', <><Text x={2} y={3} width={44} text="GAS" fill="#111827" fontSize={9} fontStyle="bold" align="center" /><Circle x={24} y={29} radius={8} stroke="#111827" strokeWidth={3} /><Line points={[10, 20, 38, 20, 24, 29, 24, 41]} stroke="#111827" strokeWidth={3} /></>),
  },
  cabinet: {
    id: 'cabinet', label: 'Gabinete', icon: 'bi-box-seam-fill', category: 'incendio',
    render: () => sign(red, <><Text x={2} y={3} width={44} text="GABINETE" fill="white" fontSize={7} fontStyle="bold" align="center" /><Rect x={11} y={15} width={26} height={27} stroke="white" strokeWidth={3} /><Circle x={31} y={29} radius={2} fill="white" /></>),
  },
  noElevator: {
    id: 'noElevator', label: 'No usar ascensor', icon: 'bi-slash-circle-fill', category: 'evacuación',
    render: () => sign(red, <><Text x={2} y={3} width={44} text="NO USAR" fill="white" fontSize={7} fontStyle="bold" align="center" /><Rect x={16} y={15} width={16} height={25} stroke="white" strokeWidth={2} /><Line points={[8, 10, 40, 42]} stroke="white" strokeWidth={5} /></>),
  },
};

export const getSymbolDefinition = (symbolId) => SYMBOL_DEFINITIONS[symbolId];
export const getSymbolList = () => Object.values(SYMBOL_DEFINITIONS);
export const SYMBOL_SIZE_DEFAULT = SYMBOL_SIZE;
