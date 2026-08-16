import { buildTechnicalInspection, confidenceLabel } from '../inspection/technicalInspection.js';
import { hexToRgb, resolveDocumentBranding } from '../branding/brandingService.js';

const COLORS = { navy: [15, 23, 42], blue: [37, 99, 235], green: [22, 163, 74], slate: [71, 85, 105], light: [241, 245, 249], amber: [217, 119, 6] };

const equipmentLabels = {
  emergencyExit: 'Salidas de emergencia', extinguisher: 'Extintores', fireHose: 'Hidrantes', alarm: 'Alarmas de incendio',
  firstAid: 'Botiquines', aed: 'DEA', emergencyLight: 'Luces de emergencia', assemblyPoint: 'Puntos de encuentro',
  stairs: 'Señales de escalera', noElevator: 'Carteles “No usar ascensor”', electricalHazard: 'Riesgos eléctricos', gasShutoff: 'Llaves de gas', cabinet: 'Gabinetes',
};

export const absentDetectionText = (label) => `${label}: No fueron detectados en este análisis.`;
export const PRELIMINARY_DISCLAIMER = 'Documento preliminar sujeto a revisión, validación y firma de un profesional competente. La aplicación funciona como herramienta de asistencia y no reemplaza el análisis técnico ni la normativa local vigente.';
export const ADVISOR_REPORT_DISCLAIMER = 'Documento sujeto a revisión y validación profesional.';
export const buildProfessionalReportBranding = (document) => resolveDocumentBranding(document);

export const advisorReportSections = (advisor) => advisor ? {
  summary: [advisor.narrativeMode === 'assisted' && advisor.narrativeContextFingerprint === advisor.contextFingerprint ? advisor.assistedNarrative?.executiveSummary : advisor.executiveSummary?.general, ...(advisor.executiveSummary?.strengths || []).map((item) => `Fortaleza: ${item}`), ...(advisor.executiveSummary?.relevantResults || [])].filter(Boolean),
  observations: (advisor.observations || []).map((item) => `[${item.priority.toUpperCase()}] ${item.title}: ${advisor.narrativeMode === 'assisted' && advisor.narrativeContextFingerprint === advisor.contextFingerprint ? advisor.assistedNarrative?.observationNarratives?.[item.id] || item.description : item.description}`),
  recommendations: [...new Set((advisor.observations || []).filter(({ status }) => status === 'open').map((item) => advisor.narrativeMode === 'assisted' && advisor.narrativeContextFingerprint === advisor.contextFingerprint ? advisor.assistedNarrative?.recommendationNarratives?.[`recommendation-${item.id}`] || item.recommendation : item.recommendation))],
} : { summary: [], observations: [], recommendations: [] };

export const routeDescriptionText = (routeCount, exitCount) => routeCount > 0
  ? `Se registran ${exitCount} salidas señalizadas y ${routeCount} rutas principales o alternativas. Las trayectorias verdes fueron calculadas evitando paredes y obstáculos detectados, priorizando salidas con menor exposición al riesgo.`
  : `Se registran ${exitCount} salidas señalizadas. No se generaron rutas automáticas.`;

