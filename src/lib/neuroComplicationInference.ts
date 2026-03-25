export type NeuroComplicationCoefficients = {
  model_family?: string
  fixed_effects_simple: Record<string, number>
  random_effects: {
    // Patient-level repeated-measures random intercepts (ignored for new patients).
    id?: Array<Record<string, unknown>>
    // Complication-specific random intercepts.
    neuro_complication: Array<{
      group: string
      "(Intercept)": number
      _row?: string
    }>
  }
}

export type PatientInput = {
  age: number
  tumour_volume: number
  // Indicator variables (dummies) as booleans.
  dummies: Record<string, boolean>
}

export const POST_NEURO_OUTCOMES = [
  'post_neuro_cn_deficits',
  'post_neuro_cognition_language',
  'post_neuro_coordination',
  'post_neuro_csf_leak_brain_abscess',
  'post_neuro_hematoma_stroke',
  'post_neuro_hydrocephalus_headache',
  'post_neuro_motor_sensory',
  'post_neuro_seizure',
  'post_neuro_vision'
] as const

export type PostNeuroOutcomeKey = (typeof POST_NEURO_OUTCOMES)[number]

export const POST_NEURO_OUTCOME_LABELS: Record<PostNeuroOutcomeKey, string> = {
  post_neuro_cn_deficits: 'CN deficits',
  post_neuro_cognition_language: 'Cognition / language',
  post_neuro_coordination: 'Coordination',
  post_neuro_csf_leak_brain_abscess: 'CSF leak / brain abscess',
  post_neuro_hematoma_stroke: 'Hematoma / stroke',
  post_neuro_hydrocephalus_headache: 'Hydrocephalus / headache',
  post_neuro_motor_sensory: 'Motor / sensory',
  post_neuro_seizure: 'Seizure',
  post_neuro_vision: 'Vision'
}

export async function loadModelCoefficients(
  url: string
): Promise<NeuroComplicationCoefficients> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to load coefficients: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as NeuroComplicationCoefficients
}

function logistic(x: number): number {
  // Numerically-stable logistic.
  if (x >= 0) {
    const z = Math.exp(-x)
    return 1 / (1 + z)
  }
  const z = Math.exp(x)
  return z / (1 + z)
}

export function computeNeuroComplicationProbabilities(
  patient: PatientInput,
  coeffs: NeuroComplicationCoefficients
): Record<PostNeuroOutcomeKey, number> {
  // 1) Compute patient fixed-effects linear predictor (eta_fixed).
  const beta = coeffs.fixed_effects_simple

  let etaFixed = beta['(Intercept)'] ?? 0
  for (const [term, termBeta] of Object.entries(beta)) {
    if (term === '(Intercept)') continue
    if (term === 'age') {
      etaFixed += termBeta * patient.age
    } else if (term === 'tumour_volume') {
      etaFixed += termBeta * patient.tumour_volume
    } else {
      // Indicator/dummy covariate.
      etaFixed += termBeta * (patient.dummies[term] ? 1 : 0)
    }
  }

  // 2) Map complication random-intercept groups -> intercept estimates.
  const neuroInterceptByGroup: Partial<Record<PostNeuroOutcomeKey, number>> = {}
  for (const row of coeffs.random_effects.neuro_complication) {
    const group = row.group as PostNeuroOutcomeKey
    neuroInterceptByGroup[group] = row['(Intercept)']
  }

  // 3) Duplicate the patient row for each complication (long format),
  //    then compute per-complication probabilities.
  //    Repeated-patient random effect is forced to 0 for new patients.
  const result = {} as Record<PostNeuroOutcomeKey, number>
  for (const outcome of POST_NEURO_OUTCOMES) {
    const bNeuro = neuroInterceptByGroup[outcome] ?? 0
    const eta = etaFixed + bNeuro
    result[outcome] = logistic(eta)
  }

  return result
}

