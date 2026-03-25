export type NonNeuroComplicationCoefficients = {
  model_family?: string
  fixed_effects_simple: Record<string, number>
  random_effects?: {
    // Repeated-patient random intercepts; ignored for new-patient inference.
    id?: Array<Record<string, unknown>>
  }
}

export type PatientInput = {
  age: number
  tumour_volume: number
  dummies: Record<string, boolean>
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

export function computeNonNeuroComplicationProbability(
  patient: PatientInput,
  coeffs: NonNeuroComplicationCoefficients
): number {
  // No mixed effects in inference: repeated-patient random intercept is forced to 0.
  const beta = coeffs.fixed_effects_simple

  let eta =
    (beta['(Intercept)'] ?? 0) +
    (beta['age'] ?? 0) * patient.age +
    (beta['tumour_volume'] ?? 0) * patient.tumour_volume

  for (const [term, termBeta] of Object.entries(beta)) {
    if (term === '(Intercept)' || term === 'age' || term === 'tumour_volume') continue
    eta += termBeta * (patient.dummies[term] ? 1 : 0)
  }

  return logistic(eta)
}

export async function loadModelCoefficients(
  url: string
): Promise<NonNeuroComplicationCoefficients> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to load coefficients: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as NonNeuroComplicationCoefficients
}

