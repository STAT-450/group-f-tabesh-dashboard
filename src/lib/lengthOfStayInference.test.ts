// @vitest-environment node
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

import {
  computeLengthOfStayRisk,
  type LengthOfStayCoxCoefficients,
  type PatientInput
} from './lengthOfStayInference'

function loadCoefficients(): LengthOfStayCoxCoefficients {
  const filePath = path.join(
    process.cwd(),
    'src',
    'coefficients',
    'model3_coefficients.json'
  )
  const raw = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(raw) as LengthOfStayCoxCoefficients
}

describe('computeLengthOfStayRisk', () => {
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

  it('matches reference eta/HR for sample S1', () => {
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
    const out = computeLengthOfStayRisk(patient, coeffs)
    expect(out.eta).toBeCloseTo(-2.5702245560779633, 12)
    expect(out.hazardRatio).toBeCloseTo(0.07651836083153087, 12)
  })

  it('matches reference eta/HR for sample S2', () => {
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
    const out = computeLengthOfStayRisk(patient, coeffs)
    expect(out.eta).toBeCloseTo(-1.1589114498364192, 12)
    expect(out.hazardRatio).toBeCloseTo(0.3138276121148826, 12)
  })

  it('matches reference eta/HR for sample S3', () => {
    const patient = makePatient({}, 49.76581096277996, 20)
    const out = computeLengthOfStayRisk(patient, coeffs)
    expect(out.eta).toBeCloseTo(-1.324660489951383, 12)
    expect(out.hazardRatio).toBeCloseTo(0.26589321718538783, 12)
  })
})

