import { useEffect, useMemo, useState } from 'react'
import {
  POST_NEURO_OUTCOME_LABELS,
  POST_NEURO_OUTCOMES,
  type NeuroComplicationCoefficients,
  computeNeuroComplicationProbabilities,
  loadModelCoefficients,
  type PatientInput
} from '../lib/neuroComplicationInference'
import {
  computeNonNeuroComplicationProbability,
  loadModelCoefficients as loadNonNeuroModelCoefficients,
  type NonNeuroComplicationCoefficients
} from '../lib/nonNeuroComplicationInference'
import {
  computeLengthOfStayRisk,
  loadModelCoefficients as loadLosModelCoefficients,
  type LengthOfStayCoxCoefficients
} from '../lib/lengthOfStayInference'
import './NeuroComplicationDashboard.css'

function humanizeDummyKey(key: string): string {
  const map: Record<string, string> = {
    'meningioma_locationSkull Base': 'Meningioma location: Skull Base',
    'meningioma_locationConvexity': 'Meningioma location: Convexity',
    'meningioma_gradeHigh Grade (G2+)': 'Meningioma grade: High Grade (G2+)',
    genderFemale: 'Gender: Female',
    pre_asympotomaticYes: 'Pre-op: Asymptomatic',
    pre_headachesYes: 'Pre-op: Headaches',
    pre_seizureYes: 'Pre-op: Seizure',
    pre_motor_sensoryYes: 'Pre-op: Motor/Sensory',
    pre_visionYes: 'Pre-op: Vision',
    pre_cognition_languageYes: 'Pre-op: Cognition/Language',
    pre_coordinationYes: 'Pre-op: Coordination',
    pre_cn_deficitsYes: 'Pre-op: CN deficits'
  }
  return map[key] ?? key
}

