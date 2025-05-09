import { useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, set, onDisconnect } from 'firebase/database';

function useOnlineStatus() {
  const auth = getAuth();
  const db = getDatabase();
  
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    const userRef = ref(db, `users/${currentUser.uid}`);
    
    // Set user as active when component mounts
    const setUserActive = async () => {
      await set(ref(db, `users/${currentUser.uid}/isActive`), true);
      await set(ref(db, `users/${currentUser.uid}/lastSeen`), null);
    };
    
    // Set up disconnect handler
    const setupDisconnect = async () => {
      const userStatusRef = ref(db, `users/${currentUser.uid}`);
      
      // When user disconnects, update the database
      await onDisconnect(ref(db, `users/${currentUser.uid}/isActive`)).set(false);
      await onDisconnect(ref(db, `users/${currentUser.uid}/lastSeen`)).set(
        Date.now()
      );
    };
    
    setUserActive();
    setupDisconnect();
    
    // When component unmounts or user navigates away
    return () => {
      set(ref(db, `users/${currentUser.uid}/isActive`), false);
      set(ref(db, `users/${currentUser.uid}/lastSeen`), Date.now());
    };
  }, [auth.currentUser, db]);
}

export default useOnlineStatus;