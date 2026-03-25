// @vitest-environment node
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

import {
  computeNeuroComplicationProbabilities,
  POST_NEURO_OUTCOMES,
  type NeuroComplicationCoefficients,
  type PatientInput
} from './neuroComplicationInference'

function loadCoefficients(): NeuroComplicationCoefficients {
  const filePath = path.join(
    process.cwd(),
    'src',
    'coefficients',
    'model_coefficients.json'
  )
  const raw = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(raw) as NeuroComplicationCoefficients
}

describe('computeNeuroComplicationProbabilities', () => {
  const coeffs = loadCoefficients()

  const baseDummies = {
    'meningioma_locationSkull Base': false,
    meningioma_locationConvexity: false,
    'meningioma_gradeHigh Grade (G2+)': false,
    genderFemale: false,
    pre_asympotomaticYes: false,
    pre_headachesYes: false,
    pre_seizureYes: false,
    pre_motor_sensoryYes: false,
    pre_visionYes: false,
    pre_cognition_languageYes: false,
    pre_coordinationYes: false,
    pre_cn_deficitsYes: false
  }

  function makePatient(d: Partial<typeof baseDummies>, age: number, tumourVolume: number): PatientInput {
    return {
      age,
      tumour_volume: tumourVolume,
      dummies: { ...baseDummies, ...d }
    }
  }

  it('matches reference probabilities for sample S1', () => {
    const patient = makePatient(
      {
        'meningioma_locationSkull Base': true,
        'meningioma_gradeHigh Grade (G2+)': true,
        genderFemale: true,
        pre_headachesYes: true,
        pre_motor_sensoryYes: true
      },
      64.62388403850716,
      40
    )

    const p = computeNeuroComplicationProbabilities(patient, coeffs)

    expect(p.post_neuro_cn_deficits).toBeCloseTo(0.10176317, 5)
    expect(p.post_neuro_cognition_language).toBeCloseTo(0.08000900, 5)
    expect(p.post_neuro_motor_sensory).toBeCloseTo(0.08000900, 5)
    expect(p.post_neuro_vision).toBeCloseTo(0.07701032, 5)
    expect(p.post_neuro_seizure).toBeCloseTo(0.07110323, 5)
    expect(p.post_neuro_hematoma_stroke).toBeCloseTo(0.04112263, 5)
    expect(p.post_neuro_csf_leak_brain_abscess).toBeCloseTo(0.02924188, 5)
    expect(p.post_neuro_hydrocephalus_headache).toBeCloseTo(0.02703098, 5)
    expect(p.post_neuro_coordination).toBeCloseTo(0.02078337, 5)
  })

  it('matches reference probabilities for sample S2', () => {
    const patient = makePatient(
      {
        meningioma_locationConvexity: true,
        pre_asympotomaticYes: true,
        pre_seizureYes: true,
        pre_visionYes: true,
        pre_cognition_languageYes: true,
        pre_coordinationYes: true,
        pre_cn_deficitsYes: true
      },
      34.840414466509614,
      12.5
    )

    const p = computeNeuroComplicationProbabilities(patient, coeffs)

    expect(p.post_neuro_cn_deficits).toBeCloseTo(0.024146845, 5)
    expect(p.post_neuro_cognition_language).toBeCloseTo(0.018640584, 5)
    expect(p.post_neuro_motor_sensory).toBeCloseTo(0.018640584, 5)
    expect(p.post_neuro_vision).toBeCloseTo(0.017897204, 5)
    expect(p.post_neuro_seizure).toBeCloseTo(0.016443616, 5)
    expect(p.post_neuro_hematoma_stroke).toBeCloseTo(0.009279934, 5)
    expect(p.post_neuro_csf_leak_brain_abscess).toBeCloseTo(0.006536156, 5)
    expect(p.post_neuro_hydrocephalus_headache).toBeCloseTo(0.006031310, 5)
    expect(p.post_neuro_coordination).toBeCloseTo(0.004614289, 5)
  })

  it('returns valid probabilities for sample S3 (all dummies false)', () => {
    const patient = makePatient({}, 49.76581096277996, 20)
    const p = computeNeuroComplicationProbabilities(patient, coeffs)

    expect(p.post_neuro_cn_deficits).toBeCloseTo(0.034910866, 5)
    expect(p.post_neuro_cognition_language).toBeCloseTo(0.027018017, 5)
    expect(p.post_neuro_motor_sensory).toBeCloseTo(0.027018017, 5)
    expect(p.post_neuro_vision).toBeCloseTo(0.025949382, 5)
    expect(p.post_neuro_seizure).toBeCloseTo(0.023857694, 5)
    expect(p.post_neuro_hematoma_stroke).toBeCloseTo(0.013508421, 5)
    expect(p.post_neuro_csf_leak_brain_abscess).toBeCloseTo(0.009526437, 5)
    expect(p.post_neuro_hydrocephalus_headache).toBeCloseTo(0.008792669, 5)
    expect(p.post_neuro_coordination).toBeCloseTo(0.006731276, 5)

    for (const outcome of POST_NEURO_OUTCOMES) {
      expect(p[outcome]).toBeGreaterThanOrEqual(0)
      expect(p[outcome]).toBeLessThanOrEqual(1)
    }
  })
})

