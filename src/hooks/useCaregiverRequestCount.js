import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getIncomingCarePatientInvitations } from '../api/caregivers';
import { log } from '../utils/logger';

export function useCaregiverRequestCount() {
  const [count, setCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function loadCount() {
        try {
          const requests = await getIncomingCarePatientInvitations();
          if (mounted) setCount(Array.isArray(requests) ? requests.length : 0);
        } catch (err) {
          if (mounted) setCount(0);
          log.warn('Caregiver request count unavailable', err?.message);
        }
      }

      loadCount();
      return () => {
        mounted = false;
      };
    }, [])
  );

  return count;
}
