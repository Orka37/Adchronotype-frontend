import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getPredictions } from '../api/predict';
import { useAuth } from './AuthContext';
import { deleteStoredItem, getStoredItem, setStoredItem } from '../utils/storage';
import { log } from '../utils/logger';

const OnboardingContext = createContext();

function hasPredictionDetails(prediction) {
  return !!prediction?.factor_contributions && prediction?.baseline != null;
}

export function OnboardingProvider({ children }) {
  const { user } = useAuth();
  const [sleepType,  setSleepType]  = useState(null);
  const [bedTime,    setBedTime]    = useState(null);
  const [wakeTime,   setWakeTime]   = useState(null);
  const [age,        setAge]        = useState(null);
  const [heightFt,   setHeightFt]   = useState(null);
  const [heightIn,   setHeightIn]   = useState(null);
  const [heightCm,   setHeightCm]   = useState(null);
  const [weight,     setWeight]     = useState(null);
  const [unit,       setUnit]       = useState('lbs');
  const [ethnicity,  setEthnicity]  = useState(null);
  const [gender,     setGender]     = useState(null);

  const [familyHistory, setFamilyHistory] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictionCount, setPredictionCount] = useState(0);
  const [loadingSavedPrediction, setLoadingSavedPrediction] = useState(true);

  const predictionKey = user ? `latest_prediction_${user.id || user.username}` : null;
  const predictionCountKey = user ? `prediction_count_${user.id || user.username}` : null;

  const restorePredictionState = useCallback(async () => {
    if (!user) {
      setPredictionResult(null);
      setPredictionCount(0);
      setLoadingSavedPrediction(false);
      return;
    }

    try {
      setLoadingSavedPrediction(true);

      const history = await getPredictions(1);
      if (Array.isArray(history) && history.length > 0) {
        const latest = history[0];
        setPredictionResult(latest);
        setPredictionCount(history.length);
        await setStoredItem(`latest_prediction_${user.id || user.username}`, JSON.stringify(latest));
        await setStoredItem(`prediction_count_${user.id || user.username}`, String(history.length));
      } else {
        setPredictionResult(null);
        setPredictionCount(0);
      }
    } catch (err) {
      log.warn('restorePredictionState: could not load saved prediction', err?.message);
      try {
        const [storedPrediction, storedCount] = await Promise.all([
          getStoredItem(`latest_prediction_${user.id || user.username}`),
          getStoredItem(`prediction_count_${user.id || user.username}`),
        ]);

        if (storedPrediction) {
          const parsedPrediction = JSON.parse(storedPrediction);
          if (hasPredictionDetails(parsedPrediction)) {
            setPredictionResult(parsedPrediction);
            setPredictionCount(Number(storedCount || 1));
            return;
          }

          await deleteStoredItem(`latest_prediction_${user.id || user.username}`).catch(() => {});
        }
      } catch (storageErr) {
        log.warn('restorePredictionState: local fallback unavailable', storageErr?.message);
      }

      setPredictionResult(null);
      setPredictionCount(0);
    } finally {
      setLoadingSavedPrediction(false);
    }
  }, [user?.id, user?.username]);

  useEffect(() => {
    restorePredictionState();
  }, [restorePredictionState]);

  function resetOnboarding() {
    setSleepType(null);
    setBedTime(null);
    setWakeTime(null);
    setAge(null);
    setHeightFt(null);
    setHeightIn(null);
    setHeightCm(null);
    setWeight(null);
    setUnit('lbs');
    setEthnicity(null);
    setGender(null);
    setFamilyHistory(null);
  }

  async function recordPredictionResult(result) {
    setPredictionResult(result);
    setPredictionCount(current => {
      const next = current + 1;
      if (predictionCountKey) {
        setStoredItem(predictionCountKey, String(next)).catch(err => {
          log.warn('recordPredictionResult: could not persist prediction count', err?.message);
        });
      }
      return next;
    });

    if (predictionKey) {
      try {
        await setStoredItem(predictionKey, JSON.stringify(result));
      } catch (err) {
        log.warn('recordPredictionResult: could not persist prediction', err?.message);
      }
    }
  }

  async function clearSavedPrediction() {
    setPredictionResult(null);
    setPredictionCount(0);
    if (!predictionKey) return;
    await Promise.all([
      deleteStoredItem(predictionKey).catch(() => {}),
      predictionCountKey ? deleteStoredItem(predictionCountKey).catch(() => {}) : Promise.resolve(),
    ]);
  }

  return (
    <OnboardingContext.Provider value={{
      sleepType,  setSleepType,
      bedTime,    setBedTime,
      wakeTime,   setWakeTime,
      age,        setAge,
      heightFt,   setHeightFt,
      heightIn,   setHeightIn,
      heightCm,   setHeightCm,
      weight,     setWeight,
      unit,       setUnit,
      ethnicity,  setEthnicity,
      gender,     setGender,
      familyHistory, setFamilyHistory,
      predictionResult, setPredictionResult,
      predictionCount, setPredictionCount,
      loadingSavedPrediction,
      hasCompletedPrediction: !!predictionResult,
      recordPredictionResult,
      clearSavedPrediction,
      refreshPredictionState: restorePredictionState,
      resetOnboarding,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}
