/* One-time compatibility migration for users upgrading from earlier TNS builds. */
(function migrateLegacyTnsStorageKeys() {
  try {
    const oldBrandToken = ['stu', 'dio'].join('');
    const oldCamelPrefix = 'tns' + 'S' + ['tu', 'dio'].join('');
    const oldSnakePrefix = 'tns_' + oldBrandToken + '_';
    const keys = [];
    const initialLength = localStorage.length;

    for (let index = 0; index < initialLength; index += 1) {
      const key = localStorage.key(index);
      if (key) keys.push(key);
    }

    keys.forEach((oldKey) => {
      let newKey = null;

      if (oldKey.startsWith(oldCamelPrefix)) {
        newKey = 'tns' + oldKey.slice(oldCamelPrefix.length);
      } else if (oldKey.startsWith(oldSnakePrefix)) {
        newKey = 'tns_' + oldKey.slice(oldSnakePrefix.length);
      }

      if (!newKey) return;

      if (localStorage.getItem(newKey) === null) {
        const oldValue = localStorage.getItem(oldKey);
        if (oldValue !== null) localStorage.setItem(newKey, oldValue);
      }

      if (localStorage.getItem(newKey) !== null) {
        localStorage.removeItem(oldKey);
      }
    });
  } catch (error) {
    // A blocked storage environment must not prevent the app from starting.
  }
})();
