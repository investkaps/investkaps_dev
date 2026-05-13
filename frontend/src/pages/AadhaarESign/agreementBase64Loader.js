const BASE64_PATHS = {
  RA: '/base64/ra-client-agreement.txt',
  IA: '/base64/ia-service-agreement.txt',
};

export const loadAgreementBase64 = async (serviceType = 'RA') => {
  const normalizedServiceType = String(serviceType).toUpperCase();
  const path = BASE64_PATHS[normalizedServiceType] || BASE64_PATHS.RA;

  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${normalizedServiceType} agreement file`);
  }

  return (await response.text()).trim();
};