export const generateProfessionalReport = async ({ document, inspection, planImage, metadata, download = true }) => {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const pageWidth = 210; const pageHeight = 297; const margin = 18; const contentWidth = pageWidth - margin * 2;
  let y = 20; let pageNumber = 1;
  const symbols = document.elements.filter((element) => element.type === 'symbol');
  const count = (id) => symbols.filter((element) => element.symbolId === id).length;
  const analysis = document.buildingAnalysis || {};
  const profile = document.establishmentProfile || {};
  const regulatory = document.regulatoryAnalysis || {};
  const advisor = document.advisorAnalysis || null;
  const advisorSections = advisorReportSections(advisor);
  const branding = buildProfessionalReportBranding(document);
  const reportColors = branding.enabled ? { ...COLORS, navy: hexToRgb(branding.colors.primary), blue: hexToRgb(branding.colors.secondary, COLORS.blue) } : COLORS;
  const acceptedElements = document.elements.filter((element) => element.aiGenerated && (element.status === 'confirmed' || element.proposalAccepted));
  const technicalInspection = buildTechnicalInspection(analysis);
  const analysisConfidence = confidenceLabel(technicalInspection?.confidence);
  const analysisWarnings = Array.isArray(analysis.warnings) ? analysis.warnings : [];
  const inspectionWarnings = inspection.warnings.filter((item) => !item.ok).map((item) => `${item.label}: ${item.count}`);
  const warnings = [...analysisWarnings, ...inspectionWarnings];

  const addBrandImage = (asset, x, imageY, width, height) => { if (!asset?.dataUrl) return false; try { const format = asset.mimeType === 'image/jpeg' ? 'JPEG' : asset.mimeType === 'image/webp' ? 'WEBP' : 'PNG'; pdf.addImage(asset.dataUrl, format, x, imageY, width, height, undefined, 'FAST'); return true; } catch { return false; } };
  const header = () => {
    if (!branding.enabled) return;
    pdf.setDrawColor(...reportColors.blue); pdf.line(margin, 15, pageWidth - margin, 15);
    addBrandImage(branding.logo, margin, 5, 20, 8);
    pdf.setFontSize(8); pdf.setTextColor(...reportColors.navy); pdf.text(branding.template.headerText || branding.template.companyName || '', branding.logo?.dataUrl ? margin + 24 : margin, 11);
    y = 23;
  };
  const footer = () => {
    pdf.setDrawColor(...COLORS.light); pdf.line(margin, 282, pageWidth - margin, 282);
    pdf.setFontSize(8); pdf.setTextColor(...COLORS.slate);
    pdf.text(branding.enabled ? branding.template.footerText || branding.template.companyName || 'Informe técnico' : 'INTELI -SAFE · Informe técnico de evacuación', margin, 288);
    if (!branding.enabled || branding.template.showPageNumber) pdf.text(`Página ${pageNumber}`, pageWidth - margin, 288, { align: 'right' });
    if (branding.enabled && branding.template.showGeneratedDate) pdf.text(metadata.date || new Date().toLocaleDateString('es-AR'), pageWidth / 2, 288, { align: 'center' });
  };
  const newPage = () => { footer(); pdf.addPage(); pageNumber += 1; y = 20; header(); };
  const ensure = (height) => { if (y + height > 276) newPage(); };
  const title = (text) => { ensure(18); pdf.setFillColor(...reportColors.navy); pdf.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F'); pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.text(text, margin + 5, y + 8); y += 18; };
  const paragraph = (text) => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(...COLORS.slate); const lines = pdf.splitTextToSize(text, contentWidth); ensure(lines.length * 5 + 3); pdf.text(lines, margin, y); y += lines.length * 5 + 5; };
  const bulletList = (items) => items.forEach((item) => { ensure(7); pdf.setFillColor(...reportColors.blue); pdf.circle(margin + 2, y - 1, 1, 'F'); const lines = pdf.splitTextToSize(item, contentWidth - 8); pdf.setFontSize(9.5); pdf.setTextColor(...COLORS.slate); pdf.text(lines, margin + 7, y); y += lines.length * 4.5 + 2; });

  // Portada
  pdf.setFillColor(...reportColors.navy); pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  pdf.setFillColor(...reportColors.blue); pdf.rect(0, 0, 8, pageHeight, 'F');
  pdf.setTextColor(147, 197, 253); pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.text(branding.enabled ? branding.template.companyName || branding.template.legalName || 'INFORME PROFESIONAL' : 'INTELI -SAFE', 24, 38);
  if (branding.enabled) addBrandImage(branding.logo, pageWidth - 68, 24, 44, 22);
  pdf.setTextColor(255, 255, 255); pdf.setFontSize(29); pdf.text('PLAN DE', 24, 74); pdf.text('EVACUACIÓN', 24, 88);
  pdf.setDrawColor(59, 130, 246); pdf.setLineWidth(1.2); pdf.line(24, 101, 95, 101);
  pdf.setFontSize(16); pdf.text(metadata.projectName || 'Proyecto sin nombre', 24, 122);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(11); pdf.setTextColor(203, 213, 225);
  pdf.text(`Cliente: ${metadata.clientName || 'No especificado'}`, 24, 137);
  pdf.text(`Ubicación: ${metadata.location || 'No especificada'}`, 24, 145);
  pdf.text(`Fecha: ${metadata.date}`, 24, 153);
  pdf.setFillColor(30, 41, 59); pdf.roundedRect(24, 194, 74, 36, 3, 3, 'F');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(25); pdf.setTextColor(...COLORS.green); pdf.text(`${inspection.percentage}%`, 34, 212);
  pdf.setFontSize(9); pdf.setTextColor(203, 213, 225); pdf.text('COBERTURA TÉCNICA ESTIMADA', 34, 221);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.text(branding.enabled ? branding.template.footerText || branding.template.website || 'Documento profesional' : 'Documento generado por Inteli -Safe', 24, 270);

  // Plano
  pdf.addPage(); pageNumber += 1; y = 20; header(); title('PLANO DE EVACUACIÓN');
  if (planImage) {
    const props = pdf.getImageProperties(planImage); const maxH = 205;
    const ratio = Math.min(contentWidth / props.width, maxH / props.height);
    const width = props.width * ratio; const height = props.height * ratio;
    pdf.setDrawColor(203, 213, 225); pdf.rect(margin - 1, y - 1, width + 2, height + 2);
    pdf.addImage(planImage, 'PNG', margin, y, width, height, undefined, 'FAST'); y += height + 9;
  } else paragraph('No fue posible obtener una captura del lienzo.');
  paragraph(inspection.summary?.routes
    ? `Resumen: ${inspection.summary.routes} rutas calculadas, ${inspection.summary?.sectors || 0} sectores evaluados y ${inspection.summary?.risks || 0} riesgos señalizados.`
    : `Resumen: No se generaron rutas automáticas. Se evaluaron ${inspection.summary?.sectors || 0} sectores y se señalaron ${inspection.summary?.risks || 0} riesgos.`);

  title('RESUMEN TÉCNICO');
  bulletList([
    `${analysis.rooms?.length || 0} ambientes, ${analysis.doors?.length || 0} puertas, ${analysis.corridors?.length || 0} pasillos y ${analysis.stairs?.length || 0} escaleras detectadas.`,
    `${count('emergencyExit')} salidas señalizadas, ${inspection.summary?.routes || 0} rutas y ${inspection.summary?.signage || 0} elementos de señalización incorporados.`,
    `${inspection.summary?.equipment || 0} elementos de equipamiento y ${inspection.summary?.sectorsWithoutRoute || 0} sectores sin ruta.`,
    `Nivel de confianza del análisis: ${analysisConfidence}.`,
  ]);

  title('DATOS DEL ESTABLECIMIENTO Y JURISDICCIÓN');
  bulletList([
    `Establecimiento: ${profile.name || 'No informado'}.`,
    `Domicilio: ${profile.address || metadata.location || 'No informado'}.`,
    `Jurisdicción: ${profile.country || 'No informada'} · ${profile.province || 'No informada'} · ${profile.municipality || 'No informado'}.`,
    `Actividad y tipo: ${profile.activity || 'No informada'} · ${profile.establishmentType || 'No informado'}.`,
    `Edificio: ${profile.buildingStatus === 'new' ? 'nuevo' : profile.buildingStatus === 'existing' ? 'existente' : 'condición no informada'}; uso: ${profile.buildingUse || 'No informado'}.`,
    `Superficie: ${profile.totalCoveredAreaM2 ?? profile.coveredArea ?? 'No informada'} m²; plantas: ${profile.numberOfFloors ?? profile.floorCount ?? 'No informadas'}; ocupación máxima: ${profile.maximumOccupancy ?? profile.maxOccupants ?? 'No informada'}.`,
    `Riesgo declarado: ${profile.riskClassification?.value || 'No informado'}; confirmación profesional: ${profile.riskClassification?.confirmedByProfessional ? 'sí' : 'no'}.`,
    `Protección contra incendio declarada: extintores ${profile.fireProtection?.extinguishers?.present === null || profile.fireProtection?.extinguishers?.present === undefined ? 'no informado' : profile.fireProtection.extinguishers.present ? 'presentes' : 'ausentes'}, hidrantes ${profile.fireProtection?.hydrants?.present === null || profile.fireProtection?.hydrants?.present === undefined ? 'no informado' : profile.fireProtection.hydrants.present ? 'presentes' : 'ausentes'}.`,
    `Medios de escape declarados: ${profile.egress?.exitCount ?? 'cantidad de salidas no informada'}; salidas de emergencia: ${profile.egress?.emergencyExitCount ?? 'no informadas'}.`,
    `Profesional responsable: ${branding.template?.professionalName || profile.responsibleProfessional || 'No informado'}${branding.template?.professionalLicense ? ` · Matrícula: ${branding.template.professionalLicense}` : ''}; fecha de revisión: ${metadata.date || 'No informada'}.`,
  ]);
  title('NORMATIVA TOMADA COMO REFERENCIA');
  bulletList(regulatory.applicableRules?.length
    ? regulatory.applicableRules.map((rule) => `${rule.source} — ${rule.sourceSection}: ${rule.title}. Regla ${rule.id}, versión ${rule.ruleVersion || regulatory.engineVersion || 'no informada'}.`)
    : ['No se ejecutó una revisión normativa estructurada o no existen reglas configuradas para el perfil declarado.']);
  title('RESUMEN EJECUTIVO — INTELI ADVISOR');
  bulletList(advisorSections.summary.length ? advisorSections.summary : ['No se ejecutó un análisis técnico de Advisor para esta versión del proyecto.']);
  title('OBSERVACIONES DE INTELI ADVISOR');
  bulletList(advisorSections.observations.length ? advisorSections.observations : ['No existen observaciones de Advisor guardadas.']);
  title('RECOMENDACIONES DE INTELI ADVISOR');
  bulletList(advisorSections.recommendations.length ? advisorSections.recommendations : ['No existen recomendaciones de Advisor guardadas.']);
  paragraph(ADVISOR_REPORT_DISCLAIMER);
  title('INFORMACIÓN DECLARADA');
  bulletList(Object.entries(profile).length ? Object.entries(profile).filter(([key]) => key !== 'fieldMetadata').map(([key, value]) => `${key}: ${value === '' || value === null || value === undefined ? 'No informado' : typeof value === 'object' ? JSON.stringify(value) : String(value)}`) : ['No se aportó un perfil del establecimiento.']);
  title('ELEMENTOS DETECTADOS Y PROPUESTOS');
  bulletList([
    `Elementos detectados por IA: ${regulatory.detectedElements?.length ?? Object.values(analysis).filter(Array.isArray).reduce((total, items) => total + items.length, 0)}.`,
    `Elementos propuestos registrados: ${regulatory.proposedElements?.length || 0}.`,
    `Recomendaciones aceptadas e incorporadas al plano: ${acceptedElements.length}.`,
  ]);
  title('PUNTOS NO VERIFICABLES');
  const notVerifiable = regulatory.complianceChecks?.filter((check) => check.result === 'not_verifiable') || [];
  bulletList(notVerifiable.length ? notVerifiable.map((check) => `${check.title}: ${check.observations} ${check.recommendedAction}`) : ['No se registró una revisión normativa estructurada; el cumplimiento no puede inferirse del plano.']);

  title('1. OBJETIVO');
  paragraph('Establecer una representación clara de los medios de escape, la señalización y el equipamiento de emergencia del establecimiento, facilitando una evacuación ordenada y segura ante una contingencia.');
  title('2. DESCRIPCIÓN');
  paragraph(`El plano analizado contiene ${document.buildingAnalysis?.rooms?.length || 0} ambientes, ${document.buildingAnalysis?.corridors?.length || 0} pasillos, ${document.buildingAnalysis?.doors?.length || 0} puertas y ${document.buildingAnalysis?.stairs?.length || 0} escaleras detectadas. La geometría fue interpretada mediante análisis asistido y debe verificarse en campo.`);
  title('3. EVALUACIÓN DE RIESGOS');
  bulletList([
    `${inspection.summary?.risks || 0} riesgos o puntos sensibles identificados en el plano.`,
    inspection.summary?.routes
      ? `${inspection.warnings.find((item) => item.id === 'long-routes')?.count || 0} recorridos principales con distancia relativa elevada.`
      : 'No se generaron rutas automáticas para evaluar distancias de recorrido.',
    'Verificar periódicamente que circulaciones, puertas y salidas permanezcan libres de obstrucciones.',
  ]);
  title('4. MEDIOS DE ESCAPE');
  paragraph(routeDescriptionText(inspection.summary?.routes || 0, count('emergencyExit')));

  title('5. EQUIPAMIENTO');
  Object.entries(equipmentLabels).forEach(([id, label]) => { ensure(7); const quantity = count(id); pdf.setFontSize(9.5); pdf.setTextColor(...COLORS.slate); pdf.text(label, margin, y); pdf.setFont('helvetica', 'bold'); pdf.text(String(quantity), pageWidth - margin, y, { align: 'right' }); pdf.setFont('helvetica', 'normal'); y += 6; });
  if (!count('aed')) paragraph(absentDetectionText('DEA'));
  if (!count('fireHose')) paragraph(absentDetectionText('Hidrantes'));
  title('6. EXTINTORES'); paragraph(count('extinguisher') ? `Cantidad indicada: ${count('extinguisher')}. Mantener accesibilidad, identificación visible, control periódico y ubicación acorde al riesgo específico del sector.` : absentDetectionText('Extintores'));
  title('7. ALARMAS'); paragraph(count('alarm') ? `Cantidad indicada: ${count('alarm')}. Comprobar audibilidad, alimentación, señalización y funcionamiento mediante pruebas documentadas.` : absentDetectionText('Alarmas'));
  title('8. BOTIQUINES'); paragraph(count('firstAid') ? `Cantidad indicada: ${count('firstAid')}. Mantenerlos señalizados, accesibles, inventariados y con insumos vigentes.` : absentDetectionText('Botiquines'));
  title('9. PROCEDIMIENTO DE EVACUACIÓN');
  bulletList(['Conservar la calma y activar el sistema de alarma.', inspection.summary?.routes ? 'Interrumpir tareas y dirigirse a la salida segura siguiendo las flechas verdes.' : 'Interrumpir tareas y dirigirse a una salida segura siguiendo las indicaciones del responsable de evacuación.', 'No utilizar ascensores ni regresar por objetos personales.', 'Asistir a personas que requieran apoyo sin exponerse al riesgo.', 'Concentrarse en el punto de encuentro y realizar el recuento.', 'No reingresar hasta recibir autorización de la autoridad responsable.']);
  title('10. FUNCIONES DEL BRIGADISTA');
  bulletList(['Evaluar la situación y comunicar la emergencia.', 'Guiar a los ocupantes por las rutas habilitadas.', 'Verificar sectores asignados sin demorar la salida.', 'Cerrar puertas cuando resulte seguro y evitar la propagación.', 'Informar novedades en el punto de encuentro.', 'Coordinar con servicios externos y responsables del establecimiento.']);
  title('11. RECOMENDACIONES');
  bulletList(['Validar físicamente todas las ubicaciones propuestas.', 'Mantener señalización visible aun con iluminación reducida.', 'Realizar simulacros periódicos y registrar oportunidades de mejora.', 'Actualizar el plano ante cambios de distribución, uso u ocupación.', 'Solicitar revisión de un profesional competente y de la autoridad local aplicable.']);
  title('12. CONCLUSIONES');
  paragraph(`El indicador de cobertura técnica es ${inspection.percentage}%. No representa aprobación ni cumplimiento legal. ${inspection.percentage >= 85 ? 'La cobertura gráfica es alta, pero continúa sujeta a verificación profesional y normativa.' : 'Deben atenderse las observaciones antes de cualquier presentación profesional.'}`);
  title('13. CHECKLIST');
  [...inspection.positiveChecks, ...inspection.warnings].forEach((item) => { ensure(7); pdf.setTextColor(...(item.ok ? COLORS.green : COLORS.amber)); pdf.setFont('helvetica', 'bold'); pdf.text(item.ok ? '✓' : '!', margin, y); pdf.setTextColor(...COLORS.slate); pdf.setFont('helvetica', 'normal'); pdf.text(`${item.label}: ${item.count}`, margin + 7, y); y += 6; });
  title('14. OBSERVACIONES');
  const observations = warnings;
  bulletList(observations.length ? observations : ['No se registraron observaciones automáticas adicionales.']);
  title('15. ADVERTENCIAS');
  bulletList(warnings.length ? warnings : ['El análisis no informó advertencias automáticas.']);
  title('16. NIVEL DE CONFIANZA');
  paragraph(`Nivel de confianza general: ${analysisConfidence}. Este valor representa la confianza promedio de las detecciones informadas por el análisis y no reemplaza la verificación profesional en campo.`);
  title('17. EXPLICACIÓN DEL ANÁLISIS');
  paragraph(analysis.summary || 'El análisis interpretó la geometría visible del plano y clasificó ambientes, circulaciones, aberturas, escaleras, salidas y riesgos cuando existía evidencia suficiente. Los resultados no detectados permanecen informados como ausentes y no se presumen existentes.');
  title('18. REVISIÓN PROFESIONAL');
  paragraph(`Profesional responsable: ${branding.template?.professionalName || profile.responsibleProfessional || 'No informado'}${branding.template?.professionalLicense ? `. Matrícula: ${branding.template.professionalLicense}` : ''}. Fecha de revisión declarada: ${metadata.date || 'No informada'}. Estado: requiere revisión profesional.`);
  if (branding.enabled && branding.template.showProfessionalSignature) { ensure(32); const signatureY = y; addBrandImage(branding.signature, margin, signatureY, 42, 18); addBrandImage(branding.stamp, margin + 48, signatureY, 24, 24); y += 27; }
  paragraph(PRELIMINARY_DISCLAIMER);
  footer();
  if (download) pdf.save(`informe-evacuacion-${(metadata.projectName || 'proyecto').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
  return pdf;
};
