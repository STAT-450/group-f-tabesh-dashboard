import { useEffect, useMemo, useState } from 'react'
import {
  computeNonNeuroComplicationProbability,
  type NonNeuroComplicationCoefficients,
  type PatientInput,
  loadModelCoefficients
} from '../lib/nonNeuroComplicationInference'
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

export default function NonNeuroComplicationDashboard() {
  const [coeffs, setCoeffs] = useState<NonNeuroComplicationCoefficients | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [age, setAge] = useState<number>(60)
  const [tumourVolume, setTumourVolume] = useState<number>(30)
  const [dummies, setDummies] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const url = new URL('../coefficients/model2_coefficients.json', import.meta.url).href
    loadModelCoefficients(url)
      .then((data) => setCoeffs(data))
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)))
  }, [])

  const dummyKeys = useMemo(() => {
    if (!coeffs) return []
    return Object.keys(coeffs.fixed_effects_simple).filter(
      (k) => !['(Intercept)', 'age', 'tumour_volume'].includes(k)
    )
  }, [coeffs])

  useEffect(() => {
    if (!coeffs) return
    setDummies((prev) => {
      const next: Record<string, boolean> = { ...prev }
      for (const k of dummyKeys) {
        if (next[k] === undefined) next[k] = false
      }
      for (const existingKey of Object.keys(next)) {
        if (!dummyKeys.includes(existingKey)) delete next[existingKey]
      }
      return next
    })
  }, [coeffs, dummyKeys])

  const ageError = age < 0 ? 'Age must be >= 0.' : null

  const probability = useMemo(() => {
    if (!coeffs) return null
    if (ageError) return null

    const patient: PatientInput = {
      age,
      tumour_volume: tumourVolume,
      dummies
    }
    return computeNonNeuroComplicationProbability(patient, coeffs)
  }, [ageError, age, coeffs, dummies, tumourVolume])

  return (
    <div className="neuro-dashboard">
      <header className="neuro-header">
        <h1>Non-neurological Post-Operative Complication</h1>
        <p className="neuro-subtitle">Enter covariates and get a single predicted probability.</p>
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
                  checked={!!dummies[key]}
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

        {loadError ? (
          <div className="neuro-error">Could not load coefficients: {loadError}</div>
        ) : null}
      </section>

      <section className="neuro-results">
        {!coeffs ? (
          <div className="neuro-loading">Loading model coefficients...</div>
        ) : ageError ? (
          <div className="neuro-loading">{ageError}</div>
        ) : (
          <div className="neuro-results-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <div className="neuro-result-card" style={{ gridColumn: 'span 3' }}>
              <div className="neuro-result-label">Predicted probability</div>
              <div className="neuro-result-value">{(probability ? probability * 100 : 0).toFixed(1)}%</div>
              <div className="neuro-result-footnote">Uses fixed effects only (mixed effects set to 0).</div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

