// TNS Studio worldwide-ready country/mobile configuration.
// Store mobile identifiers in E.164/international format (for example +919876543210).
const TNSCountryConfig = {
  defaultCountry: 'IN',
  defaultCallingCode: '+91',
  mobileStorageFormat: 'E.164',
  countrySelectorEnabled: true,
  countrySpecificFormatting: true,
  supportedRegions: 'worldwide'
};
window.TNSCountryConfig = TNSCountryConfig;
