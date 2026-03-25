export type LengthOfStayCoxCoefficients = {
  model_type?: string
  coefficients_simple: Record<string, number>
}

export type PatientInput = {
  age: number
  tumour_volume: number
  dummies: Record<string, boolean>
}

export async function loadModelCoefficients(
  url: string
): Promise<LengthOfStayCoxCoefficients> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to load LOS coefficients: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as LengthOfStayCoxCoefficients
}

export function computeLengthOfStayRisk(
  patient: PatientInput,
  coeffs: LengthOfStayCoxCoefficients
): { eta: number; hazardRatio: number } {
  const beta = coeffs.coefficients_simple

  let eta = 0
  for (const [term, termBeta] of Object.entries(beta)) {
    if (term === 'age') {
      eta += termBeta * patient.age
    } else if (term === 'tumour_volume') {
      eta += termBeta * patient.tumour_volume
    } else {
      eta += termBeta * (patient.dummies[term] ? 1 : 0)
    }
  }

  return { eta, hazardRatio: Math.exp(eta) }
}