export default function NeuroComplicationDashboard() {
  const [coeffs, setCoeffs] = useState<NeuroComplicationCoefficients | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [nonNeuroCoeffs, setNonNeuroCoeffs] =
    useState<NonNeuroComplicationCoefficients | null>(null)
  const [nonNeuroLoadError, setNonNeuroLoadError] = useState<string | null>(null)

  const [losCoeffs, setLosCoeffs] = useState<LengthOfStayCoxCoefficients | null>(null)
  const [losLoadError, setLosLoadError] = useState<string | null>(null)

  const [age, setAge] = useState<number>(60)
  const [tumourVolume, setTumourVolume] = useState<number>(30)
  const [dummies, setDummies] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const url = new URL('../coefficients/model_coefficients.json', import.meta.url).href
    loadModelCoefficients(url)
      .then((data) => setCoeffs(data))
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)))
  }, [])

  useEffect(() => {
    const url = new URL('../coefficients/model2_coefficients.json', import.meta.url).href
    loadNonNeuroModelCoefficients(url)
      .then((data) => setNonNeuroCoeffs(data))
      .catch((e) => setNonNeuroLoadError(e instanceof Error ? e.message : String(e)))
  }, [])

  useEffect(() => {
    const url = new URL('../coefficients/model3_coefficients.json', import.meta.url).href
    loadLosModelCoefficients(url)
      .then((data) => setLosCoeffs(data))
      .catch((e) => setLosLoadError(e instanceof Error ? e.message : String(e)))
  }, [])

  const dummyKeys = useMemo(() => {
    if (!coeffs) return []
    return Object.keys(coeffs.fixed_effects_simple).filter(
      (k) => !['(Intercept)', 'age', 'tumour_volume'].includes(k)
    )
  }, [coeffs])

  const dummiesNormalized = useMemo(() => {
    if (!coeffs) return dummies
    const next: Record<string, boolean> = { ...dummies }
    for (const k of dummyKeys) {
      if (next[k] === undefined) next[k] = false
    }
    for (const existingKey of Object.keys(next)) {
      if (!dummyKeys.includes(existingKey)) delete next[existingKey]
    }
    return next
  }, [coeffs, dummies, dummyKeys])

  const ageError = age < 0 ? 'Age must be >= 0.' : null

  const probabilities = useMemo(() => {
    if (!coeffs) return null
    if (ageError) return null

    const patient: PatientInput = {
      age,
      tumour_volume: tumourVolume,
      dummies: dummiesNormalized
    }
    return computeNeuroComplicationProbabilities(patient, coeffs)
  }, [ageError, age, coeffs, dummiesNormalized, tumourVolume])

  const nonNeuroProbability = useMemo(() => {
    if (!nonNeuroCoeffs) return null
    if (ageError) return null

    const patient: PatientInput = {
      age,
      tumour_volume: tumourVolume,
      dummies: dummiesNormalized
    }
    return computeNonNeuroComplicationProbability(patient, nonNeuroCoeffs)
  }, [ageError, age, dummiesNormalized, nonNeuroCoeffs, tumourVolume])

  const losRisk = useMemo(() => {
    if (!losCoeffs) return null
    if (ageError) return null

    const patient: PatientInput = {
      age,
      tumour_volume: tumourVolume,
      dummies: dummiesNormalized
    }
    return computeLengthOfStayRisk(patient, losCoeffs)
  }, [age, ageError, dummiesNormalized, losCoeffs, tumourVolume])

  return (
    <div className="neuro-dashboard">
      <header className="neuro-header">
        <h1>Post-Operative Complications</h1>
        <p className="neuro-subtitle">
          Enter covariates and get a probability for each post-operative complication.
        </p>
      </header>

      <section className="neuro-form">
        <div className="neuro-form-row">
          <label className="neuro-label">
            Age
            <input
              className="neuro-input"
              type="number"
              value={Number.isFinite(age) ? age : 0}
              min={0}
              step={1}
              onChange={(e) => setAge(Number(e.target.value))}
            />
          </label>
          {ageError ? <div className="neuro-error">{ageError}</div> : null}
        </div>

        <div className="neuro-form-row">
          <label className="neuro-label">
            Tumour volume
            <input
              className="neuro-input"
              type="number"
              value={Number.isFinite(tumourVolume) ? tumourVolume : 0}
              step={0.1}
              onChange={(e) => setTumourVolume(Number(e.target.value))}
            />
          </label>
        </div>

        <fieldset className="neuro-fieldset">
          <legend>Covariates</legend>
          <div className="neuro-checkbox-grid">
            {dummyKeys.map((key) => (
              <label key={key} className="neuro-checkbox">
                <input
                  type="checkbox"
                  checked={!!dummiesNormalized[key]}
                  onChange={(e) =>
                    setDummies((prev) => ({
                      ...prev,
                      [key]: e.target.checked
                    }))
                  }
                />
                <span className="neuro-checkbox-label">{humanizeDummyKey(key)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {loadError ? <div className="neuro-error">Could not load coefficients: {loadError}</div> : null}
        {nonNeuroLoadError ? (
          <div className="neuro-error">Could not load non-neuro coefficients: {nonNeuroLoadError}</div>
        ) : null}
        {losLoadError ? (
          <div className="neuro-error">Could not load LOS coefficients: {losLoadError}</div>
        ) : null}
      </section>

      <section className="neuro-results">
        {!coeffs || !nonNeuroCoeffs || !losCoeffs ? (
          <div className="neuro-loading">Loading model coefficients...</div>
        ) : ageError ? (
          <div className="neuro-loading">{ageError}</div>
        ) : (
          <>
            <div className="neuro-results-grid">
              {POST_NEURO_OUTCOMES.map((outcome) => {
                const p = probabilities?.[outcome] ?? 0
                return (
                  <div key={outcome} className="neuro-result-card">
                    <div className="neuro-result-label">{POST_NEURO_OUTCOME_LABELS[outcome]}</div>
                    <div className="neuro-result-value">{(p * 100).toFixed(1)}%</div>
                    <div className="neuro-result-footnote">Predicted probability</div>
                  </div>
                )
              })}

              <div className="neuro-split-row">
                <div className="neuro-result-card">
                  <div className="neuro-result-label">Non-neurological post-op complication</div>
                  <div className="neuro-result-value">
                    {((nonNeuroProbability ?? 0) * 100).toFixed(1)}%
                  </div>
                  <div className="neuro-result-footnote">
                    Fixed effects only (mixed effects set to 0)
                  </div>
                </div>

                <div className="neuro-result-card">
                  <div className="neuro-result-label">Length of stay (Cox model)</div>
                  <div className="neuro-result-value">
                    HR {(losRisk?.hazardRatio ?? 1).toFixed(2)}
                  </div>
                  <div className="neuro-result-footnote">
                    Relative hazard (no baseline \u2192 no absolute days prediction)
                    {' \u00b7 '}η {(losRisk?.eta ?? 0).toFixed(3)}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <p className="neuro-footnote">
          Note: this uses the complication-specific mixed effect and sets the repeated-patient mixed effect to 0 (new patient inference).
        </p>
      </section>
    </div>
  )
}

