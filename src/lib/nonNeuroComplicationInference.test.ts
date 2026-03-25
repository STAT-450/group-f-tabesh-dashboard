// @vitest-environment node
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

import {
  computeNonNeuroComplicationProbability,
  type NonNeuroComplicationCoefficients,
  type PatientInput
} from './nonNeuroComplicationInference'

function loadCoefficients(): NonNeuroComplicationCoefficients {
  const filePath = path.join(
    process.cwd(),
    'src',
    'coefficients',
    'model2_coefficients.json'
  )
  const raw = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(raw) as NonNeuroComplicationCoefficients
}

describe('computeNonNeuroComplicationProbability', () => {
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

  it('matches reference probability for sample S1', () => {
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

    const p = computeNonNeuroComplicationProbability(patient, coeffs)
    expect(p).toBeCloseTo(0.19849763879186075, 12)
  })

  it('matches reference probability for sample S2', () => {
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

    const p = computeNonNeuroComplicationProbability(patient, coeffs)
    expect(p).toBeCloseTo(0.12079937300276912, 12)
  })

  it('matches reference probability for sample S3 (all dummies false)', () => {
    const patient = makePatient({}, 49.76581096277996, 20)
    const p = computeNonNeuroComplicationProbability(patient, coeffs)
    expect(p).toBeCloseTo(0.04311351636773873, 12)
  })
})

