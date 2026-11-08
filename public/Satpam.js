/**
 * WALIPINTAR PATH PROTECTION - "SATPAM.JS"
 */
(function () {
  'use strict';
  var LICENSE_KEY_NAME = 'walipintar_license';
  var HOME_URL = '/';

  try {
    var savedLicense = localStorage.getItem(LICENSE_KEY_NAME);
    var isValidFormat = (
      typeof savedLicense === 'string' &&
      savedLicense.trim().length >= 8 &&
      savedLicense.trim().toUpperCase().indexOf('WALI-') === 0
    );

    if (!isValidFormat) {
      if (document.documentElement) {
        document.documentElement.style.display = 'none';
      }
      window.location.replace(HOME_URL + '?denied=1');
      return;
    }
  } catch (err) {
    window.location.replace(HOME_URL + '?error=storage_blocked');
  }
})();
