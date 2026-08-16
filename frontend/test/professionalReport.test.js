import test from 'node:test';
import assert from 'node:assert/strict';
import { absentDetectionText, ADVISOR_REPORT_DISCLAIMER, advisorReportSections, buildProfessionalReportBranding, generateProfessionalReport, PRELIMINARY_DISCLAIMER, routeDescriptionText } from '../src/editor/report/professionalReport.js';

test('el informe no afirma que existan trayectorias cuando no hay rutas', () => {
  const text = routeDescriptionText(0, 2);
  assert.equal(text, 'Se registran 2 salidas señalizadas. No se generaron rutas automáticas.');
  assert.equal(text.includes('trayectorias verdes'), false);
});

test('incluye resumen, observaciones y recomendaciones guardadas de Advisor', () => {
  const sections = advisorReportSections({ executiveSummary: { general: 'Resumen técnico.', strengths: ['Escala calibrada.'], relevantResults: ['10 evacuados.'] }, observations: [{ priority: 'high', title: 'Dato pendiente', description: 'Falta confirmar.', recommendation: 'Confirmar el dato.', status: 'open' }] });
  assert.deepEqual(sections.summary, ['Resumen técnico.', 'Fortaleza: Escala calibrada.', '10 evacuados.']);
  assert.match(sections.observations[0], /Dato pendiente/);
  assert.deepEqual(sections.recommendations, ['Confirmar el dato.']);
  assert.equal(ADVISOR_REPORT_DISCLAIMER, 'Documento sujeto a revisión y validación profesional.');
});

test('incluye la advertencia profesional obligatoria sin afirmar aprobación', () => {
  assert.match(PRELIMINARY_DISCLAIMER, /Documento preliminar sujeto a revisión/);
  assert.match(PRELIMINARY_DISCLAIMER, /no reemplaza el análisis técnico/);
  assert.equal(PRELIMINARY_DISCLAIMER.includes('Aprobado'), false);
});

test('el informe identifica explícitamente el equipamiento no detectado', () => {
  assert.equal(absentDetectionText('Extintores'), 'Extintores: No fueron detectados en este análisis.');
});

test('generación de informe resuelve plantilla seleccionada y conserva fallback', () => {
  assert.equal(buildProfessionalReportBranding({}).enabled, false);
  const branded = buildProfessionalReportBranding({ corporateTemplates: [{ id: 't1', companyName: 'Empresa', primaryColor: '#112233' }], selectedCorporateTemplateId: 't1', corporateAssets: {} });
  assert.equal(branded.enabled, true); assert.equal(branded.template.companyName, 'Empresa'); assert.equal(branded.colors.primary, '#112233');
});

test('genera un PDF real en memoria con plantilla corporativa', async () => {
  const document = { elements: [], buildingAnalysis: {}, establishmentProfile: {}, regulatoryAnalysis: {}, corporateTemplates: [{ id: 't1', companyName: 'Empresa QA', professionalName: 'Profesional QA', primaryColor: '#112233', secondaryColor: '#445566', showPageNumber: true, showGeneratedDate: true, showProfessionalSignature: true }], selectedCorporateTemplateId: 't1', corporateAssets: {} };
  const inspection = { percentage: 0, summary: {}, warnings: [], positiveChecks: [] };
  const pdf = await generateProfessionalReport({ document, inspection, planImage: null, metadata: { projectName: 'Prueba', clientName: '', location: '', date: '07/08/2026' }, download: false });
  assert.ok(pdf.getNumberOfPages() >= 2);
  assert.ok(pdf.output('arraybuffer').byteLength > 1000);
});
