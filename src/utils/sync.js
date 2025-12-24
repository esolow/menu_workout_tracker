// Helpers for merging local and server data (latest write wins)

export function entriesMapToArray(mapObj = {}) {
  return Object.keys(mapObj).map((dayKey) => {
    const entry = mapObj[dayKey];
    const data = entry?.data || entry || {};
    const updatedAt = entry?.updatedAt || new Date().toISOString();
    return { dayKey, data, updatedAt };
  });
}

export function mergeEntries(local = {}, serverEntries = [], prioritizeServer = false) {
  const merged = prioritizeServer ? {} : { ...local };
  
  // First, add all server entries (they take precedence if prioritizeServer is true)
  serverEntries.forEach((entry) => {
    const { dayKey, data, updatedAt } = entry;
    if (prioritizeServer) {
      merged[dayKey] = { data, updatedAt };
    } else {
      const localEntry = merged[dayKey];
      const localUpdated = localEntry?.updatedAt || '1970-01-01';
      if (!localEntry || new Date(updatedAt) > new Date(localUpdated)) {
        merged[dayKey] = { data, updatedAt };
      }
    }
  });
  
  // If not prioritizing server, add local entries that aren't in server
  if (!prioritizeServer) {
    Object.keys(local).forEach((dayKey) => {
      if (!merged[dayKey]) {
        merged[dayKey] = local[dayKey];
      }
    });
  }
  
  return merged;
}

export function updateLocalEntry(local = {}, dayKey, data) {
  const updatedAt = new Date().toISOString();
  return {
    ...local,
    [dayKey]: { data, updatedAt },
  };
}
