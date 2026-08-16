import { useEffect, useState } from 'react';
import { createEstablishmentProfile, getMissingProfileInformation, updateFieldMetadata } from '../establishment/establishmentProfile';
import { evaluateProfileCompleteness } from '../establishment/profileCompleteness';

const STATUS_LABELS = { professional: 'Dato confirmado', user: 'Dato declarado', ai: 'Dato detectado por IA', calculated: 'Dato calculado', unknown: 'No informado' };
const nullableBooleanOptions = [['', 'No informado'], ['true', 'Sí'], ['false', 'No']];
const numberValue = (value) => value === '' ? null : Number(value);

const EstablishmentDataForm = ({ value, onSave }) => {
  const [profile, setProfile] = useState(() => createEstablishmentProfile(value));
  useEffect(() => setProfile(createEstablishmentProfile(value)), [value]);
  const missing = getMissingProfileInformation(profile);
  const completeness = evaluateProfileCompleteness(profile);
  const update = (key, nextValue, critical = false) => setProfile((current) => ({
    ...current, [key]: nextValue,
    ...(critical ? { fieldMetadata: { ...current.fieldMetadata, [key]: updateFieldMetadata(current, key, nextValue) } } : {}),
  }));
  const updateNested = (group, key, nextValue, metadataKey = null) => setProfile((current) => ({
    ...current, [group]: { ...current[group], [key]: nextValue },
    ...(metadataKey ? { fieldMetadata: { ...current.fieldMetadata, [metadataKey]: updateFieldMetadata(current, metadataKey, nextValue) } } : {}),
  }));
  const updateProtectionCount = (key, field, nextValue) => setProfile((current) => ({
    ...current,
    fireProtection: { ...current.fireProtection, [key]: { ...current.fireProtection[key], [field]: nextValue } },
    fieldMetadata: { ...current.fieldMetadata, fireProtection: updateFieldMetadata(current, 'fireProtection', { ...current.fireProtection, [key]: { ...current.fireProtection[key], [field]: nextValue } }) },
  }));
  const status = (key) => {
    const item = profile.fieldMetadata?.[key];
    return item?.confirmed || item?.source === 'professional' ? STATUS_LABELS.professional : STATUS_LABELS[item?.source] || STATUS_LABELS.unknown;
  };
  const metadataControl = (key) => <select aria-label={`Procedencia de ${key}`} value={profile.fieldMetadata?.[key]?.source || 'unknown'} onChange={(event) => setProfile((current) => ({ ...current, fieldMetadata: { ...current.fieldMetadata, [key]: updateFieldMetadata(current, key, key === 'exitCount' ? current.egress?.exitCount : key === 'fireProtection' ? current.fireProtection : current[key], { source: event.target.value, confirmed: event.target.value === 'professional' }) } }))}><option value="unknown">No informado</option><option value="user">Dato declarado</option><option value="professional">Dato confirmado</option><option value="ai">Dato detectado por IA</option><option value="calculated">Dato calculado</option></select>;
  const field = ({ key, label, type = 'text', critical = false, options }) => <label key={key}><span>{label}{critical && <small>Crítico · {status(key)}</small>}</span>{options
    ? <select value={profile[key] ?? ''} onChange={(event) => update(key, event.target.value || null, critical)}>{options.map(([optionValue, optionLabel]) => <option key={String(optionValue)} value={optionValue}>{optionLabel}</option>)}</select>
    : <input type={type} min={type === 'number' ? 0 : undefined} value={profile[key] ?? ''} onChange={(event) => update(key, type === 'number' ? numberValue(event.target.value) : event.target.value, critical)} />}{critical && metadataControl(key)}</label>;
  const boolField = (group, key, label, metadataKey = null) => <label key={`${group}-${key}`}><span>{label}{metadataKey && <small>{status(metadataKey)}</small>}</span><select value={profile[group]?.[key] === null || profile[group]?.[key] === undefined ? '' : String(profile[group][key])} onChange={(event) => updateNested(group, key, event.target.value === '' ? null : event.target.value === 'true', metadataKey)}>{nullableBooleanOptions.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;

  return <section className="establishment-form">
    <div className="proposal-preview-toolbar"><strong>Perfil técnico del establecimiento</strong><small>Calidad de información: {completeness.score}% · no representa cumplimiento legal.</small></div>
    <fieldset><legend>Datos generales</legend><div className="establishment-grid">
      {field({ key: 'name', label: 'Nombre' })}{field({ key: 'address', label: 'Domicilio' })}{field({ key: 'country', label: 'País' })}{field({ key: 'province', label: 'Provincia' })}{field({ key: 'municipality', label: 'Municipio' })}{field({ key: 'activity', label: 'Actividad' })}{field({ key: 'establishmentType', label: 'Tipo de establecimiento' })}
    </div></fieldset>
    <fieldset><legend>Edificio</legend><div className="establishment-grid">
      {field({ key: 'buildingStatus', label: 'Condición', critical: true, options: [['unknown', 'No informado'], ['new', 'Nuevo'], ['existing', 'Existente']] })}{field({ key: 'buildingUse', label: 'Uso del edificio', critical: true })}{field({ key: 'mainActivity', label: 'Actividad principal' })}{field({ key: 'numberOfFloors', label: 'Cantidad de plantas', type: 'number', critical: true })}{field({ key: 'totalCoveredAreaM2', label: 'Superficie cubierta (m²)', type: 'number', critical: true })}
      <label><span>¿Tiene subsuelo?</span><select value={profile.hasBasement === null ? '' : String(profile.hasBasement)} onChange={(event) => update('hasBasement', event.target.value === '' ? null : event.target.value === 'true')}>{nullableBooleanOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label><span>¿Tiene entrepiso?</span><select value={profile.hasMezzanine === null ? '' : String(profile.hasMezzanine)} onChange={(event) => update('hasMezzanine', event.target.value === '' ? null : event.target.value === 'true')}>{nullableBooleanOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
    </div></fieldset>
    <fieldset><legend>Ocupación</legend><div className="establishment-grid">{field({ key: 'maximumOccupancy', label: 'Ocupación máxima', type: 'number', critical: true })}{field({ key: 'usualOccupancy', label: 'Ocupación habitual', type: 'number' })}</div></fieldset>
    <fieldset><legend>Riesgo</legend><div className="establishment-grid">
      <label><span>Clasificación <small>{profile.riskClassification.confirmedByProfessional ? STATUS_LABELS.professional : profile.riskClassification.value ? STATUS_LABELS.user : STATUS_LABELS.unknown}</small></span><input value={profile.riskClassification.value ?? ''} onChange={(event) => setProfile((current) => ({ ...current, riskClassification: { ...current.riskClassification, value: event.target.value || null, source: event.target.value ? 'manual' : 'unknown', confirmedByProfessional: false }, fieldMetadata: { ...current.fieldMetadata, riskClassification: updateFieldMetadata(current, 'riskClassification', event.target.value || null) } }))} /></label>
      <label><span>Notas</span><input value={profile.riskClassification.notes || ''} onChange={(event) => setProfile((current) => ({ ...current, riskClassification: { ...current.riskClassification, notes: event.target.value } }))} /></label>
      <label className="establishment-check"><input type="checkbox" checked={profile.riskClassification.confirmedByProfessional} onChange={(event) => setProfile((current) => ({ ...current, riskClassification: { ...current.riskClassification, confirmedByProfessional: event.target.checked, source: event.target.checked ? 'manual' : current.riskClassification.source }, fieldMetadata: { ...current.fieldMetadata, riskClassification: updateFieldMetadata(current, 'riskClassification', current.riskClassification.value, { source: event.target.checked ? 'professional' : 'user', confirmed: event.target.checked }) } }))} /> Confirmado por profesional</label>
    </div></fieldset>
    <fieldset><legend>Protección contra incendio</legend><div className="establishment-grid">
      <div><small>Procedencia de los datos de protección</small>{metadataControl('fireProtection')}</div>
      {['extinguishers', 'hydrants'].flatMap((key) => [<label key={`${key}-present`}><span>{key === 'extinguishers' ? 'Extintores presentes' : 'Hidrantes presentes'} <small>{status('fireProtection')}</small></span><select value={profile.fireProtection[key].present === null ? '' : String(profile.fireProtection[key].present)} onChange={(event) => updateProtectionCount(key, 'present', event.target.value === '' ? null : event.target.value === 'true')}>{nullableBooleanOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>, <label key={`${key}-count`}><span>Cantidad de {key === 'extinguishers' ? 'extintores' : 'hidrantes'}</span><input type="number" min="0" value={profile.fireProtection[key].count ?? ''} onChange={(event) => updateProtectionCount(key, 'count', numberValue(event.target.value))} /></label>])}
      {['automaticDetection', 'manualAlarm', 'sprinklers', 'emergencyLighting', 'emergencySignage'].map((key) => boolField('fireProtection', key, { automaticDetection: 'Detección automática', manualAlarm: 'Alarma manual', sprinklers: 'Rociadores', emergencyLighting: 'Iluminación de emergencia', emergencySignage: 'Señalización de emergencia' }[key], 'fireProtection'))}
    </div></fieldset>
    <fieldset><legend>Medios de escape</legend><div className="establishment-grid">
      {[['exitCount', 'Cantidad de salidas'], ['emergencyExitCount', 'Salidas de emergencia'], ['stairCount', 'Cantidad de escaleras']].map(([key, label]) => <label key={key}><span>{label}{key === 'exitCount' && <small>{status('exitCount')}</small>}</span><input type="number" min="0" value={profile.egress[key] ?? ''} onChange={(event) => updateNested('egress', key, numberValue(event.target.value), key === 'exitCount' ? 'exitCount' : null)} /></label>)}
      {boolField('egress', 'protectedStairs', 'Escaleras protegidas')}{boolField('egress', 'alternativeRoutes', 'Rutas alternativas')}
      <div><small>Procedencia de cantidad de salidas</small>{metadataControl('exitCount')}</div>
    </div></fieldset>
    {missing.length > 0 && <small className="text-warning">Faltan datos generales: {missing.map(({ label }) => label).join(', ')}.</small>}
    <div className="mt-2"><button type="button" className="btn btn-sm btn-primary" onClick={() => onSave(profile)}>Guardar perfil</button></div>
  </section>;
};

export default EstablishmentDataForm;
